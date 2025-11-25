import { GoogleGenAI } from "@google/genai";

// Safe access to environment variables to prevent runtime crashes in browser environments
const getApiKey = (): string => {
    try {
        // Preferred: Standard Node/Process env (Required by guidelines)
        if (typeof process !== 'undefined' && process.env?.API_KEY) {
            return process.env.API_KEY;
        }
    } catch (e) {
        // Ignore reference errors if process is not defined
    }
    
    try {
        // Fallback: Standard Vite env
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) {
            // @ts-ignore
            return import.meta.env.VITE_GEMINI_API_KEY;
        }
    } catch (e) {}

    return '';
};

let ai: GoogleGenAI | null = null;
const apiKey = getApiKey();

if (apiKey) {
    try {
        ai = new GoogleGenAI({ apiKey });
    } catch (e) {
        console.error("Error initializing Gemini client.", e);
    }
}

export const GEMINI_API_KEY_AVAILABLE = !!ai;
export const getAiClient = () => ai;

const PRIMARY_MODEL = 'gemini-2.5-flash';
const BACKUP_MODEL = 'gemini-1.5-flash';

export async function callWithFallback<T>(operation: (model: string) => Promise<T>): Promise<T> {
    try {
        return await operation(PRIMARY_MODEL);
    } catch (error: any) {
        if (error.status === 503 || error.status === 429 || error.message?.includes('fetch failed')) {
            console.warn(`Primary model failed. Switching to backup.`);
            return await operation(BACKUP_MODEL);
        }
        throw error;
    }
}

export const verifyApiKey = async (): Promise<boolean> => {
  if (!ai) throw new Error("AI client not initialized.");
  await ai.models.generateContent({ model: PRIMARY_MODEL, contents: 'Hi' });
  return true;
};

export const parseGeminiJson = <T>(jsonString: string): T => {
    let clean = jsonString.trim();
    const match = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) clean = match[1];
    return JSON.parse(clean);
};
