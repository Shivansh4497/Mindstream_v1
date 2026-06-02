const { chromium } = require('playwright');

(async () => {
    // Launch browser
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const logs = [];
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('[Temporal]') || text.includes('[Semantic]') || text.includes('[Meta]')) {
            logs.push(text);
        } else {
            // Log everything for detailed context
            logs.push(text);
        }
    });

    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000');

    // Wait for the app to load and show the input
    await page.waitForTimeout(3000);

    // Look for chat input bar textarea or input
    const textarea = page.locator('textarea[placeholder*="What\'s on your mind"]');
    if (await textarea.count() === 0) {
        console.log('Could not find chat input textarea. Dumping page text:');
        console.log(await page.innerText('body'));
        await browser.close();
        return;
    }

    // Type the query
    const query = 'summarise my last 9 days of habits, entries and goals.';
    console.log(`Sending query: "${query}"`);
    await textarea.fill(query);

    // Press Enter or click send button
    await textarea.press('Enter');

    // Wait for 10 seconds for the response to finish
    await page.waitForTimeout(10000);

    console.log('\n--- BROWSER CONSOLE LOGS ---');
    console.log(logs.join('\n'));
    console.log('----------------------------\n');

    await browser.close();
})();
