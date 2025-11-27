import { getAiClient } from './geminiService';

export interface OnboardingSuggestion {
    type: 'habit' | 'intention';
    name: string;
    emoji: string;
    category?: string;
    frequency?: 'daily' | 'weekly' | 'monthly';
    timeframe?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'life';
}

export interface OnboardingSuggestionsResponse {
    habits: OnboardingSuggestion[];
    intentions: OnboardingSuggestion[];
}

export const generateOnboardingSuggestions = async (
    initialEntry: string
): Promise<OnboardingSuggestionsResponse> => {
    const ai = getAiClient();
    if (!ai) {
        throw new Error('AI functionality is disabled');
    }

    const prompt = `Analyze this user's first journal entry and suggest 2-3 specific, actionable habits and 1-2 meaningful intentions.

Journal Entry: "${initialEntry}"

Guidelines:
- Habits should be VERY specific and achievable (e.g., "Walk for 10 minutes" not "Exercise more")
- Use emojis that match the habit/intention
- Choose appropriate categories: Health, Growth, Career, Finance, Connection, System
- Frequency should match the habit type (daily for small habits, weekly for bigger goals)
- Intentions should be outcome-focused, not process-focused

Return ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "habits": [
    {
      "type": "habit",
      "name": "Walk for 10 minutes",
      "emoji": "🚶",
      "category": "Health",
      "frequency": "daily"
    }
  ],
  "intentions": [
    {
      "type": "intention",
      "name": "Complete project presentation",
      "emoji": "🎯",
      "timeframe": "weekly"
    }
  ]
}`;

    try {
        const result = await ai.generateContent(prompt);
        const responseText = result.response.text();

        // Clean up the response (remove markdown code blocks if present)
        const cleanedText = responseText
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        const parsed = JSON.parse(cleanedText);

        return {
            habits: parsed.habits || [],
            intentions: parsed.intentions || []
        };
    } catch (error) {
        console.error('Error generating onboarding suggestions:', error);
        // Return empty suggestions on error
        return {
            habits: [],
            intentions: []
        };
    }
};
