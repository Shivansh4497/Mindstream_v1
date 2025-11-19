
// FIX: Updated to use import.meta.env for consistency and added optional chaining to prevent crashes.
import { GoogleGenAI, Type } from "@google/genai";
import type { Entry, Message, Reflection, Intention, AISuggestion, GranularSentiment, Habit, HabitLog, HabitCategory, InstantInsight, EntrySuggestion } from '../types';
import { getDisplayDate } from "../utils/date";
import type { UserContext } from './dbService'; // Import from dbService to use the new interface

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

// --- VERTICAL REDUNDANCY HELPERS ---

const PRIMARY_MODEL = 'gemini-2.5-flash';
const BACKUP_MODEL = 'gemini-1.5-flash';

/**
 * Executes a Gemini API call with automatic fallback to a backup model if the primary fails.
 * @param operation A function that takes a model name and returns a Promise (the API call).
 */
async function callWithFallback<T>(operation: (model: string) => Promise<T>): Promise<T> {
    try {
        return await operation(PRIMARY_MODEL);
    } catch (error: any) {
        const isRetryable = error.status === 503 || error.status === 429 || error.message?.includes('fetch failed');
        
        if (isRetryable || error.message) {
            console.warn(`Primary model (${PRIMARY_MODEL}) failed. Switching to backup (${BACKUP_MODEL}). Error:`, error.message);
            try {
                return await operation(BACKUP_MODEL);
            } catch (backupError: any) {
                console.error(`Backup model (${BACKUP_MODEL}) also failed.`, backupError);
                throw backupError; // Throw original error or backup error? Throw backup to bubble up failure.
            }
        }
        throw error;
    }
}

// -----------------------------------

/**
 * Performs a simple, low-cost API call to verify the API key is valid and functional.
 * Throws an error if the API call fails.
 */
export const verifyApiKey = async (): Promise<boolean> => {
  if (!ai) throw new Error("AI client not initialized. API key may be missing.");
  // This is a simple, fast, and low-token request to verify the key.
  // We use the primary model directly here as it's a connectivity check.
  await ai.models.generateContent({ model: PRIMARY_MODEL, contents: 'Hi' });
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

export const generateInstantInsight = async (text: string, sentiment: string, lifeArea: string, trigger: string): Promise<InstantInsight> => {
    if (!ai) throw new Error("AI functionality is disabled.");

    const prompt = `You are an expert coach and a wise, empathetic friend. 
    
    The user is in the middle of an onboarding session for a reflection app.
    They have identified the following context about their state:
    - Emotion: "${sentiment}"
    - Life Domain: "${lifeArea}"
    - Specific Trigger: "${trigger}"
    
    They elaborated with this text: "${text}".
    
    Your task is to provide an "Instant Insight" that creates an "Aha!" moment.
    
    Guidelines:
    1. VALIDATE: Briefly acknowledge their feeling to make them feel seen.
    2. PERSPECTIVE SHIFT: Do NOT simply summarize. Use the "Trigger" (${trigger}) to offer a reframing, a comforting truth, or a gentle challenge.
       - Example: If they selected "Imposter Syndrome", remind them that doubt often signals growth.
       - Example: If "Burnout", remind them that rest is productive.
    3. LENGTH: Keep the insight concise (under 3 sentences).
    
    Also, generate a gentle "followUpQuestion" that you would ask to help them dig deeper into this specific trigger in a chat session.
    
    Respond with a JSON object containing "insight" and "followUpQuestion".`;

    return callWithFallback(async (model) => {
        // @ts-ignore - ai is checked above
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        insight: { type: Type.STRING },
                        followUpQuestion: { type: Type.STRING }
                    },
                    required: ['insight', 'followUpQuestion']
                }
            }
        });
        return parseGeminiJson<InstantInsight>(response.text);
    });
};

/**
 * Generates a summary reflection based on a day's entries and intentions.
 */
