import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const geminiKey = Deno.env.get('GEMINI_API_KEY')!;

interface ChartInsights {
    correlation: string;
    sentiment: string;
    heatmaps: string[];
}

async function generateInsights(data: any): Promise<ChartInsights> {
    const prompt = `You are analyzing a user's journaling data to generate actionable insights for their data visualization charts.

**Data Summary:**
- ${data.entries.length} journal entries over the last 30 days
- ${data.habits.length} habits being tracked
- ${data.habitLogs.length} habit completions logged

**Habits:**
${data.habits.map((h: any) => `- ${h.emoji} ${h.name}`).join('\n')}

**Task:**
Generate 3 types of insights:

1. **Correlation Insight**: Analyze if any habit correlates with positive mood. Be specific with numbers.
2. **Sentiment Insight**: Identify trends (improving, declining, stable). Mention specific dates if relevant.
3. **Heatmap Insights**: Comment on consistency, streaks, or gaps for each habit.

**Rules:**
- Each insight must be ONE LINE ONLY (max 120 characters)
- Be specific and data-driven
- Focus on actionability

Return JSON: { "correlation": "...", "sentiment": "...", "heatmaps": ["...", "..."] }`;

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=' + geminiKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                response_mime_type: 'application/json',
                response_schema: {
                    type: 'object',
                    properties: {
                        correlation: { type: 'string' },
                        sentiment: { type: 'string' },
                        heatmaps: { type: 'array', items: { type: 'string' } }
                    },
                    required: ['correlation', 'sentiment', 'heatmaps']
                }
            }
        })
    });

    const result = await response.json();
    const text = result.candidates[0].content.parts[0].text;
    return JSON.parse(text);
}

serve(async (req) => {
    try {
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get all users
        const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
        if (usersError) throw usersError;

        console.log(`Generating insights for ${users.length} users`);

        for (const user of users) {
            try {
                // Fetch last 30 days of data
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                const [{ data: entries }, { data: habits }, { data: habitLogs }] = await Promise.all([
                    supabase.from('entries').select('timestamp, primary_sentiment, title')
                        .eq('user_id', user.id)
                        .gte('timestamp', thirtyDaysAgo.toISOString())
                        .order('timestamp', { ascending: false }),
                    supabase.from('habits').select('id, name, emoji')
                        .eq('user_id', user.id),
                    supabase.from('habit_logs').select('habit_id, completed_at')
                        .eq('user_id', user.id)
                        .gte('completed_at', thirtyDaysAgo.toISOString())
                ]);

                if (!entries || entries.length < 3) {
                    console.log(`Skipping user ${user.id}: insufficient data`);
                    continue;
                }

                // Generate insights
                const insights = await generateInsights({
                    entries,
                    habits: habits || [],
                    habitLogs: habitLogs || []
                });

                // Store insights in database
                await supabase.from('chart_insights').insert([
                    {
                        user_id: user.id,
                        insight_type: 'correlation',
                        insight_text: insights.correlation
                    },
                    {
                        user_id: user.id,
                        insight_type: 'sentiment',
                        insight_text: insights.sentiment
                    },
                    ...insights.heatmaps.map((text: string, idx: number) => ({
                        user_id: user.id,
                        insight_type: 'heatmap',
                        insight_text: text,
                        metadata: { habit_index: idx }
                    }))
                ]);

                console.log(`✅ Generated insights for user ${user.id}`);
            } catch (userError) {
                console.error(`Error processing user ${user.id}:`, userError);
            }
        }

        return new Response(JSON.stringify({ success: true, users: users.length }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
        });
    } catch (error) {
        console.error('Edge function error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500
        });
    }
});
