import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));
    await page.goto('http://localhost:3000');
    // wait for 3 seconds to gather logs
    await new Promise(r => setTimeout(r, 3000));
    console.log("LOGS:");
    console.log(logs.join('\n'));
    await browser.close();
})();