export const generateReflection = async (entries: Entry[], intentions: Intention[], habits?: Habit[], habitLogs?: HabitLog[]): Promise<{ summary: string; suggestions: AISuggestion[] }> => {
  if (!ai) throw new Error("AI functionality is disabled. Please configure the API key.");

  const entriesText = entries.map(e => `- Feeling ${e.primary_sentiment}, I wrote: ${e.text}`).join('\n');
  const intentionsText = intentions.map(i => `- [${i.status === 'completed' ? 'x' : ' '}] ${i.text}`).join('\n');
  
  // Generate Habit Context
  let habitsText = "";
  if (habits && habitLogs) {
    const completedHabitIds = new Set(habitLogs.map(l => l.habit_id));
    habitsText = habits.map(h => {
        const isDone = completedHabitIds.has(h.id);
        return `- [${isDone ? 'x' : ' '}] Habit (${h.category}): ${h.name} (Streak: ${h.current_streak})`;
    }).join('\n');
  }

  const prompt = `You are a thoughtful and empathetic journal assistant. I will provide you with my journal entries (including their primary emotion), my intentions (to-dos), and my habit tracker status from today. Please write a short, insightful reflection (2-3 sentences) that analyzes how my feelings and actions aligned with my goals and habits. Speak in a gentle, encouraging, and first-person-plural tone (e.g., "It seems like we made great progress...", "The prominent feelings today were Proud and Overwhelmed..."). Based on your analysis, also provide 1-2 concise, actionable suggestions for a new 'daily' or 'weekly' intention. Keep each suggestion under 10 words.

Here were our intentions for today:
${intentionsText.length > 0 ? intentionsText : "No specific intentions were set."}

Here is our habit tracker status for today:
${habitsText.length > 0 ? habitsText : "No habits tracked."}

Here are today's journal entries:
${entriesText}

Respond with a JSON object.`;

  return callWithFallback(async (model) => {
    // @ts-ignore
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
    return parseGeminiJson<{ summary: string; suggestions: AISuggestion[] }>(response.text);
  });
};

/**
 * FOR DEBUGGING: Calls the reflection API but returns the raw, unparsed response or error.
 */
