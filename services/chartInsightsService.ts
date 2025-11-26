import { GoogleGenerativeAI, SchemaType } from '@google/genai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

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
    correlation: string;
    sentiment: string;
    heatmaps: string[]; // One insight per habit
}

const insightsSchema = {
    type: SchemaType.OBJECT,
    properties: {
        correlation: {
            type: SchemaType.STRING,
            description: 'One-line insight about habit-mood correlation for the selected habit. Be specific about percentages or patterns.'
        },
        sentiment: {
            type: SchemaType.STRING,
            description: 'One-line insight about overall mood trends. Mention specific dates or patterns if relevant.'
        },
        heatmaps: {
            type: SchemaType.ARRAY,
            description: 'Array of one-line insights, one for each habit. Focus on consistency, streaks, or gaps.',
            items: {
                type: SchemaType.STRING
            }
        }
    },
    required: ['correlation', 'sentiment', 'heatmaps']
};

export async function generateChartInsights(
    data: ChartInsightsInput
): Promise<ChartInsightsOutput> {
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
        generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: insightsSchema
        }
    });

    // Build context from last 30 days
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
Generate 3 types of insights:

1. **Correlation Insight** (for the main correlation chart):
   - Analyze if any habit shows a clear correlation with positive mood
   - Be specific with numbers (e.g., "35% higher mood on meditation days")
   - If no clear pattern, say "No strong correlation yet—keep logging!"

2. **Sentiment Insight** (for mood flow timeline):
   - Identify trends (improving, declining, stable)
   - Mention specific dates if there are notable peaks/dips
   - Be encouraging and empathetic

3. **Heatmap Insights** (one for each habit):
   - Comment on consistency, streaks, or gaps
   - Provide actionable advice (e.g., "Try Mondays—you skip it most then")
   - Keep it motivational

**Rules:**
- Each insight must be ONE LINE ONLY (max 120 characters)
- Be specific and data-driven, not generic
- Use emojis sparingly (max 1 per insight)
- Focus on actionability, not just description

Generate the insights in JSON format.`;

    try {
        const result = await model.generateContent(prompt);
        const response = result.response.text();
        const parsed = JSON.parse(response);

        return {
            correlation: parsed.correlation || 'Not enough data to find patterns yet.',
            sentiment: parsed.sentiment || 'Keep journaling to see trends emerge!',
            heatmaps: parsed.heatmaps || data.habits.map(() => 'Track more days to unlock insights.')
        };
    } catch (error) {
        console.error('Error generating chart insights:', error);
        // Graceful fallback
        return {
            correlation: 'Complete more habit logs to reveal correlations.',
            sentiment: 'Keep journaling regularly to see patterns.',
            heatmaps: data.habits.map(h => `Build consistency with ${h.name} to see trends.`)
        };
    }
}
