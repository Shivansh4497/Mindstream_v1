import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import { embeddings } from './embeddings.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// 30-DAY DEMO DATA TEMPLATE
// "Alex" - a wellness-focused individual  
// ============================================

const HABITS = [
    { name: 'Morning Jog', emoji: '🏃', frequency: 'daily', category: 'Health', current_streak: 12, longest_streak: 21 },
    { name: 'Meditation', emoji: '🧘', frequency: 'daily', category: 'Health', current_streak: 8, longest_streak: 15 },
    { name: 'Reading', emoji: '📚', frequency: 'daily', category: 'Growth', current_streak: 3, longest_streak: 10 },
    { name: 'Drink 8 Glasses of Water', emoji: '💧', frequency: 'daily', category: 'Health', current_streak: 5, longest_streak: 14 },
    { name: 'No Screens After 10PM', emoji: '📵', frequency: 'daily', category: 'Health', current_streak: 2, longest_streak: 7 },
];

const INTENTIONS = [
    { text: 'Run a half marathon by June', status: 'pending', is_life_goal: false, is_starred: true, emoji: '🏅', category: 'Health', due_date: null },
    { text: 'Read 12 books this year', status: 'pending', is_life_goal: false, is_starred: false, emoji: '📖', category: 'Growth', due_date: null },
    { text: 'Practice gratitude daily', status: 'pending', is_life_goal: true, is_starred: false, emoji: '🙏', category: 'Health', due_date: null },
    { text: 'Complete online ML course', status: 'pending', is_life_goal: false, is_starred: true, emoji: '🤖', category: 'Career', due_date: null },
];

