// FIX: Updated to use import.meta.env for consistency and added optional chaining to prevent crashes.
import { GoogleGenAI, Type } from "@google/genai";
import type { Entry, Message, Reflection, Intention, AISuggestion } from '../types';
import { getDisplayDate } from "../utils/date";

let ai: GoogleGenAI | null = null;
let apiKeyAvailable = false;

// FIX: Reverted to VITE_ prefix as required by the Vite build tool for client-side exposure.
const GEMINI_API_KEY = (import.meta as any).env?.VITE_API_KEY;

if (GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    apiKeyAvailable = true;
  } catch (e) {
    console.error("Error initializing Gemini client. Please check your API key.", e);
    ai = null;
    apiKeyAvailable = false;
  }
}

if (!apiKeyAvailable) {
    console.log("Gemini API Key is not configured. AI features will be disabled.");
}

export const GEMINI_API_KEY_AVAILABLE = apiKeyAvailable;

const generateActionableSuggestionsSchema = {
    type: Type.ARRAY,
    description: "A list of 1-2 concise, actionable suggestions based on the reflection, framed as intentions.",
    items: {
        type: Type.OBJECT,
        properties: {
            text: {
                type: Type.STRING,
                description: "The task or goal to be achieved."
            },
            timeframe: {
                type: Type.STRING,
                description: "The suggested timeframe, either 'daily' or 'weekly'."
            }
        },
        required: ['text', 'timeframe']
    }
};

/**
 * Generates a summary reflection based on a day's entries and intentions.
 */
export const generateReflection = async (entries: Entry[], intentions: Intention[]): Promise<{ summary: string; suggestions: AISuggestion[] }> => {
  if (!ai) return { summary: "AI functionality is disabled. Please configure the API key.", suggestions: [] };
  let response;
  try {
    const model = 'gemini-2.5-flash';

    const entriesText = entries.map(e => `- ${new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}: ${e.text}`).join('\n');
    const intentionsText = intentions.map(i => `- [${i.status === 'completed' ? 'x' : ' '}] ${i.text}`).join('\n');

    const prompt = `You are a thoughtful and empathetic journal assistant. I will provide you with my journal entries and my intentions (to-dos) from today. Please write a short, insightful reflection (2-3 sentences) that analyzes how my feelings and actions (from the entries) aligned with my goals (from the intentions). Speak in a gentle, encouraging, and first-person-plural tone (e.g., "It seems like we made great progress...", "Today, we explored themes of..."). Based on your analysis, also provide 1-2 actionable suggestions for a new 'daily' or 'weekly' intention.

Here were our intentions for today:
${intentionsText.length > 0 ? intentionsText : "No specific intentions were set."}

Here are today's journal entries:
${entriesText}

Respond with a JSON object.`;

    response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
          responseMimeType: "application/json",
          responseSchema: {
              type: Type.OBJECT,
              properties: {
                  summary: {
                      type: Type.STRING,
                      description: "The 2-3 sentence holistic reflection on the day."
                  },
                  suggestions: generateActionableSuggestionsSchema
              },
              required: ['summary', 'suggestions']
          }
      }
    });

    const result = JSON.parse(response.text.trim());
    return result;
  } catch (error) {
    console.error("Error generating reflection:", error);
    let summary = "I'm sorry, I couldn't generate a reflection at this time. Please try again later.";
    if (error instanceof SyntaxError && response) {
        summary = "There was an issue processing the reflection from the AI. It might have been in an unexpected format. Please try again.";
        console.error("Gemini Response (Invalid JSON):", response.text);
    }
    return { summary, suggestions: [] };
  }
};


/**
 * Generates a weekly summary reflection based on a week's journal entries.
 */
export const generateWeeklyReflection = async (entries: Entry[], intentions: Intention[]): Promise<{ summary: string; suggestions: AISuggestion[] }> => {
  if (!ai) return { summary: "AI functionality is disabled.", suggestions: [] };
  let response;
  try {
    const model = 'gemini-2.5-flash';
    
    const entriesText = entries
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(e => `- ${getDisplayDate(e.timestamp)} at ${new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}: ${e.text}`)
      .join('\n');

    const intentionsText = intentions.map(i => `- [${i.status === 'completed' ? 'x' : ' '}] ${i.text} (${i.timeframe})`).join('\n');

    const prompt = `You are a thoughtful and empathetic journal assistant. I will provide you with my journal entries and my intentions/goals from an entire week. Please synthesize these into a higher-level weekly summary (3-4 sentences). Identify broader patterns, recurring themes, and overall mood, paying special attention to how our actions and feelings (from entries) aligned with our goals (from intentions). Based on this, also provide 1-2 actionable 'weekly' intentions. Speak in a gentle, encouraging, and first-person-plural tone.

Here are our intentions for context:
${intentionsText.length > 0 ? intentionsText : "No specific intentions were set for this period."}

Here are our journal entries from this week:
${entriesText}

Respond with a JSON object.`;

    response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
          responseMimeType: "application/json",
          responseSchema: {
              type: Type.OBJECT,
              properties: {
                  summary: {
                      type: Type.STRING,
                      description: "The 3-4 sentence holistic reflection on the week."
                  },
                  suggestions: generateActionableSuggestionsSchema
              },
              required: ['summary', 'suggestions']
          }
      }
    });
    
    const result = JSON.parse(response.text.trim());
    return result;

  } catch (error) {
    console.error("Error generating weekly reflection:", error);
    let summary = "I'm sorry, I couldn't generate a weekly reflection at this time.";
    if (error instanceof SyntaxError && response) {
        summary = "There was an issue processing the reflection from the AI. It might have been in an unexpected format. Please try again.";
        console.error("Gemini Response (Invalid JSON):", response.text);
    }
    return { summary, suggestions: [] };
  }
};


