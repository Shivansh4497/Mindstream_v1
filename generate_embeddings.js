import { pipeline } from '@xenova/transformers';
import fs from 'fs';

const texts = [
    "Had a great conversation with Mom today. She told me stories about her childhood I'd never heard before. Feeling grateful for family.",
    "Couldn't sleep last night. Mind racing about the presentation tomorrow. Tried meditation but kept getting distracted. Need to work on this.",
    "Finished reading 'Atomic Habits'. The idea of habit stacking really resonated with me. Going to try pairing meditation with my morning coffee.",
    "Skipped my jog today and spent the morning journaling instead. Sometimes rest IS productive. My body needed it.",
    "The team loved my presentation! Got great feedback from the VP. All that prep paid off. Celebrating with dinner out tonight.",
    "Feeling stuck in a rut. Same routine, same commute, same meals. Need to shake things up but not sure how.",
    "Tried a new yoga class at the studio downtown. The instructor was amazing — first time I've felt truly present in weeks.",
    "Had an argument with Jake about something stupid. I know I overreacted. Need to apologize tomorrow. Why do I get defensive so easily?",
    "Cooked a proper meal for the first time in weeks. Mushroom risotto from scratch. The act of cooking was therapeutic.",
    "12-day running streak! My pace is improving — 5:30/km average this week. The consistency is paying off.",
    "Quarterly review at work. Got positive feedback but also honest areas for improvement. Need to work on delegation.",
    "Spent the afternoon at the farmers market. Bought way too many vegetables. There's something grounding about choosing real food.",
    "Meditation session was deep today. 20 minutes felt like 5. Had a moment of clarity about the career change I've been considering.",
    "Rain all day. Stayed in and read. Finished half of 'Deep Work'. Cal Newport makes some compelling arguments about focus.",
    "Friend's birthday dinner. Great energy, good food, lots of laughing. Realized I need to prioritize social time more.",
    "Anxiety spiked today for no clear reason. Heart racing, couldn't focus. Did a 10-minute body scan which helped bring me back.",
    "Started learning Python for the ML course. The syntax is so clean compared to what I'm used to. Excited about this path.",
    "Perfect Sunday morning. Coffee on the balcony, birds singing, no agenda. This is what balance feels like.",
    "Volunteered at the food bank with the team. Hard work but incredibly rewarding. The coordinator said they served 200 families.",
    "Tried cold plunge for the first time. 2 minutes felt like 20. But the energy after was unreal — clear headed for hours.",
    "Mid-week slump. Low energy, no motivation. Forced myself to at least walk around the block. Small wins.",
    "Great catch-up with my mentor over coffee. He reminded me that career growth isn't always linear. Needed to hear that.",
    "Journaling streak: 24 days! The consistency of writing has changed how I process my day. It's become a non-negotiable.",
    "Noticed I've been reaching for my phone less. The digital sunset habit is working. Sleep quality is noticeably better.",
    "Cooked for friends tonight. The risotto recipe is now my signature dish. Everyone asked for the recipe.",
    "Set a new PR on my morning run — 24:12 for 5K! All those early mornings are compounding. Feeling unstoppable.",
];

async function generate() {
    console.log("Loading model...");
    const embedder = await pipeline('feature-extraction', 'Supabase/gte-small');
    
    console.log("Generating embeddings...");
    const embeddings = [];
    for (let i = 0; i < texts.length; i++) {
        const result = await embedder(texts[i], { pooling: 'mean', normalize: true });
        embeddings.push(Array.from(result.data));
    }
    
    fs.writeFileSync('supabase/functions/seed-demo-data/embeddings.json', JSON.stringify(embeddings));
    console.log("Done! Wrote " + embeddings.length + " embeddings.");
}

generate();
