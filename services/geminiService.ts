// FIX: Updated to use import.meta.env for consistency and added optional chaining to prevent crashes.
import { GoogleGenAI, Type } from "@google/genai";
import type { Entry, Message, Reflection, Intention, AISuggestion, Sentiment } from '../types';
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

/**
 * Performs a simple, low-cost API call to verify the API key is valid and functional.
 * Throws an error if the API call fails.
 */
export const verifyApiKey = async (): Promise<boolean> => {
  if (!ai) throw new Error("AI client not initialized. API key may be missing.");
  // This is a simple, fast, and low-token request to verify the key.
  await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: 'Hi' });
  return true;
};

/**
 * A robust JSON parser that handles markdown-wrapped JSON from Gemini.
 */
const parseGeminiJson = <T>(jsonString: string): T => {
    let cleanJsonString = jsonString.trim();
    // A common failure mode is the LLM wrapping the JSON in markdown code blocks.
    const match = cleanJsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      cleanJsonString = match[1];
    }
    return JSON.parse(cleanJsonString);
};

const generateActionableSuggestionsSchema = {
    type: Type.ARRAY,
    description: "A list of 1-2 concise, actionable suggestions based on the reflection, framed as intentions. Keep each suggestion text under 10 words and frame it as a direct, actionable command.",
    items: {
        type: Type.OBJECT,
        properties: {
            text: {
                type: Type.STRING,
                description: "The task or goal to be achieved (under 10 words)."
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
  if (!ai) throw new Error("AI functionality is disabled. Please configure the API key.");
  
  const model = 'gemini-2.5-flash';

  const entriesText = entries.map(e => `- ${new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}: ${e.text}`).join('\n');
  const intentionsText = intentions.map(i => `- [${i.status === 'completed' ? 'x' : ' '}] ${i.text}`).join('\n');

  const prompt = `You are a thoughtful and empathetic journal assistant. I will provide you with my journal entries and my intentions (to-dos) from today. Please write a short, insightful reflection (2-3 sentences) that analyzes how my feelings and actions (from the entries) aligned with my goals (from the intentions). Speak in a gentle, encouraging, and first-person-plural tone (e.g., "It seems like we made great progress...", "Today, we explored themes of..."). Based on your analysis, also provide 1-2 concise, actionable suggestions for a new 'daily' or 'weekly' intention. Keep each suggestion under 10 words.

Here were our intentions for today:
${intentionsText.length > 0 ? intentionsText : "No specific intentions were set."}

Here are today's journal entries:
${entriesText}

Respond with a JSON object.`;

  const response = await ai.models.generateContent({
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

  const result = parseGeminiJson<{ summary: string; suggestions: AISuggestion[] }>(response.text);
  return result;
};

/**
 * FOR DEBUGGING: Calls the reflection API but returns the raw, unparsed response or error.
 */
export const getRawReflectionForDebug = async (entries: Entry[], intentions: Intention[]): Promise<string> => {
  try {
    if (!ai) return "AI client not initialized. Check if VITE_API_KEY is set.";
    
    // We use the same logic as the real function to ensure the test is valid.
    const model = 'gemini-2.5-flash';
    const entriesText = entries.map(e => `- ${new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}: ${e.text}`).join('\n');
    const intentionsText = intentions.map(i => `- [${i.status === 'completed' ? 'x' : ' '}] ${i.text}`).join('\n');
    const prompt = `You are a thoughtful and empathetic journal assistant. I will provide you with my journal entries and my intentions (to-dos) from today. Please write a short, insightful reflection (2-3 sentences) that analyzes how my feelings and actions (from the entries) aligned with my goals (from the intentions). Speak in a gentle, encouraging, and first-person-plural tone (e.g., "It seems like we made great progress...", "Today, we explored themes of..."). Based on your analysis, also provide 1-2 actionable suggestions for a new 'daily' or 'weekly' intention.

Here were our intentions for today:
${intentionsText.length > 0 ? intentionsText : "No specific intentions were set."}

Here are today's journal entries:
${entriesText.length > 0 ? entriesText : "No journal entries were made."}

Respond with a JSON object.`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
          responseMimeType: "application/json",
          responseSchema: {
              type: Type.OBJECT,
              properties: {
                  summary: { type: Type.STRING },
                  suggestions: generateActionableSuggestionsSchema
              },
              required: ['summary', 'suggestions']
          }
      }
    });

    return `SUCCESS! Raw AI Response:\n\n---\n${response.text}\n---`;
  } catch (error: any) {
    console.error("DEBUG CAPTURED ERROR:", error);
    let errorMessage = `ERROR! The API call failed.\n\n---\n`;
    errorMessage += `Error Type: ${error.name}\n`;
    errorMessage += `Error Message: ${error.message}\n`;
    if (error.stack) {
      errorMessage += `Stack Trace:\n${error.stack}\n`;
    }
    errorMessage += '---\n\nThis usually means the API key is invalid or billing is not enabled for the project.';
    return errorMessage;
  }
};


/**
 * Generates a weekly summary reflection based on a week's journal entries.
 */
export const generateWeeklyReflection = async (entries: Entry[], intentions: Intention[]): Promise<{ summary: string; suggestions: AISuggestion[] }> => {
  if (!ai) throw new Error("AI functionality is disabled.");
  
  const model = 'gemini-2.5-flash';
  
  const entriesText = entries
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map(e => `- ${getDisplayDate(e.timestamp)} at ${new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}: ${e.text}`)
    .join('\n');

  const intentionsText = intentions.map(i => `- [${i.status === 'completed' ? 'x' : ' '}] ${i.text} (${i.timeframe})`).join('\n');

  const prompt = `You are a thoughtful and empathetic journal assistant. I will provide you with my journal entries and my intentions/goals from an entire week. Please synthesize these into a higher-level weekly summary (3-4 sentences). Identify broader patterns, recurring themes, and overall mood, paying special attention to how our actions and feelings (from entries) aligned with our goals (from intentions). Based on this, also provide 1-2 concise, actionable 'weekly' intentions (under 10 words each). Speak in a gentle, encouraging, and first-person-plural tone.

Here are our intentions for context:
${intentionsText.length > 0 ? intentionsText : "No specific intentions were set for this period."}

Here are our journal entries from this week:
${entriesText}

Respond with a JSON object.`;

  const response = await ai.models.generateContent({
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
  
  const result = parseGeminiJson<{ summary: string; suggestions: AISuggestion[] }>(response.text);
  return result;
};


/**
 * Generates a monthly summary reflection based on a month's journal entries.
 */
export const generateMonthlyReflection = async (entries: Entry[], intentions: Intention[]): Promise<{ summary: string; suggestions: AISuggestion[] }> => {
  if (!ai) throw new Error("AI functionality is disabled.");
  
  const model = 'gemini-2.5-flash';
  
  const entriesText = entries
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map(e => `- On ${getDisplayDate(e.timestamp)}: ${e.text}`)
    .join('\n');

  const intentionsText = intentions.map(i => `- [${i.status === 'completed' ? 'x' : ' '}] ${i.text} (${i.timeframe})`).join('\n');

  const prompt = `You are a thoughtful and empathetic journal assistant. I will provide you with my journal entries and intentions from an entire month. Please synthesize these into a higher-level monthly summary (4-5 sentences). Analyze how our actions and feelings related to our goals. Identify major themes, significant shifts in mood or thinking, challenges we faced, and milestones we achieved over the month. Based on this, also provide 1-2 concise, actionable 'weekly' or 'monthly' intentions (under 10 words each). Speak in a gentle, encouraging, and first-person-plural tone.

Here are our intentions for context:
${intentionsText.length > 0 ? intentionsText : "No specific intentions were set for this period."}

Here are our journal entries from this month:
${entriesText}

Respond with a JSON object.`;

  const response = await ai.models.generateContent({
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
  
  const result = parseGeminiJson<{ summary: string; suggestions: AISuggestion[] }>(response.text);
  return result;
};

export const generateThematicReflection = async (tag: string, entries: Entry[]): Promise<string> => {
  if (!ai) throw new Error("AI functionality is disabled.");
  
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
};


/**
 * Processes a new journal entry to generate a title, tags, and sentiment.
 */
export const processEntry = async (entryText: string): Promise<{ title: string; tags: string[]; sentiment: Sentiment; emoji: string; }> => {
  if (!ai) throw new Error("AI client not initialized.");
  
  const model = 'gemini-2.5-flash';

  const prompt = `Analyze the following journal entry. Based on its content, provide a concise, descriptive title, 2-4 relevant tags, determine its overall sentiment ('positive', 'negative', or 'neutral'), and add a single, appropriate Unicode emoji that best represents the entry's core emotion or content.
  
CRITICAL RULE: For very short entries (under 10 words), the title can be just 1-2 words, or a slightly rephrased, capitalized version of the entry itself. For all other entries, the title should be 3-5 words.

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
            description: "A short, descriptive title for the journal entry."
          },
          tags: {
            type: Type.ARRAY,
            description: "An array of 2-4 single-word or two-word tags that categorize the entry.",
            items: {
              type: Type.STRING
            }
          },
          sentiment: {
            type: Type.STRING,
            description: "The overall sentiment of the entry: 'positive', 'negative', or 'neutral'."
          },
          emoji: {
            type: Type.STRING,
            description: "A single Unicode emoji that best represents the entry's emotion or content."
          }
        },
        required: ['title', 'tags', 'sentiment', 'emoji']
      }
    }
  });
  
  const result = parseGeminiJson<{ title: string; tags: string[]; sentiment: Sentiment; emoji: string }>(response.text);
  return result;
};


/**
 * Gets a streaming response from the AI for the chat feature.
 */
export const getChatResponseStream = async (history: Message[], entries: Entry[], intentions: Intention[]) => {
    if (!ai) throw new Error("AI functionality is disabled.");

    const model = 'gemini-2.5-flash';

    const recentEntriesSummary = entries.slice(0, 15).map(e => 
        `- On ${new Date(e.timestamp).toLocaleDateString()}, I wrote: "${e.text}"`
    ).join('\n');
    
    const intentionsSummary = intentions.map(i => 
        `- My [${i.timeframe}] goal is: "${i.text}" (Status: ${i.status})`
    ).join('\n');

    const systemInstruction = `You are Mindstream, a friendly and insightful AI companion for journaling and self-reflection. Your goal is to help me explore my thoughts, feelings, and goals. You have access to my recent journal entries AND my list of intentions (to-dos/goals) to provide full context. Use all this information to answer my questions. Be empathetic, ask clarifying questions, and offer gentle guidance. Do not give medical advice. Keep your responses concise and conversational.

CONTEXT from my recent journal entries:
${recentEntriesSummary.length > 0 ? recentEntriesSummary : "No recent journal entries."}

CONTEXT from my intentions and goals:
${intentionsSummary.length > 0 ? intentionsSummary : "No intentions or goals set yet."}`;

    const userPrompt = history[history.length - 1].text;
    
    const chatHistory = history.slice(0, -1).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
    }));
    
    const streamResult = await ai.models.generateContentStream({
        model,
        contents: [
            ...chatHistory,
            { role: 'user', parts: [{ text: userPrompt }] }
        ],
        config: {
            systemInstruction,
        }
    });
    
    return streamResult;
}

export const generatePersonalizedGreeting = async (entries: Entry[]): Promise<string> => {
    if (!ai) throw new Error("AI is not configured.");
    if (entries.length === 0) return "Hello! I'm Mindstream. How can I help you reflect today?";
    
    const model = 'gemini-2.5-flash';
    const lastEntry = entries[0];
    const prompt = `Based on my last journal entry, create a short, warm, one-sentence greeting that acknowledges the entry's topic without being too specific.

Last entry: "${lastEntry.text}"

Your greeting:`;
    const response = await ai.models.generateContent({ model, contents: prompt });
    return response.text;
};

export const generateChatStarters = async (entries: Entry[], intentions: Intention[]): Promise<{ starters: string[] }> => {
    if (!ai) throw new Error("AI is not configured.");
    
    const model = 'gemini-2.5-flash';
    const entriesText = entries.slice(0, 5).map(e => `- Entry (Sentiment: ${e.sentiment || 'neutral'}): ${e.text}`).join('\n');
    const intentionsText = intentions.filter(i => i.status === 'pending').slice(0, 5).map(i => `- Intention: ${i.text}`).join('\n');

    const prompt = `You are an AI assistant helping a user start a conversation with their journal. Your goal is to provide helpful, gentle, and useful starting points.
    
Based on my recent entries and pending intentions, generate 3 conversation starters. They should be framed as questions I can ask you, the AI.
    
Follow these rules:
1.  Generate ONE starter that is gently contextual, reflecting a high-level theme from the recent entries (e.g., "Review my thoughts on the 'new project'").
2.  Generate TWO starters that are high-utility and not directly tied to a specific entry (e.g., "What are my pending intentions?" or "Summarize my main goals.").
3.  Keep them short and clear.

Recent Entries:
${entriesText.length > 0 ? entriesText : "None"}

Pending Intentions:
${intentionsText.length > 0 ? intentionsText : "None"}

Respond with a JSON object containing a 'starters' array with exactly 3 strings.`;
    
    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    starters: {
                        type: Type.ARRAY,
                        description: "An array of exactly 3 string conversation starters.",
                        items: { type: Type.STRING }
                    }
                },
                required: ['starters']
            }
        }
    });

    const result = parseGeminiJson<{ starters: string[] }>(response.text);
    return result;
};