/**
 * Generates a monthly summary reflection based on a month's journal entries.
 */
export const generateMonthlyReflection = async (entries: Entry[], intentions: Intention[]): Promise<{ summary: string; suggestions: AISuggestion[] }> => {
  if (!ai) return { summary: "AI functionality is disabled.", suggestions: [] };
  let response;
  try {
    const model = 'gemini-2.5-flash';
    
    const entriesText = entries
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(e => `- On ${getDisplayDate(e.timestamp)}: ${e.text}`)
      .join('\n');

    const intentionsText = intentions.map(i => `- [${i.status === 'completed' ? 'x' : ' '}] ${i.text} (${i.timeframe})`).join('\n');

    const prompt = `You are a thoughtful and empathetic journal assistant. I will provide you with my journal entries and intentions from an entire month. Please synthesize these into a higher-level monthly summary (4-5 sentences). Analyze how our actions and feelings related to our goals. Identify major themes, significant shifts in mood or thinking, challenges we faced, and milestones we achieved over the month. Based on this, also provide 1-2 actionable 'weekly' or 'monthly' intentions. Speak in a gentle, encouraging, and first-person-plural tone.

Here are our intentions for context:
${intentionsText.length > 0 ? intentionsText : "No specific intentions were set for this period."}

Here are our journal entries from this month:
${entriesText}

Respond with a JSON object.`;

    response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
          responseMimeType: "application/json",
          responseSchema: {
              type: Type.OBJECT,
              properties: {
                  summary: {
                      type: Type.STRING,
                      description: "The 4-5 sentence holistic reflection on the month."
                  },
                  suggestions: generateActionableSuggestionsSchema
              },
              required: ['summary', 'suggestions']
          }
      }
    });
    
    const result = JSON.parse(response.text.trim());
    return result;

  } catch (error) {
    console.error("Error generating monthly reflection:", error);
    let summary = "I'm sorry, I couldn't generate a monthly reflection at this time.";
     if (error instanceof SyntaxError && response) {
        summary = "There was an issue processing the reflection from the AI. It might have been in an unexpected format. Please try again.";
        console.error("Gemini Response (Invalid JSON):", response.text);
    }
    return { summary, suggestions: [] };
  }
};

export const generateThematicReflection = async (tag: string, entries: Entry[]): Promise<string> => {
  if (!ai) return "AI functionality is disabled.";
  try {
    const model = 'gemini-2.5-flash';
    const relevantEntries = entries.filter(e => e.tags?.includes(tag));
    
    if (relevantEntries.length === 0) {
      return "There are no entries with this tag to reflect upon.";
    }

    const entriesText = relevantEntries
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(e => `- On ${getDisplayDate(e.timestamp)}: ${e.title ? `(${e.title}) ` : ''}${e.text}`)
      .join('\n');

    const prompt = `You are a thoughtful journal assistant. I will provide you with all my journal entries that share a common theme or tag. Please synthesize these into a "thematic reflection" that explores how my thoughts and feelings on this topic have evolved over time. Identify key moments, shifts in perspective, or unresolved questions related to this theme. Speak in a gentle, encouraging, first-person-plural tone. Keep it to 3-4 sentences.

The theme we are reflecting on is: "${tag}"

Here are our journal entries related to this theme:
${entriesText}

Your holistic thematic reflection on our journey with "${tag}":`;
    
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text;

  } catch (error) {
    console.error("Error generating thematic reflection:", error);
    return "I'm sorry, I couldn't generate a thematic reflection at this time.";
  }
};


/**
 * Processes a new journal entry to generate a title and tags.
 */
