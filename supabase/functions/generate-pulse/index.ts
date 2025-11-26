import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const geminiKey = Deno.env.get('GEMINI_API_KEY')!;

interface ChartInsights {
    dailyPulse: string;
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
Generate 4 types of insights:

0. **Daily Pulse** (holistic summary):
   - Synthesize ALL data into 2-3 sentences
   - Structure: [Progress Acknowledgment] + [Key Pattern] + [Actionable Suggestion]
   - Example: "You're building momentum with Reading (3-day streak!), but your mood dipped slightly this week. Try a lighter session today—your best days happen when you ease in."
   - Be warm, specific, and coach-like

1. **Correlation Insight**: Analyze if any habit correlates with positive mood. Be specific with numbers.
2. **Sentiment Insight**: Identify trends (improving, declining, stable). Mention specific dates if relevant.
3. **Heatmap Insights**: Comment on consistency, streaks, or gaps for each habit.

**Rules:**
- Each insight must be ONE LINE ONLY (max 120 characters)
- Be specific and data-driven
- Focus on actionability

Return JSON: { "dailyPulse": "...", "correlation": "...", "sentiment": "...", "heatmaps": ["...", "..."] }`;

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
                        dailyPulse: { type: 'string' },
                        correlation: { type: 'string' },
                        sentiment: { type: 'string' },
                        heatmaps: { type: 'array', items: { type: 'string' } }
                    },
                    required: ['dailyPulse', 'correlation', 'sentiment', 'heatmaps']
                }
            }
        })
    });

    const result = await response.json();

    if (!result.candidates || !result.candidates[0]) {
        console.error('Gemini API Error:', JSON.stringify(result, null, 2));
        throw new Error('Invalid response from Gemini API');
    }

    const text = result.candidates[0].content.parts[0].text;
    return JSON.parse(text);
}

serve(async (req) => {
    try {
        // Only allow POST requests
        if (req.method !== 'POST') {
            return new Response('Method not allowed', { status: 405 });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get user from auth header
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing authorization' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser(
            authHeader.replace('Bearer ', '')
        );

        if (userError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

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
            return new Response(JSON.stringify({
                error: 'You need at least 3 journal entries to generate insights.'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Generate insights
        const insights = await generateInsights({
            entries,
            habits: habits || [],
            habitLogs: habitLogs || []
        });

        // Save to database
        const { error: insertError } = await supabase.from('chart_insights').insert({
            user_id: user.id,
            daily_pulse: insights.dailyPulse,
            correlation_insight: insights.correlation,
            sentiment_insight: insights.sentiment,
            heatmap_insights: insights.heatmaps
        });

        if (insertError) throw insertError;

        return new Response(JSON.stringify({
            success: true,
            insights
        }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
        });
    } catch (error: any) {
        console.error('Edge function error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500
        });
    }
});