export const getRawReflectionForDebug = async (entries: Entry[], intentions: Intention[]): Promise<string> => {
  try {
    if (!ai) return "AI client not initialized. Check if VITE_API_KEY is set.";
    
    // We use the same logic as the real function to ensure the test is valid.
    const entriesText = entries.map(e => `- ${new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}: ${e.text}`).join('\n');
    const intentionsText = intentions.map(i => `- [${i.status === 'completed' ? 'x' : ' '}] ${i.text}`).join('\n');
    const prompt = `You are a thoughtful and empathetic journal assistant. I will provide you with my journal entries and my intentions (to-dos) from today. Please write a short, insightful reflection (2-3 sentences) that analyzes how my feelings and actions (from the entries) aligned with my goals (from the intentions). Speak in a gentle, encouraging, and first-person-plural tone (e.g., "It seems like we made great progress...", "Today, we explored themes of..."). Based on your analysis, also provide 1-2 actionable suggestions for a new 'daily' or 'weekly' intention.

Here were our intentions for today:
${intentionsText.length > 0 ? intentionsText : "No specific intentions were set."}

Here are today's journal entries:
${entriesText.length > 0 ? entriesText : "No journal entries were made."}

Respond with a JSON object.`;

    return await callWithFallback(async (model) => {
        // @ts-ignore
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
    });

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
  
  const entriesText = entries
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map(e => `- On ${getDisplayDate(e.timestamp)}, feeling ${e.primary_sentiment}: ${e.text}`)
    .join('\n');

  const intentionsText = intentions.map(i => `- [${i.status === 'completed' ? 'x' : ' '}] ${i.text} (${i.timeframe})`).join('\n');

  const prompt = `You are a thoughtful and empathetic journal assistant. I will provide you with my journal entries and my intentions/goals from an entire week. Please synthesize these into a higher-level weekly summary (3-4 sentences). Identify broader patterns, recurring themes, and overall mood, paying special attention to how our actions and feelings (from entries) aligned with our goals (from intentions). Based on this, also provide 1-2 concise, actionable 'weekly' intentions (under 10 words each). Speak in a gentle, encouraging, and first-person-plural tone.

Here are our intentions for context:
${intentionsText.length > 0 ? intentionsText : "No specific intentions were set for this period."}

Here are our journal entries from this week:
${entriesText}

Respond with a JSON object.`;

  return callWithFallback(async (model) => {
      // @ts-ignore
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
    return parseGeminiJson<{ summary: string; suggestions: AISuggestion[] }>(response.text);
  });
};


/**
 * Generates a monthly summary reflection based on a month's journal entries.
 */
export const generateMonthlyReflection = async (entries: Entry[], intentions: Intention[]): Promise<{ summary: string; suggestions: AISuggestion[] }> => {
  if (!ai) throw new Error("AI functionality is disabled.");
  
  const entriesText = entries
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map(e => `- On ${getDisplayDate(e.timestamp)}, feeling ${e.primary_sentiment}: ${e.text}`)
    .join('\n');

  const intentionsText = intentions.map(i => `- [${i.status === 'completed' ? 'x' : ' '}] ${i.text} (${i.timeframe})`).join('\n');

  const prompt = `You are a thoughtful and empathetic journal assistant. I will provide you with my journal entries and intentions from an entire month. Please synthesize these into a higher-level monthly summary (4-5 sentences). Analyze how our actions and feelings related to our goals. Identify major themes, significant shifts in mood or thinking, challenges we faced, and milestones we achieved over the month. Based on this, also provide 1-2 concise, actionable 'weekly' or 'monthly' intentions (under 10 words each). Speak in a gentle, encouraging, and first-person-plural tone.

Here are our intentions for context:
${intentionsText.length > 0 ? intentionsText : "No specific intentions were set for this period."}

Here are our journal entries from this month:
${entriesText}

Respond with a JSON object.`;

  return callWithFallback(async (model) => {
      // @ts-ignore
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
    return parseGeminiJson<{ summary: string; suggestions: AISuggestion[] }>(response.text);
  });
};

export const generateThematicReflection = async (tag: string, entries: Entry[]): Promise<string> => {
  if (!ai) throw new Error("AI functionality is disabled.");
  
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
  
  return callWithFallback(async (model) => {
      // @ts-ignore
    const response = await ai.models.generateContent({
        model,
        contents: prompt,
    });
    return response.text;
  });
};

const GRANULAR_SENTIMENTS: GranularSentiment[] = [
    'Joyful', 'Grateful', 'Proud', 'Hopeful', 'Content',
    'Anxious', 'Frustrated', 'Sad', 'Overwhelmed', 'Confused',
    'Reflective', 'Inquisitive', 'Observational'
];

/**
 * Processes a new journal entry to generate a title, tags, and granular sentiments.
 */
export const processEntry = async (entryText: string): Promise<Omit<Entry, 'id' | 'user_id' | 'timestamp' | 'text'>> => {
  if (!ai) throw new Error("AI client not initialized.");
  
  const prompt = `Analyze the following journal entry. Based on its content:
1.  Provide a concise, descriptive title (3-5 words, unless the entry is very short).
2.  Generate 2-4 relevant tags.
3.  Choose a 'primary_sentiment' from this specific list: [${GRANULAR_SENTIMENTS.join(', ')}].
4.  If the emotion is complex, add an optional 'secondary_sentiment' from the same list.
5.  Add a single, appropriate Unicode emoji.
  
CRITICAL RULE: For very short entries (under 10 words), the title can be just 1-2 words, or a slightly rephrased, capitalized version of the entry itself.

Entry: "${entryText}"

Respond with only a JSON object.`;

  return callWithFallback(async (model) => {
      // @ts-ignore
    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
            title: { type: Type.STRING },
            tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            },
            primary_sentiment: { type: Type.STRING },
            secondary_sentiment: { type: Type.STRING },
            emoji: { type: Type.STRING }
            },
            required: ['title', 'tags', 'primary_sentiment', 'emoji']
        }
        }
    });
    return parseGeminiJson<Omit<Entry, 'id' | 'user_id' | 'timestamp' | 'text'>>(response.text);
  });
};