export const processEntry = async (entryText: string): Promise<{ title: string; tags: string[] }> => {
  if (!ai) return { title: 'Journal Entry', tags: [] };
  let response;
  try {
    const model = 'gemini-2.5-flash';

    const prompt = `Analyze the following journal entry. Based on its content, provide a concise, descriptive title (3-5 words) and 2-4 relevant tags.

Entry: "${entryText}"

Respond with only a JSON object.`;

    response = await ai.models.generateContent({
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
    if (error instanceof SyntaxError && response) {
        console.error("Gemini Response (Invalid JSON):", response.text);
    }
    return { title: 'Journal Entry', tags: [] };
  }
};


/**
 * Gets a response from the AI for the chat feature.
 * Now includes actionable suggestions.
 */
export const getChatResponse = async (history: Message[], entries: Entry[], intentions: Intention[]): Promise<{ text: string, suggestions: AISuggestion[] }> => {
    if (!ai) return { text: "AI functionality is disabled. Please configure the API key.", suggestions: [] };
    let response;
    try {
        const model = 'gemini-2.5-flash';

        const recentEntriesSummary = entries.slice(0, 15).map(e => 
            `- On ${new Date(e.timestamp).toLocaleDateString()}, I wrote: "${e.text}"`
        ).join('\n');
        
        const intentionsSummary = intentions.map(i => 
            `- My [${i.timeframe}] goal is: "${i.text}" (Status: ${i.status})`
        ).join('\n');

        const systemInstruction = `You are Mindstream, a friendly and insightful AI companion for journaling and self-reflection. Your goal is to help me explore my thoughts, feelings, and goals. You have access to my recent journal entries AND my list of intentions (to-dos/goals) to provide full context. Use all this information to answer my questions. Be empathetic, ask clarifying questions, and offer gentle guidance. Based on our conversation, if it feels natural, you can suggest 1-2 actionable 'daily' or 'weekly' intentions. Do not give medical advice. Keep your responses concise and conversational.

CONTEXT from my recent journal entries:
${recentEntriesSummary.length > 0 ? recentEntriesSummary : "No recent journal entries."}

CONTEXT from my intentions and goals:
${intentionsSummary.length > 0 ? intentionsSummary : "No intentions or goals set yet."}`;

        const userPrompt = history[history.length - 1].text;
        
        const chatHistory = history.slice(0, -1).map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }],
        }));
        
        response = await ai.models.generateContent({
            model,
            contents: [
                ...chatHistory,
                { role: 'user', parts: [{ text: userPrompt }] }
            ],
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        text: {
                            type: Type.STRING,
                            description: "Your main conversational response to the user."
                        },
                        suggestions: generateActionableSuggestionsSchema,
                    },
                    required: ["text", "suggestions"]
                }
            }
        });

        const result = JSON.parse(response.text.trim());
        return result;

    } catch (error) {
        console.error("Error in chat response:", error);
         if (error instanceof SyntaxError && response) {
            console.error("Gemini Response (Invalid JSON):", response.text);
        }
        return { text: "I'm sorry, something went wrong. I can't chat right now.", suggestions: [] };
    }
}

export const generatePersonalizedGreeting = async (entries: Entry[]): Promise<string> => {
    if (!ai || entries.length === 0) return "Hello! I'm Mindstream. How can I help you reflect today?";
    try {
        const model = 'gemini-2.5-flash';
        const lastEntry = entries[0];
        const prompt = `Based on my last journal entry, create a short, personalized, one-sentence greeting. Be warm and reference the general sentiment or topic of the entry.

Last entry: "${lastEntry.text}"

Your greeting:`;
        const response = await ai.models.generateContent({ model, contents: prompt });
        return response.text;
    } catch (error) {
        console.error("Error generating greeting:", error);
        return "Hello! What's on your mind today?";
    }
};

export const generateChatStarters = async (entries: Entry[], intentions: Intention[]): Promise<string[]> => {
    if (!ai) return [];
    let response;
    try {
        const model = 'gemini-2.5-flash';
        const entriesText = entries.slice(0, 5).map(e => `- Entry: ${e.text}`).join('\n');
        const intentionsText = intentions.filter(i => i.status === 'pending').slice(0, 5).map(i => `- Intention: ${i.text}`).join('\n');

        const prompt = `Based on my recent entries and pending intentions, generate 3 engaging, concise, and thought-provoking conversation starters. Frame them as questions I can ask you.

Recent Entries:
${entriesText.length > 0 ? entriesText : "None"}

Pending Intentions:
${intentionsText.length > 0 ? intentionsText : "None"}

Respond with a JSON array of 3 strings.`;
        
        response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });

        const result = JSON.parse(response.text.trim());
        return result;

    } catch (error) {
        console.error("Error generating chat starters:", error);
        if (error instanceof SyntaxError && response) {
            console.error("Gemini Response (Invalid JSON):", response.text);
        }
        return [
            "What was my biggest challenge last week?",
            "Let's review my progress on my goals.",
            "Tell me about a recurring theme in my journal."
        ];
    }
};
