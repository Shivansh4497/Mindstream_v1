import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    const results = {
        steps: [],
        chatLogs: []
    };

    let stepCounter = 1;

    async function captureStep(flow, action, filenameSuffix) {
        const path = `/tmp/mindstream_audit/screenshots/demo/${stepCounter}_${filenameSuffix}.png`;
        await page.screenshot({ path });
        results.steps.push({
            id: stepCounter,
            flow,
            action,
            screenshot: path
        });
        stepCounter++;
    }

    // 1. Authentication Flow
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.waitForTimeout(1000);
    await captureStep('Authentication Flow', 'User navigated to landing screen (unauthenticated)', 'landing');

    console.log("Clicking Try a Demo");
    await page.click('text="Try a Demo"');
    await captureStep('Authentication Flow', 'User clicked "Try a Demo" (Seeding state)', 'seeding_state');

    console.log("Waiting for Demo Welcome Modal...");
    try {
        await page.waitForSelector('text="Explore Journal Stream first"', { timeout: 90000 });
        await page.waitForTimeout(1000);
        await captureStep('Authentication Flow', 'Demo Welcome Modal appears after seeding is complete', 'demo_welcome_modal');

        console.log("Closing Demo Welcome Modal");
        await page.click('text="Explore Journal Stream first"');
        await page.waitForTimeout(1000);
    } catch (e) {
        console.log("Failed to find Demo Welcome modal", e);
    }

    // 2. Stream Flow
    await page.waitForTimeout(4000);
    await captureStep('Stream (Journal) Flow', 'User lands on the seeded Stream feed', 'stream_feed_top');

    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(1000);
    await captureStep('Stream (Journal) Flow', 'User scrolls down to view older entries in the Stream', 'stream_feed_scrolled');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000);

    // Expand entry
    await page.evaluate(() => {
        const cards = document.querySelectorAll('.entry-card, [class*="card"]');
        if (cards.length > 0) cards[0].click();
    });
    await page.waitForTimeout(1000);
    await captureStep('Stream (Journal) Flow', 'User clicks on the first entry card to expand its details', 'stream_entry_expanded');

    // Type a new entry
    console.log("Typing entry");
    try {
        await page.fill('textarea', "Testing the demo exhaustive script. This is a new entry.", { timeout: 5000 });
        await captureStep('Stream (Journal) Flow', 'User types a new journal entry into the input bar', 'stream_typing_entry');
        
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
        await captureStep('Stream (Journal) Flow', 'AI Enrichment begins loading after submitting entry', 'stream_enrichment_loading');
        
        await page.waitForTimeout(5000); // wait for enrichment
        await captureStep('Stream (Journal) Flow', 'AI Enrichment complete, showing new entry with tags and sentiment', 'stream_enrichment_complete');
    } catch(e) { console.log("Failed to type entry 1", e); }

    // 3. Habits Flow
    console.log("Going to Habits");
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const tab = btns.find(b => b.textContent.includes('Habits'));
        if (tab) tab.click();
    });
    await page.waitForTimeout(2000);
    await captureStep('Habits Flow', 'User clicks on the Habits tab to view the dashboard', 'habits_dashboard');

    await page.evaluate(() => {
        const habits = document.querySelectorAll('[class*="habit"]');
        if (habits.length > 0) habits[0].click();
    });
    await page.waitForTimeout(1000);
    await captureStep('Habits Flow', 'User clicks on a habit to view its detailed tracking logs', 'habits_expanded');

    // 4. Goals Flow
    console.log("Going to Goals");
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const tab = btns.find(b => b.textContent.includes('Goals') || b.textContent.includes('Life'));
        if (tab) tab.click();
    });
    await page.waitForTimeout(2000);
    await captureStep('Goals Flow', 'User clicks on the Goals tab to view life areas and intentions', 'goals_dashboard');

    // 5. Chat Flow
    console.log("Going to Chat");
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const tab = btns.find(b => b.textContent.includes('Chat'));
        if (tab) tab.click();
    });
    await page.waitForTimeout(3000);
    await captureStep('Chat Flow', 'User navigates to the Chat tab (initial state)', 'chat_initial');

    const messages = [
        "Summarize my last 9 days ?",
        "when have I been feeling happy ?",
        "how is my exercise going ?",
        "I am feeling overwhelmed again, how can I cope up ?"
    ];

    for (let i = 0; i < messages.length; i++) {
        console.log("Sending chat: " + messages[i]);
        try {
            await page.fill('textarea', messages[i], { timeout: 3000 });
            await captureStep('Chat Flow', `User types query: "${messages[i]}"`, `chat_typing_${i+1}`);
            
            await page.keyboard.press('Enter');
            await page.waitForTimeout(500);
            await captureStep('Chat Flow', `AI begins processing query: "${messages[i]}"`, `chat_loading_${i+1}`);
            
            await page.waitForTimeout(8000); // wait for chat response

            await captureStep('Chat Flow', `AI generates response for: "${messages[i]}"`, `chat_response_${i+1}`);

            // Open GlassBox
            await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const gbBtn = btns.find(b => b.textContent.includes('Open Glass Box'));
                if (gbBtn) gbBtn.click();
            });
            await page.waitForTimeout(1000);
            await captureStep('Chat Flow', `User opens Glass Box transparency view for detailed RAG metrics`, `chat_glassbox_${i+1}`);

            // Extract GlassBox text
            const textDump = await page.evaluate(() => document.body.innerText);
            const gbIndex = textDump.indexOf("Faithfulness");
            let glassBoxDump = "";
            let groundText = "";
            
            if (gbIndex > -1) {
                // Extract around the RAGAS scores
                glassBoxDump = textDump.substring(Math.max(0, gbIndex - 50), gbIndex + 500);
            }
            const groundIndex = textDump.indexOf("GROUNDED");
            if (groundIndex > -1) {
                groundText = textDump.substring(Math.max(0, groundIndex - 20), groundIndex + 20);
            }
            
            // Extract the retrieved nodes if possible
            const nodes = await page.evaluate(() => {
                const nodeElements = document.querySelectorAll('.glassbox-node, [class*="node"]');
                return Array.from(nodeElements).map(el => el.innerText).slice(0, 5); // top 5 nodes
            });

            results.chatLogs.push({
                query: messages[i],
                glassBoxText: glassBoxDump,
                groundText: groundText,
                nodes: nodes
            });

            // Close GlassBox
            await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const closeBtn = btns.find(b => b.textContent.includes('Close') || b.textContent.includes('x'));
                if (closeBtn) closeBtn.click();
            });
            await page.waitForTimeout(500);

            // Wait 20 seconds to prevent hitting Groq RPM limit
            if (i < messages.length - 1) {
                console.log(`Waiting 20 seconds before next query to prevent Groq API rate limits...`);
                await page.waitForTimeout(20000);
            }

        } catch(e) { console.log(`Failed chat step ${i}`, e); }
    }

    // 6. Insights Flow
    console.log("Going to Insights");
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const tab = btns.find(b => b.textContent.includes('Insights'));
        if (tab) tab.click();
    });
    await page.waitForTimeout(2000);
    await captureStep('Insights Flow', 'User clicks on the Insights tab to view analytical dashboards', 'insights_dashboard');
    
    // Scroll insights
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(1000);
    await captureStep('Insights Flow', 'User scrolls to view weekly and monthly reflections', 'insights_scrolled');

    fs.writeFileSync('/tmp/mindstream_audit/demo_exhaustive_results.json', JSON.stringify(results, null, 2));
    console.log("Done");
    await browser.close();
})();