/**
 * Asynchronously analyzes an entry to offer specific, actionable next steps (The Silent Observer).
 */
export const generateEntrySuggestions = async (entryText: string): Promise<EntrySuggestion[] | null> => {
    if (!ai) return null;

    const prompt = `Analyze the following journal entry. Does the user express a clear need or desire that could be turned into a Habit, an Intention (Goal), or a deeper Reflection (Chat)?
    
    Entry: "${entryText}"
    
    Rules:
    1. Be Strict: Only suggest if the user clearly implies a desire to change, achieve, or explore. If they are just logging/venting, return null.
    2. Suggest ONLY 1 or 2 items maximum.
    3. Output format: A JSON array of objects.
    
    Types:
    - 'habit': Use if they mention a repetitive action they want to start/stop (e.g., "I need to run more"). Data: { frequency: 'daily' | 'weekly' }.
    - 'intention': Use for one-off goals (e.g., "I want to finish that report"). Data: { timeframe: 'daily' | 'weekly' | 'monthly' }.
    - 'reflection': Use if they seem confused, stuck, or emotional and need to talk it out. Data: { prompt: "Specific question to start chat" }.
    
    Output Schema: 
    Array<{ type: 'habit'|'intention'|'reflection', label: string, data: any }> or null.
    `;

    try {
        return await callWithFallback(async (model) => {
            // @ts-ignore
            const response = await ai.models.generateContent({
                model, // Use backup model (1.5-flash) preferably for cost/speed via callWithFallback logic if setup
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                type: { type: Type.STRING, enum: ['habit', 'intention', 'reflection'] },
                                label: { type: Type.STRING, description: "Short button label e.g. 'Track Running' or 'Discuss Anxiety'" },
                                data: { type: Type.OBJECT, description: "Context object" }
                            },
                            required: ['type', 'label', 'data']
                        }
                    }
                }
            });
            const result = parseGeminiJson<EntrySuggestion[]>(response.text);
            return result.length > 0 ? result : null;
        });
    } catch (e) {
        console.warn("Silent observer failed (non-critical):", e);
        return null;
    }
}


export const analyzeHabit = async (habitName: string): Promise<{ emoji: string, category: HabitCategory }> => {
    if (!ai) return { emoji: "⚡️", category: "System" }; 
    const prompt = `Analyze the habit: "${habitName}".
1. Pick a single Unicode emoji that best represents it.
2. Categorize it into exactly one of these categories: Health, Growth, Career, Finance, Connection, System.
   - Health: Physical, mental, sleep, nutrition.
   - Growth: Learning, hobbies, skills, reading.
   - Career: Work, deep work, networking.
   - Finance: Budgeting, saving, investing.
   - Connection: Relationships, family, social.
   - System: Chores, admin, organization, planning.

Respond with JSON.`;
    
    try {
        return await callWithFallback(async (model) => {
            // @ts-ignore
            const response = await ai.models.generateContent({
                model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: { 
                            emoji: { type: Type.STRING },
                            category: { type: Type.STRING, enum: ['Health', 'Growth', 'Career', 'Finance', 'Connection', 'System'] }
                        },
                        required: ['emoji', 'category']
                    }
                }
            });
            return parseGeminiJson<{emoji: string, category: HabitCategory}>(response.text);
        });
    } catch (e) {
        console.error("Error analyzing habit:", e);
        return { emoji: "⚡️", category: "System" };
    }
};

/**
 * Converts the UserContext object into a natural language system prompt payload.
 */
