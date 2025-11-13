import { GoogleGenAI, Type } from "@google/genai";
import type { Entry, Message, Reflection, Intention } from '../types';
import { getDisplayDate } from "../utils/date";

// The Gemini API key is now sourced from the environment variables with the VITE_ prefix.
const GEMINI_API_KEY = process.env.VITE_API_KEY;


let ai: GoogleGenAI | null = null;
let apiKeyAvailable = false;

if (GEMINI_API_KEY) {
    try {
        ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        apiKeyAvailable = true;
    } catch(e) {
        console.error("Error initializing Gemini client. Please check your API key.", e);
        ai = null;
        apiKeyAvailable = false;
    }
}

if (!apiKeyAvailable) {
    console.log("Gemini API Key is not configured. AI features will be disabled.");
}

export const GEMINI_API_KEY_AVAILABLE = apiKeyAvailable;


/**
 * Generates a summary reflection based on a day's entries and intentions.
 */
export const generateReflection = async (entries: Entry[], intentions: Intention[]): Promise<string> => {
  if (!ai) return "AI functionality is disabled. Please configure the API key.";
  try {
    const model = 'gemini-2.5-flash';

    const entriesText = entries.map(e => `- ${new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}: ${e.text}`).join('\n');
    const intentionsText = intentions.map(i => `- [${i.status === 'completed' ? 'x' : ' '}] ${i.text}`).join('\n');

    const prompt = `You are a thoughtful and empathetic journal assistant. I will provide you with my journal entries and my intentions (to-dos) from today. Please write a short, insightful reflection (2-3 sentences) that analyzes how my feelings and actions (from the entries) aligned with my goals (from the intentions). Speak in a gentle, encouraging, and first-person-plural tone (e.g., "It seems like we made great progress...", "Today, we explored themes of...").

Here were our intentions for today:
${intentionsText.length > 0 ? intentionsText : "No specific intentions were set."}

Here are today's journal entries:
${entriesText}

Your holistic reflection on how our actions and feelings connected to our goals:`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Error generating reflection:", error);
    return "I'm sorry, I couldn't generate a reflection at this time. Please try again later.";
  }
};


/**
 * Generates a weekly summary reflection based on a week's daily reflections.
 */
export const generateWeeklyReflection = async (dailyReflections: Reflection[]): Promise<string> => {
  if (!ai) return "AI functionality is disabled.";
  try {
    const model = 'gemini-2.5-flash';
    
    const reflectionsText = dailyReflections
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(r => `- ${getDisplayDate(r.date)}: ${r.summary}`)
      .join('\n');

    const prompt = `You are a thoughtful and empathetic journal assistant. I will provide you with my daily reflections from an entire week. Please synthesize these into a higher-level weekly summary. Identify broader patterns, recurring themes, overall mood, and progress towards goals that emerged during the week. Speak in a gentle, encouraging, and first-person-plural tone (e.g., "This week, we saw a pattern of...", "It seems like a key theme for us was..."). Keep it to 3-4 sentences.

Here are our daily reflections from this week:
${reflectionsText}

Your holistic weekly reflection on our patterns and themes:`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating weekly reflection:", error);
    return "I'm sorry, I couldn't generate a weekly reflection at this time.";
  }
};


/**
 * Generates a monthly summary reflection based on a month's daily reflections.
 */
export const generateMonthlyReflection = async (dailyReflections: Reflection[]): Promise<string> => {
  if (!ai) return "AI functionality is disabled.";
  try {
    const model = 'gemini-2.5-flash';
    
    const reflectionsText = dailyReflections
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(r => `- ${getDisplayDate(r.date)}: ${r.summary}`)
      .join('\n');

    const prompt = `You are a thoughtful and empathetic journal assistant. I will provide you with my daily reflections from an entire month. Please synthesize these into a higher-level monthly summary. Identify major themes, significant shifts in mood or thinking, challenges we faced, and milestones we achieved over the month. Speak in a gentle, encouraging, and first-person-plural tone (e.g., "Looking back at this month, a major theme for us was...", "We made significant progress in..."). Keep it to 4-5 sentences.

Here are our daily reflections from this month:
${reflectionsText}

Your holistic monthly reflection on our journey:`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating monthly reflection:", error);
    return "I'm sorry, I couldn't generate a monthly reflection at this time.";
  }
};


/**
 * Processes a new journal entry to generate a title and tags.
 */
export const processEntry = async (entryText: string): Promise<{ title: string; tags: string[] }> => {
  if (!ai) return { title: 'Journal Entry', tags: [] };
  try {
    const model = 'gemini-2.5-flash';

    const prompt = `Analyze the following journal entry. Based on its content, provide a concise, descriptive title (3-5 words) and 2-4 relevant tags that capture the topics and emotions.

Entry: "${entryText}"

Respond with only a JSON object.`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: "A short, descriptive title for the journal entry (3-5 words)."
            },
            tags: {
              type: Type.ARRAY,
              description: "An array of 2-4 single-word or two-word tags that categorize the entry.",
              items: {
                type: Type.STRING
              }
            }
          },
          required: ['title', 'tags']
        }
      }
    });
    
    const jsonStr = response.text.trim();
    const result = JSON.parse(jsonStr);
    return result;

  } catch (error) {
    console.error("Error processing entry:", error);
    return { title: 'Journal Entry', tags: [] };
  }
};


/**
 * Gets a response from the AI for the chat feature.
 * This is now a "Holistic" function that uses entries AND intentions.
 */
export const getChatResponse = async (history: Message[], entries: Entry[], intentions: Intention[]): Promise<string> => {
    if (!ai) return "AI functionality is disabled. Please configure the API key.";
    try {
        const model = 'gemini-2.5-flash';

        // Prepare context from recent entries
        const recentEntriesSummary = entries.slice(0, 15).map(e => 
            `- On ${new Date(e.timestamp).toLocaleDateString()}, I wrote: "${e.text}"`
        ).join('\n');
        
        // Prepare context from all intentions (goals)
        const intentionsSummary = intentions.map(i => 
            `- My [${i.timeframe}] goal is: "${i.text}" (Status: ${i.status})`
        ).join('\n');

        const systemInstruction = `You are Mindstream, a friendly and insightful AI companion for journaling and self-reflection. Your goal is to help me explore my thoughts, feelings, and goals. You have access to my recent journal entries AND my list of intentions (to-dos/goals) to provide full context. Use all this information to answer my questions. Be empathetic, ask clarifying questions, and offer gentle guidance. Do not give medical advice. Keep your responses concise and conversational.

CONTEXT from my recent journal entries:
${recentEntriesSummary.length > 0 ? recentEntriesSummary : "No recent journal entries."}

CONTEXT from my intentions and goals:
${intentionsSummary.length > 0 ? intentionsSummary : "No intentions or goals set yet."}`;

        const userPrompt = history[history.length - 1].text;
        
        // Construct the conversation history for the model.
        const chatHistory = history.slice(0, -1).map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }],
        }));
        
        const response = await ai.models.generateContent({
            model,
            contents: [
                ...chatHistory,
                { role: 'user', parts: [{ text: userPrompt }] }
            ],
            config: {
                systemInstruction,
            }
        });

        return response.text;

    } catch (error) {
        console.error("Error in chat response:", error);
        return "I'm sorry, something went wrong. I can't chat right now.";
    }
}