// 30 days of journal entries with realistic variation
const ENTRY_TEMPLATES = [
    { text: "Woke up early and went for a run along the river. The sunrise was incredible today — golden light on the water. Felt so alive.", title: "Golden Morning Run", emoji: "🌅", tags: ["running", "nature", "morning"], primary_sentiment: "Joyful" },
    { text: "Work was intense today. Back-to-back meetings and a tight deadline for the Q1 report. Managed to push through but felt drained by 5pm.", title: "Deadline Push", emoji: "💼", tags: ["work", "stress", "productivity"], primary_sentiment: "Overwhelmed" },
    { text: "Had a great conversation with Mom today. She told me stories about her childhood I'd never heard before. Feeling grateful for family.", title: "Stories from Mom", emoji: "❤️", tags: ["family", "gratitude", "connection"], primary_sentiment: "Grateful" },
    { text: "Couldn't sleep last night. Mind racing about the presentation tomorrow. Tried meditation but kept getting distracted. Need to work on this.", title: "Restless Night", emoji: "🌙", tags: ["sleep", "anxiety", "presentation"], primary_sentiment: "Anxious" },
    { text: "Finished reading 'Atomic Habits'. The idea of habit stacking really resonated with me. Going to try pairing meditation with my morning coffee.", title: "Atomic Habits Complete", emoji: "📚", tags: ["reading", "habits", "growth"], primary_sentiment: "Hopeful" },
    { text: "Skipped my jog today and spent the morning journaling instead. Sometimes rest IS productive. My body needed it.", title: "Rest Day", emoji: "☁️", tags: ["rest", "self-care", "reflection"], primary_sentiment: "Content" },
    { text: "The team loved my presentation! Got great feedback from the VP. All that prep paid off. Celebrating with dinner out tonight.", title: "Presentation Win", emoji: "🎉", tags: ["work", "success", "celebration"], primary_sentiment: "Proud" },
    { text: "Feeling stuck in a rut. Same routine, same commute, same meals. Need to shake things up but not sure how.", title: "Breaking the Routine", emoji: "🔄", tags: ["routine", "boredom", "change"], primary_sentiment: "Frustrated" },
    { text: "Tried a new yoga class at the studio downtown. The instructor was amazing — first time I've felt truly present in weeks.", title: "Yoga Discovery", emoji: "🧘", tags: ["yoga", "mindfulness", "new experience"], primary_sentiment: "Content" },
    { text: "Had an argument with Jake about something stupid. I know I overreacted. Need to apologize tomorrow. Why do I get defensive so easily?", title: "Argument Reflection", emoji: "😔", tags: ["relationships", "conflict", "self-awareness"], primary_sentiment: "Sad" },
    { text: "Cooked a proper meal for the first time in weeks. Mushroom risotto from scratch. The act of cooking was therapeutic.", title: "Kitchen Therapy", emoji: "🍄", tags: ["cooking", "self-care", "mindfulness"], primary_sentiment: "Content" },
    { text: "12-day running streak! My pace is improving — 5:30/km average this week. The consistency is paying off.", title: "Streak Milestone", emoji: "🏃", tags: ["running", "streak", "progress"], primary_sentiment: "Proud" },
    { text: "Quarterly review at work. Got positive feedback but also honest areas for improvement. Need to work on delegation.", title: "Growth Feedback", emoji: "📊", tags: ["work", "feedback", "growth"], primary_sentiment: "Reflective" },
    { text: "Spent the afternoon at the farmers market. Bought way too many vegetables. There's something grounding about choosing real food.", title: "Market Day", emoji: "🥬", tags: ["food", "nature", "weekend"], primary_sentiment: "Content" },
    { text: "Meditation session was deep today. 20 minutes felt like 5. Had a moment of clarity about the career change I've been considering.", title: "Clarity Moment", emoji: "✨", tags: ["meditation", "career", "clarity"], primary_sentiment: "Hopeful" },
    { text: "Rain all day. Stayed in and read. Finished half of 'Deep Work'. Cal Newport makes some compelling arguments about focus.", title: "Rainy Day Reading", emoji: "🌧️", tags: ["reading", "rain", "focus"], primary_sentiment: "Content" },
    { text: "Friend's birthday dinner. Great energy, good food, lots of laughing. Realized I need to prioritize social time more.", title: "Birthday Celebration", emoji: "🎂", tags: ["friends", "celebration", "social"], primary_sentiment: "Joyful" },
    { text: "Anxiety spiked today for no clear reason. Heart racing, couldn't focus. Did a 10-minute body scan which helped bring me back.", title: "Anxiety Wave", emoji: "🌊", tags: ["anxiety", "meditation", "coping"], primary_sentiment: "Anxious" },
    { text: "Started learning Python for the ML course. The syntax is so clean compared to what I'm used to. Excited about this path.", title: "Python Day 1", emoji: "🐍", tags: ["coding", "learning", "career"], primary_sentiment: "Hopeful" },
    { text: "Perfect Sunday morning. Coffee on the balcony, birds singing, no agenda. This is what balance feels like.", title: "Perfect Sunday", emoji: "☕", tags: ["weekend", "balance", "peace"], primary_sentiment: "Content" },
    { text: "Volunteered at the food bank with the team. Hard work but incredibly rewarding. The coordinator said they served 200 families.", title: "Giving Back", emoji: "🤝", tags: ["volunteering", "community", "gratitude"], primary_sentiment: "Grateful" },
    { text: "Tried cold plunge for the first time. 2 minutes felt like 20. But the energy after was unreal — clear headed for hours.", title: "Cold Plunge Debut", emoji: "🧊", tags: ["cold plunge", "energy", "new experience"], primary_sentiment: "Proud" },
    { text: "Mid-week slump. Low energy, no motivation. Forced myself to at least walk around the block. Small wins.", title: "Low Energy Day", emoji: "😴", tags: ["low energy", "motivation", "walking"], primary_sentiment: "Frustrated" },
    { text: "Great catch-up with my mentor over coffee. He reminded me that career growth isn't always linear. Needed to hear that.", title: "Mentor Wisdom", emoji: "💡", tags: ["mentorship", "career", "wisdom"], primary_sentiment: "Reflective" },
    { text: "Journaling streak: 24 days! The consistency of writing has changed how I process my day. It's become a non-negotiable.", title: "Journaling Milestone", emoji: "📝", tags: ["journaling", "streak", "habit"], primary_sentiment: "Proud" },
    { text: "Noticed I've been reaching for my phone less. The digital sunset habit is working. Sleep quality is noticeably better.", title: "Less Screen Time", emoji: "📱", tags: ["screens", "sleep", "habits"], primary_sentiment: "Content" },
    { text: "Cooked for friends tonight. The risotto recipe is now my signature dish. Everyone asked for the recipe.", title: "Signature Dish", emoji: "👨‍🍳", tags: ["cooking", "friends", "hosting"], primary_sentiment: "Joyful" },
    { text: "Set a new PR on my morning run — 24:12 for 5K! All those early mornings are compounding. Feeling unstoppable.", title: "5K Personal Record", emoji: "🏆", tags: ["running", "PR", "progress"], primary_sentiment: "Proud" },
];

