const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

interface ChartInsightsInput {
    entries: Array<{
        timestamp: string;
        primary_sentiment?: string;
        title?: string;
    }>;
    habits: Array<{
        id: string;
        name: string;
        emoji: string;
    }>;
    habitLogs: Array<{
        habit_id: string;
        completed_at: string;
    }>;
}

interface ChartInsightsOutput {
    dailyPulse: string;
    correlation: string;
    sentiment: string;
    heatmaps: string[];
}

export async function generateChartInsights(
    data: ChartInsightsInput
): Promise<ChartInsightsOutput> {
    const prompt = `You are analyzing a user's journaling data to generate actionable insights for their data visualization charts.

**Data Summary:**
- ${data.entries.length} journal entries over the last 30 days
- ${data.habits.length} habits being tracked
- ${data.habitLogs.length} habit completions logged

**Habits:**
${data.habits.map(h => `- ${h.emoji} ${h.name}`).join('\n')}

**Recent Entries (sample):**
${data.entries.slice(0, 10).map(e => `${e.timestamp}: ${e.primary_sentiment || 'neutral'} - ${e.title || ''}`).join('\n')}

**Task:**
Generate 4 types of insights:

0. **Daily Pulse** (holistic summary):
   - Synthesize ALL data into 2-3 sentences
   - Structure: [Progress Acknowledgment] + [Key Pattern] + [Actionable Suggestion]
   - Example: "You're building momentum with Reading (3-day streak!), but your mood dipped slightly this week. Try a lighter session today—your best days happen when you ease in."
   - Be warm, specific, and coach-like

1. **Correlation Insight** (for the main correlation chart):
   - Analyze if any habit shows a clear correlation with positive mood
   - If positive: "You feel 35% better when you meditate."
   - If negative: "Reading seems to drain you (-3%). Try doing it in the morning?" (Suggest an experiment)
   - If neutral: "No clear pattern yet. Try increasing the duration?"

2. **Sentiment Insight** (for mood flow timeline):
   - Identify trends (improving, declining, stable)
   - Be a compassionate coach: "You bounced back from a hard week—great resilience."
   - Avoid robotic descriptions like "Mood is trending up."

3. **Heatmap Insights** (one for each habit):
   - Focus on the *why*, not just the *what*
   - "You miss Mondays often. Maybe the goal is too big for a busy day?"
   - "Great streak! You're building a solid routine."

**Rules:**
- Each insight must be ONE LINE ONLY (max 120 characters)
- Be specific and data-driven, not generic
- Use emojis sparingly (max 1 per insight)
- Focus on actionability, not just description

Generate the insights in JSON format.`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        responseMimeType: 'application/json',
                        responseSchema: {
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
            }
        );

        const result = await response.json();

        if (!result.candidates || !result.candidates[0]) {
            console.error('Gemini API Error:', JSON.stringify(result, null, 2));
            throw new Error('Invalid response from Gemini API');
        }

        const text = result.candidates[0].content.parts[0].text;
        const parsed = JSON.parse(text);

        return {
            dailyPulse: parsed.dailyPulse || 'Keep tracking your habits and mood to unlock personalized insights.',
            correlation: parsed.correlation || 'Not enough data to find patterns yet.',
            sentiment: parsed.sentiment || 'Keep journaling to see trends emerge!',
            heatmaps: parsed.heatmaps || data.habits.map(() => 'Track more days to unlock insights.')
        };
    } catch (error) {
        console.error('Error generating chart insights:', error);
        // Graceful fallback
        return {
            dailyPulse: 'Keep tracking your habits and mood to unlock personalized insights.',
            correlation: 'Complete more habit logs to reveal correlations.',
            sentiment: 'Keep journaling regularly to see patterns.',
            heatmaps: data.habits.map(h => `Build consistency with ${h.name} to see trends.`)
        };
    }
}