const buildSystemContext = (context: UserContext): string => {
    const recentEntriesSummary = context.recentEntries.map(e => 
        `- On ${new Date(e.timestamp).toLocaleDateString()}, feeling ${e.primary_sentiment}, I wrote: "${e.text}"`
    ).join('\n');
    
    const intentionsSummary = context.pendingIntentions.map(i => 
        `- My [${i.timeframe}] goal is: "${i.text}"`
    ).join('\n');

    const habitsSummary = context.activeHabits.map(h =>
        `- Habit: ${h.name} (${h.category}, Streak: ${h.current_streak})`
    ).join('\n');

    let contextString = "";
    
    if (recentEntriesSummary) {
        contextString += `CONTEXT from my recent journal entries:\n${recentEntriesSummary}\n\n`;
    } else {
        contextString += `CONTEXT: No recent journal entries.\n\n`;
    }

    if (intentionsSummary) {
        contextString += `CONTEXT from my active intentions/goals:\n${intentionsSummary}\n\n`;
    } else {
        contextString += `CONTEXT: No active goals set.\n\n`;
    }

    if (habitsSummary) {
        contextString += `CONTEXT from my active habits:\n${habitsSummary}\n\n`;
    } else {
        contextString += `CONTEXT: No habits being tracked.\n\n`;
    }

    if (context.latestReflection) {
        contextString += `CONTEXT: My latest reflection was: "${context.latestReflection.summary}"`;
    }

    return contextString;
}

/**
 * Gets a streaming response from the AI for the chat feature.
 * Updated to accept the unified UserContext object.
 */
export const getChatResponseStream = async (history: Message[], context: UserContext) => {
    if (!ai) throw new Error("AI functionality is disabled.");

    const contextPrompt = buildSystemContext(context);

    const systemInstruction = `You are Mindstream, a friendly and insightful AI companion for journaling and self-reflection. Your goal is to help me explore my thoughts, feelings, and goals. 
    
You have access to my full context:
${contextPrompt}

Use this information to answer my questions contextually. 
- If I talk about stress, check if I have habits or goals related to that.
- If I ask about my progress, reference my habit streaks and reflection summaries.
- Be empathetic, ask clarifying questions, and offer gentle guidance. 
- Do not give medical advice. 
- Keep your responses concise and conversational.`;

    const userPrompt = history[history.length - 1].text;
    
    const chatHistory = history.slice(0, -1).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
    }));
    
    try {
        // @ts-ignore
        const streamResult = await ai.models.generateContentStream({
            model: PRIMARY_MODEL,
            contents: [
                ...chatHistory,
                { role: 'user', parts: [{ text: userPrompt }] }
            ],
            config: {
                systemInstruction,
            }
        });
        return streamResult;
    } catch (primaryError: any) {
        console.warn(`Primary model (${PRIMARY_MODEL}) failed for chat stream. Trying backup (${BACKUP_MODEL}).`, primaryError);
        
        // @ts-ignore
        const streamResult = await ai.models.generateContentStream({
            model: BACKUP_MODEL,
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
}

export const generatePersonalizedGreeting = async (entries: Entry[]): Promise<string> => {
    if (!ai) throw new Error("AI is not configured.");
    if (entries.length === 0) return "Hello! I'm Mindstream. How can I help you reflect today?";
    
    const lastEntry = entries[0];
    const prompt = `Based on my last journal entry, create a short, warm, one-sentence greeting that acknowledges the entry's topic without being too specific.

Last entry: "Feeling ${lastEntry.primary_sentiment}, I wrote: ${lastEntry.text}"

Your greeting:`;

    return callWithFallback(async (model) => {
        // @ts-ignore
        const response = await ai.models.generateContent({ model, contents: prompt });
        return response.text;
    });
};

export const generateChatStarters = async (entries: Entry[], intentions: Intention[]): Promise<{ starters: string[] }> => {
    if (!ai) throw new Error("AI is not configured.");
    
    const entriesText = entries.slice(0, 5).map(e => `- Entry (Feeling: ${e.primary_sentiment}): ${e.text}`).join('\n');
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

Respond with a JSON object.`;
    
    return callWithFallback(async (model) => {
        // @ts-ignore
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
        return parseGeminiJson<{ starters: string[] }>(response.text);
    });
};