const REFLECTIONS = [
    {
        type: 'daily',
        summary: "Today was a day of balance. You started strong with your morning jog and meditation, and despite work stress, you found time to read in the evening. Your habit consistency is at 80% this week — the highest it's been.",
    },
    {
        type: 'weekly',
        summary: "This week showed a clear pattern: your mood correlates strongly with exercise. Days with morning jogs averaged 'Joyful' sentiment, while rest days leaned 'Reflective'. Your reading habit dropped mid-week but you recovered by Friday. Overall trend: upward.",
    },
    {
        type: 'monthly',
        summary: "Your monthly trends show remarkable growth. You've gone from 40% habit completion in week 1 to 80% in week 4. Key insight: your anxiety entries always cluster around Tuesdays (presentation days). Your strongest emotional theme this month is 'Growth' — mentioned in 60% of entries.",
    },
];

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { userId } = await req.json();
        if (!userId) {
            return new Response(JSON.stringify({ error: 'userId is required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.log(`[Seed Demo] Seeding data for user: ${userId}`);

        // Create admin client to bypass RLS
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Idempotency check — skip if data already exists
        // Wipe old data first to ensure fresh embeddings and schema updates
        await supabaseAdmin.from('entries').delete().eq('user_id', userId);
        await supabaseAdmin.from('habit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Clean way to wipe related logs, though wiping habits will cascade
        await supabaseAdmin.from('habits').delete().eq('user_id', userId);
        await supabaseAdmin.from('intentions').delete().eq('user_id', userId);
        await supabaseAdmin.from('reflections').delete().eq('user_id', userId);

        const now = new Date();

        // --- 1. Insert Habits ---
        const habitsToInsert = HABITS.map(h => ({
            user_id: userId,
            ...h,
            created_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        }));

        const { data: insertedHabits, error: habitsError } = await supabaseAdmin
            .from('habits')
            .insert(habitsToInsert)
            .select('id, name');

        if (habitsError) throw new Error(`Habits insert failed: ${habitsError.message}`);
        console.log(`[Seed Demo] Inserted ${insertedHabits?.length} habits`);

        // --- 2. Insert Habit Logs (realistic completion patterns) ---
        const habitLogs: any[] = [];
        if (insertedHabits) {
            for (const habit of insertedHabits) {
                // Different completion rates per habit
                const completionRate = habit.name === 'Morning Jog' ? 0.85
                    : habit.name === 'Meditation' ? 0.70
                        : habit.name === 'Reading' ? 0.50
                            : habit.name === 'Drink 8 Glasses of Water' ? 0.60
                                : 0.40; // No Screens After 10PM

                for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
                    if (Math.random() < completionRate) {
                        const logDate = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
                        // Set time to morning for jog, midday for others
                        logDate.setHours(habit.name === 'Morning Jog' ? 7 : 12, Math.floor(Math.random() * 60), 0);
                        habitLogs.push({
                            habit_id: habit.id,
                            completed_at: logDate.toISOString(),
                        });
                    }
                }
            }
        }

        if (habitLogs.length > 0) {
            const { error: logsError } = await supabaseAdmin.from('habit_logs').insert(habitLogs);
            if (logsError) throw new Error(`Habit logs insert failed: ${logsError.message}`);
            console.log(`[Seed Demo] Inserted ${habitLogs.length} habit logs`);
        }

        // --- 3. Insert Entries (spread across 30 days) ---
        // Load pre-computed embeddings
        let precomputedEmbeddings = embeddings;

        const entriesToInsert = [];
        const templates = ENTRY_TEMPLATES.slice(0, 28);
        for (let i = 0; i < templates.length; i++) {
            const entry = templates[i];
            const dayOffset = 28 - i; // Most recent entries use later templates
            const entryDate = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
            // Vary the time of day
            const hours = [7, 8, 12, 13, 18, 19, 20, 21][Math.floor(Math.random() * 8)];
            entryDate.setHours(hours, Math.floor(Math.random() * 60), 0);

            const embedding = precomputedEmbeddings[i] || null;

            entriesToInsert.push({
                user_id: userId,
                text: entry.text,
                title: entry.title,
                emoji: entry.emoji,
                tags: entry.tags,
                primary_sentiment: entry.primary_sentiment,
                timestamp: entryDate.toISOString(),
                embedding: embedding
            });
        }

        const { error: entriesError } = await supabaseAdmin.from('entries').insert(entriesToInsert);
        if (entriesError) throw new Error(`Entries insert failed: ${entriesError.message}`);
        console.log(`[Seed Demo] Inserted ${entriesToInsert.length} entries with embeddings`);

        // --- 4. Insert Intentions ---
        const intentionsToInsert = INTENTIONS.map((intention, i) => ({
            user_id: userId,
            ...intention,
            is_recurring: false,
            created_at: new Date(now.getTime() - (25 - i * 5) * 24 * 60 * 60 * 1000).toISOString(),
        }));

        const { error: intentionsError } = await supabaseAdmin.from('intentions').insert(intentionsToInsert);
        if (intentionsError) throw new Error(`Intentions insert failed: ${intentionsError.message}`);
        console.log(`[Seed Demo] Inserted ${intentionsToInsert.length} intentions`);

        // --- 5. Insert Reflections ---
        const reflectionsToInsert = REFLECTIONS.map((ref, i) => ({
            user_id: userId,
            type: ref.type,
            summary: ref.summary,
            date: new Date(now.getTime() - (i === 0 ? 1 : i === 1 ? 7 : 28) * 24 * 60 * 60 * 1000)
                .toISOString().split('T')[0],
            timestamp: new Date(now.getTime() - (i === 0 ? 1 : i === 1 ? 7 : 28) * 24 * 60 * 60 * 1000)
                .toISOString(),
            auto_generated: false,
        }));

        const { error: reflectionsError } = await supabaseAdmin.from('reflections').insert(reflectionsToInsert);
        if (reflectionsError) throw new Error(`Reflections insert failed: ${reflectionsError.message}`);
        console.log(`[Seed Demo] Inserted ${reflectionsToInsert.length} reflections`);

        // --- 6. Log analytics event ---
        await supabaseAdmin.from('analytics_events').insert({
            user_id: userId,
            event_name: 'demo_session_started',
            properties: { seeded_at: now.toISOString(), entries_count: entriesToInsert.length },
            client_event_id: `demo_start_${userId}_${now.getTime()}`,
        });

        console.log(`[Seed Demo] ✅ Demo data seeded successfully for ${userId}`);

        return new Response(JSON.stringify({
            success: true,
            seeded: {
                habits: habitsToInsert.length,
                habitLogs: habitLogs.length,
                entries: entriesToInsert.length,
                intentions: intentionsToInsert.length,
                reflections: reflectionsToInsert.length,
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('[Seed Demo] Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
