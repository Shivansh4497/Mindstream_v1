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
    
    console.log("Clicking Try a Demo");
    await page.click('text="Try a Demo"').catch(e => console.log("No Demo btn"));
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/mindstream_audit/screenshots/1_landing.png' }).catch(e=>console.log(e));
    
    console.log("Clicking Guided Setup");
    await page.click('text="Guided Setup"').catch(e => console.log("Failed to click Guided Setup"));
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/mindstream_audit/screenshots/2_onboarding_step1.png' }).catch(e=>console.log(e));
    
    let stepCount = 2;
    for (let i=0; i<4; i++) {
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const nextBtn = btns.find(b => 
                b.textContent.toLowerCase().includes('next') || 
                b.textContent.toLowerCase().includes('continue') ||
                b.textContent.toLowerCase().includes('finish') ||
                b.textContent.toLowerCase().includes('get started')
            );
            if (nextBtn) nextBtn.click();
        }).catch(e=>console.log(e));
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `/tmp/mindstream_audit/screenshots/2_onboarding_step${stepCount}.png` }).catch(e=>console.log(e));
        stepCount++;
    }

    console.log("Wait for Stream to load");
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/mindstream_audit/screenshots/3_post_onboarding.png' }).catch(e=>console.log(e));

    console.log("Typing entry 1");
    try {
        await page.fill('textarea', "Feeling anxious about my performance review tomorrow", { timeout: 5000 });
        await page.keyboard.press('Enter');
        await page.waitForTimeout(4000);
    } catch(e) { console.log("Failed to type entry 1"); }
    await page.screenshot({ path: '/tmp/mindstream_audit/screenshots/5_stream_enrichment.png' }).catch(e=>console.log(e));

    console.log("Typing entry 2");
    try {
        await page.fill('textarea', "I want to start meditating every morning", { timeout: 5000 });
        await page.keyboard.press('Enter');
        await page.waitForTimeout(4000);
    } catch(e) { console.log("Failed to type entry 2"); }
    await page.screenshot({ path: '/tmp/mindstream_audit/screenshots/6_stream_habit_intent.png' }).catch(e=>console.log(e));

    console.log("Going to Habits");
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const tab = btns.find(b => b.textContent.includes('Habits'));
        if (tab) tab.click();
    }).catch(e=>console.log(e));
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/mindstream_audit/screenshots/7_habits_full.png' }).catch(e=>console.log(e));
    
    console.log("Going to Goals");
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const tab = btns.find(b => b.textContent.includes('Goals') || b.textContent.includes('Life'));
        if (tab) tab.click();
    }).catch(e=>console.log(e));
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/mindstream_audit/screenshots/9_goals_full.png' }).catch(e=>console.log(e));

    console.log("Going to Chat");
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const tab = btns.find(b => b.textContent.includes('Chat'));
        if (tab) tab.click();
    }).catch(e=>console.log(e));
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
            await page.waitForTimeout(5000);
            await page.screenshot({ path: `/tmp/mindstream_audit/screenshots/11_chat_msg_${i+1}.png` }).catch(e=>console.log(e));
            const textDump = await page.evaluate(() => document.body.innerText);
            const ragMatch = textDump.match(/Faithfulness:?\s*([\d.]+).*?Relevancy:?\s*([\d.]+)/is);
            results.ragasScores.push({
                msg: messages[i],
                foundRagas: !!ragMatch,
                glassBoxDump: textDump.substring(0, 100),
                groundText: ""
            });
        } catch(e) { console.log("Failed chat " + i); }
    }

    console.log("Going to Insights");
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const tab = btns.find(b => b.textContent.includes('Insights'));
        if (tab) tab.click();
    }).catch(e=>console.log(e));
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/mindstream_audit/screenshots/12_insights_full.png' }).catch(e=>console.log(e));
    
    fs.writeFileSync('/tmp/mindstream_audit/results.json', JSON.stringify(results, null, 2));
    console.log("Done");
    await browser.close();
})();
