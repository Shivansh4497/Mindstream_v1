import fs from 'fs';
import { chromium } from 'playwright';

function escapeHtml(unsafe) {
    return (unsafe || '').toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
                         .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// Data extracted manually from seed-demo-data/index.ts
const HABITS = [
    { name: 'Morning Jog', emoji: '🏃', frequency: 'daily', category: 'Health' },
    { name: 'Meditation', emoji: '🧘', frequency: 'daily', category: 'Health' },
    { name: 'Reading', emoji: '📚', frequency: 'daily', category: 'Growth' },
    { name: 'Drink 8 Glasses of Water', emoji: '💧', frequency: 'daily', category: 'Health' },
    { name: 'No Screens After 10PM', emoji: '📵', frequency: 'daily', category: 'Health' },
];

const INTENTIONS = [
    { text: 'Run a half marathon by June', category: 'Health' },
    { text: 'Read 12 books this year', category: 'Growth' },
    { text: 'Practice gratitude daily', category: 'Health' },
    { text: 'Complete online ML course', category: 'Career' },
];

const ENTRY_TEMPLATES = [
    { text: "Woke up early and went for a run along the river. The sunrise was incredible today — golden light on the water. Felt so alive.", tags: ["running", "nature", "morning"], primary_sentiment: "Joyful" },
    { text: "Work was intense today. Back-to-back meetings and a tight deadline for the Q1 report. Managed to push through but felt drained by 5pm.", tags: ["work", "stress", "productivity"], primary_sentiment: "Overwhelmed" },
    { text: "Had a great conversation with Mom today. She told me stories about her childhood I'd never heard before. Feeling grateful for family.", tags: ["family", "gratitude", "connection"], primary_sentiment: "Grateful" },
    { text: "Couldn't sleep last night. Mind racing about the presentation tomorrow. Tried meditation but kept getting distracted. Need to work on this.", tags: ["sleep", "anxiety", "presentation"], primary_sentiment: "Anxious" },
    { text: "Finished reading 'Atomic Habits'. The idea of habit stacking really resonated with me. Going to try pairing meditation with my morning coffee.", tags: ["reading", "habits", "growth"], primary_sentiment: "Hopeful" },
    { text: "Skipped my jog today and spent the morning journaling instead. Sometimes rest IS productive. My body needed it.", tags: ["rest", "self-care", "reflection"], primary_sentiment: "Content" },
    { text: "The team loved my presentation! Got great feedback from the VP. All that prep paid off. Celebrating with dinner out tonight.", tags: ["work", "success", "celebration"], primary_sentiment: "Proud" },
    { text: "Feeling stuck in a rut. Same routine, same commute, same meals. Need to shake things up but not sure how.", tags: ["routine", "boredom", "change"], primary_sentiment: "Frustrated" },
    { text: "Tried a new yoga class at the studio downtown. The instructor was amazing — first time I've felt truly present in weeks.", tags: ["yoga", "mindfulness", "new experience"], primary_sentiment: "Content" },
    { text: "Had an argument with Jake about something stupid. I know I overreacted. Need to apologize tomorrow. Why do I get defensive so easily?", tags: ["relationships", "conflict", "self-awareness"], primary_sentiment: "Sad" },
    { text: "Cooked a proper meal for the first time in weeks. Mushroom risotto from scratch. The act of cooking was therapeutic.", tags: ["cooking", "self-care", "mindfulness"], primary_sentiment: "Content" },
    { text: "12-day running streak! My pace is improving — 5:30/km average this week. The consistency is paying off.", tags: ["running", "streak", "progress"], primary_sentiment: "Proud" },
    { text: "Quarterly review at work. Got positive feedback but also honest areas for improvement. Need to work on delegation.", tags: ["work", "feedback", "growth"], primary_sentiment: "Reflective" },
    { text: "Spent the afternoon at the farmers market. Bought way too many vegetables. There's something grounding about choosing real food.", tags: ["food", "nature", "weekend"], primary_sentiment: "Content" },
    { text: "Meditation session was deep today. 20 minutes felt like 5. Had a moment of clarity about the career change I've been considering.", tags: ["meditation", "career", "clarity"], primary_sentiment: "Hopeful" },
    { text: "Rain all day. Stayed in and read. Finished half of 'Deep Work'. Cal Newport makes some compelling arguments about focus.", tags: ["reading", "rain", "focus"], primary_sentiment: "Content" },
    { text: "Friend's birthday dinner. Great energy, good food, lots of laughing. Realized I need to prioritize social time more.", tags: ["friends", "celebration", "social"], primary_sentiment: "Joyful" },
    { text: "Anxiety spiked today for no clear reason. Heart racing, couldn't focus. Did a 10-minute body scan which helped bring me back.", tags: ["anxiety", "meditation", "coping"], primary_sentiment: "Anxious" },
    { text: "Started learning Python for the ML course. The syntax is so clean compared to what I'm used to. Excited about this path.", tags: ["coding", "learning", "career"], primary_sentiment: "Hopeful" },
    { text: "Perfect Sunday morning. Coffee on the balcony, birds singing, no agenda. This is what balance feels like.", tags: ["weekend", "balance", "peace"], primary_sentiment: "Content" },
    { text: "Volunteered at the food bank with the team. Hard work but incredibly rewarding. The coordinator said they served 200 families.", tags: ["volunteering", "community", "gratitude"], primary_sentiment: "Grateful" },
    { text: "Tried cold plunge for the first time. 2 minutes felt like 20. But the energy after was unreal — clear headed for hours.", tags: ["cold plunge", "energy", "new experience"], primary_sentiment: "Proud" },
    { text: "Mid-week slump. Low energy, no motivation. Forced myself to at least walk around the block. Small wins.", tags: ["low energy", "motivation", "walking"], primary_sentiment: "Frustrated" },
    { text: "Great catch-up with my mentor over coffee. He reminded me that career growth isn't always linear. Needed to hear that.", tags: ["mentorship", "career", "wisdom"], primary_sentiment: "Reflective" },
    { text: "Journaling streak: 24 days! The consistency of writing has changed how I process my day. It's become a non-negotiable.", tags: ["journaling", "streak", "habit"], primary_sentiment: "Proud" },
    { text: "Noticed I've been reaching for my phone less. The digital sunset habit is working. Sleep quality is noticeably better.", tags: ["screens", "sleep", "habits"], primary_sentiment: "Content" },
    { text: "Cooked for friends tonight. The risotto recipe is now my signature dish. Everyone asked for the recipe.", tags: ["cooking", "friends", "hosting"], primary_sentiment: "Joyful" },
    { text: "Set a new PR on my morning run — 24:12 for 5K! All those early mornings are compounding. Feeling unstoppable.", tags: ["running", "PR", "progress"], primary_sentiment: "Proud" },
];

(async () => {
    let results = { steps: [], chatLogs: [] };
    try {
        const data = fs.readFileSync('/tmp/mindstream_audit/demo_exhaustive_results.json', 'utf8');
        results = JSON.parse(data);
    } catch (e) {
        console.error("Results file not found or invalid", e);
    }

    const today = new Date().toLocaleDateString();

    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 1000px; margin: 0 auto; padding: 40px; }
            h1, h2, h3, h4 { color: #111; margin-top: 1.5em; }
            .page-break { page-break-before: always; }
            .cover { height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }
            .cover h1 { font-size: 3em; margin-bottom: 0.2em; }
            .cover h2 { font-size: 1.5em; color: #666; font-weight: normal; }
            .cover p { margin-top: 2em; font-size: 1.2em; color: #555; }
            img { max-width: 100%; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 0.9em; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f9f9f9; }
            .badge { padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.8em; background: #eee; }
            .action-box { background: #f0fdfa; border-left: 4px solid #0d9488; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
            .rag-box { background: #fdf2f8; border: 1px solid #fbcfe8; padding: 15px; margin: 10px 0; border-radius: 8px; font-family: monospace; white-space: pre-wrap; font-size: 0.85em; }
        </style>
    </head>
    <body>

    <div class="cover">
        <h1>Mindstream Exhaustive Audit</h1>
        <h2>Demo Mode Full Evaluation | ${today}</h2>
        <p>This document contains every interactive UI state, full chat histories with RAG context, and complete seeded data tables.</p>
    </div>

    <div class="page-break"></div>

    <h2>Section 1: Ground Truth Seeded Data</h2>
    <p>This table outlines the exact data seeded into the Demo User's profile upon clicking "Try a Demo". All subsequent Chat answers and Insights are generated from this specific dataset.</p>

    <h3>Seeded Habits</h3>
    <table>
        <tr><th>Name</th><th>Category</th><th>Frequency</th></tr>
        ${HABITS.map(h => `<tr><td>${h.emoji} ${escapeHtml(h.name)}</td><td>${escapeHtml(h.category)}</td><td>${escapeHtml(h.frequency)}</td></tr>`).join('')}
    </table>

    <h3>Seeded Goals (Intentions)</h3>
    <table>
        <tr><th>Intention</th><th>Category</th></tr>
        ${INTENTIONS.map(i => `<tr><td>${escapeHtml(i.text)}</td><td>${escapeHtml(i.category)}</td></tr>`).join('')}
    </table>

    <h3>Seeded Journal Entries (Last 28 Days)</h3>
    <table>
        <tr><th>Day</th><th>Text</th><th>Sentiment</th><th>Tags</th></tr>
        ${ENTRY_TEMPLATES.map((e, idx) => `<tr>
            <td>Day ${28 - idx}</td>
            <td>${escapeHtml(e.text)}</td>
            <td><span class="badge">${escapeHtml(e.primary_sentiment)}</span></td>
            <td>${e.tags.map(t => `<span class="badge">${escapeHtml(t)}</span>`).join(' ')}</td>
        </tr>`).join('')}
    </table>

    <div class="page-break"></div>

    <h2>Section 2: Exhaustive UI Flow Audit</h2>
    `;

    let currentFlow = "";
    results.steps.forEach(step => {
        if (step.flow !== currentFlow) {
            html += `<h3 style="margin-top: 2em; border-bottom: 2px solid #eee; padding-bottom: 10px;">${escapeHtml(step.flow)}</h3>`;
            currentFlow = step.flow;
        }

        html += `
        <div class="action-box">
            <strong>Action Taken:</strong> ${escapeHtml(step.action)}
        </div>
        <img src="file://${step.screenshot}" alt="${escapeHtml(step.action)}" onerror="this.style.display='none'"/>
        `;
    });

    html += `
    <div class="page-break"></div>
    <h2>Section 3: RAG Transparency & Chat Quality</h2>
    <p>Detailed breakdown of AI processing, fallback chains, retrieved nodes, and output scores for each of the test queries.</p>
    `;

    results.chatLogs.forEach((log, idx) => {
        html += `
        <h3>Query ${idx + 1}: "${escapeHtml(log.query)}"</h3>
        <p><strong>Retrieved Nodes:</strong></p>
        <ul>
            ${log.nodes && log.nodes.length > 0 ? log.nodes.map(n => `<li>${escapeHtml(n)}</li>`).join('') : '<li>No specific nodes displayed</li>'}
        </ul>
        <div class="rag-box"><strong>Glass Box Data:</strong>\n${escapeHtml(log.glassBoxText)}</div>
        <p><strong>Grounding Result:</strong> <span class="badge">${escapeHtml(log.groundText || 'Not found')}</span></p>
        <hr />
        `;
    });

    html += `
    </body>
    </html>
    `;

    fs.writeFileSync('/tmp/mindstream_audit/exhaustive_report.html', html);
    console.log("HTML generated. Rendering PDF...");

    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto('file:///tmp/mindstream_audit/exhaustive_report.html', { waitUntil: 'networkidle' });
    await page.pdf({ path: '/Users/director/Desktop/Outputs/mindstream_demo_exhaustive_audit.pdf', format: 'A4', printBackground: true });
    await browser.close();
    console.log("PDF saved to /Users/director/Desktop/Outputs/mindstream_demo_exhaustive_audit.pdf");

})();
