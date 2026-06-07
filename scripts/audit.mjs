import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    
    const logs = [];
    page.on('console', msg => {
        logs.push(`[${msg.type()}] ${msg.text()}`);
    });

    const results = {
        loadTime: 0,
        firstChatResponseTime: 0,
        entryEnrichmentTime: 0,
        logs: logs,
        ragasScores: []
    };

    console.log("Navigating to localhost:3001");
    const startTime = Date.now();
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' }).catch(e=>console.log(e));
    results.loadTime = Date.now() - startTime;
    
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/mindstream_audit/screenshots/1_landing.png' }).catch(e=>console.log(e));
    
    console.log("Clicking Try a Demo");
    await page.click('text="Try a Demo"').catch(e => console.log("No Demo btn"));
    await page.waitForTimeout(2000);
    
    console.log("Clicking Guided Setup");
    await page.click('text="Guided Setup"').catch(e => console.log("Failed to click Guided Setup"));
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/mindstream_audit/screenshots/2_onboarding_step1.png' }).catch(e=>console.log(e));
    
    // Step through the specific Onboarding Wizard buttons
    const stepsToClick = [
        "Enter Sanctuary",
        "The Analytical Mind", // Personality
        "Anxious",             // Spark
        "Work / Career",       // Container
        "Deadlines"            // Friction
    ];

    for (let i = 0; i < stepsToClick.length; i++) {
        console.log("Clicking " + stepsToClick[i]);
        await page.click(`text="${stepsToClick[i]}"`).catch(e => console.log("Failed to click " + stepsToClick[i]));
        await page.waitForTimeout(1000);
    }

    console.log("Typing elaboration in Onboarding");
    try {
        await page.fill('textarea', "I am feeling very anxious about my upcoming deadlines", { timeout: 3000 });
        await page.click('text="Analyze"');
    } catch(e) { console.log(e); }
    await page.waitForTimeout(5000); // wait for processing
    
    // Click through the Awe/Chat button to finish onboarding
    console.log("Clicking Discuss with AI or Continue");
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const finish = btns.find(b => b.textContent.includes('Discuss') || b.textContent.includes('Journal'));
        if (finish) finish.click();
    }).catch(e=>console.log(e));

    console.log("Wait for Stream to load");
    await page.waitForTimeout(4000);
    await page.screenshot({ path: '/tmp/mindstream_audit/screenshots/3_post_onboarding.png' }).catch(e=>console.log(e));

    console.log("Going to Stream explicitly");
    await page.click('text="Stream"', { exact: true }).catch(e => console.log(e));
    await page.waitForTimeout(1000);

    console.log("Stream tab testing");
    await page.evaluate(() => {
        const cards = document.querySelectorAll('.entry-card, [class*="card"]');
        if (cards.length > 0) cards[0].click();
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/mindstream_audit/screenshots/4_stream_expanded.png' }).catch(e=>console.log(e));

    console.log("Typing entry 1");
    try {
        await page.fill('textarea', "Feeling anxious about my performance review tomorrow", { timeout: 5000 });
        await page.keyboard.press('Enter');
        const enrichStart = Date.now();
        await page.waitForTimeout(5000);
        results.entryEnrichmentTime = Date.now() - enrichStart;
    } catch(e) { console.log("Failed to type entry 1"); }
    await page.screenshot({ path: '/tmp/mindstream_audit/screenshots/5_stream_enrichment.png' }).catch(e=>console.log(e));

    console.log("Typing entry 2");
    try {
        await page.fill('textarea', "I want to start meditating every morning", { timeout: 5000 });
        await page.keyboard.press('Enter');
        await page.waitForTimeout(5000);
    } catch(e) { console.log("Failed to type entry 2"); }
    await page.screenshot({ path: '/tmp/mindstream_audit/screenshots/6_stream_habit_intent.png' }).catch(e=>console.log(e));

    console.log("Going to Habits");
    await page.click('text="Habits"', { exact: true }).catch(e => console.log(e));
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/mindstream_audit/screenshots/7_habits_full.png' }).catch(e=>console.log(e));
    
    await page.evaluate(() => {
        const habits = document.querySelectorAll('[class*="habit"]');
        if (habits.length > 0) habits[0].click();
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/mindstream_audit/screenshots/8_habits_expanded.png' }).catch(e=>console.log(e));
    
    console.log("Going to Goals");
    await page.click('text="Goals"', { exact: true }).catch(e => console.log(e));
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/mindstream_audit/screenshots/9_goals_full.png' }).catch(e=>console.log(e));

    console.log("Going to Chat");
    await page.click('text="Chat"', { exact: true }).catch(e => console.log(e));
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/mindstream_audit/screenshots/10_chat_initial.png' }).catch(e=>console.log(e));

    const messages = [
        "How have I been feeling this week?",
        "Tell me about my running habit",
        "I want to wake up at 6am every day"
    ];

    for (let i = 0; i < messages.length; i++) {
        console.log("Sending chat: " + messages[i]);
        try {
            await page.fill('textarea', messages[i], { timeout: 3000 });
            await page.keyboard.press('Enter');
            
            let t = Date.now();
            await page.waitForTimeout(5000);
            if (i === 0) {
                results.firstChatResponseTime = Date.now() - t;
            }
            
            await page.screenshot({ path: `/tmp/mindstream_audit/screenshots/11_chat_msg_${i+1}.png` }).catch(e=>console.log(e));
            
            const textDump = await page.evaluate(() => document.body.innerText);
            const ragMatch = textDump.match(/Faithfulness:?\s*([\d.]+).*?Relevancy:?\s*([\d.]+)/is);
            
            let glassBoxDump = "";
            let groundText = "";
            const gbIndex = textDump.indexOf("Faithfulness");
            if (gbIndex > -1) {
                glassBoxDump = textDump.substring(Math.max(0, gbIndex - 50), gbIndex + 300);
            }
            const groundIndex = textDump.indexOf("GROUNDED");
            if (groundIndex > -1) {
                groundText = textDump.substring(Math.max(0, groundIndex - 20), groundIndex + 20);
            }

            results.ragasScores.push({
                msg: messages[i],
                foundRagas: !!ragMatch,
                glassBoxDump: glassBoxDump,
                groundText: groundText
            });
        } catch(e) { console.log("Failed chat " + i); }
    }

    console.log("Going to Insights");
    await page.click('text="Insights"', { exact: true }).catch(e => console.log(e));
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/mindstream_audit/screenshots/12_insights_full.png' }).catch(e=>console.log(e));
    
    fs.writeFileSync('/tmp/mindstream_audit/results.json', JSON.stringify(results, null, 2));
    console.log("Done");
    await browser.close();
})();
