import { supabase } from './supabaseClient';

// Edge Function proxy for all AI calls - keeps API key secure on server
const AI_PROXY_URL = 'ai-proxy';

export type AIProxyAction =
    | 'process-entry'
    | 'suggestions'
    | 'instant-insight'
    | 'analyze-habit'
    | 'analyze-intention'
    | 'extract-keywords'
    | 'chat'
    | 'daily-reflection'
    | 'weekly-reflection'
    | 'monthly-reflection'
    | 'chat-summary'
    | 'evaluate-response'
    | 'classify-intent'
    | 'classify-behavior'
    | 'build-ai-profile'
    | 'extract-behavior'
    | 'summarise-session';

export interface AIProxyMeta {
    provider?: string;
    latency_ms?: number;
    attempted?: string[];
    tokens_in?: number;
    tokens_out?: number;
    rag_matches?: any[];
    query_intent?: {
        intent: string;
        hasTemporalIntent: boolean;
        temporalExpression: string | null;
        topicKeywords: string[];
        confidence: number;
        reasoning: string;
        startDate: string | null;
        endDate: string | null;
    };
    retrieval_strategy?: string;
    classifier_latency_ms?: number;
    // Granular timing captured client-side
    embedding_latency_ms?: number;
    search_latency_ms?: number;
    inference_ms?: number;
    parse_ms?: number;
    // Per-layer token counts (instrumented via estimateTokens)
    profile_tokens?: number;
    recent_tokens?: number;
    retrieved_tokens?: number;
    history_tokens?: number;
    user_message_tokens?: number;
    // For quality evaluation
    userMessage?: string;
    contextSnippet?: string;
    structuredContext?: string;
    profileContext?: string;
    recentContext?: string;
    historyContext?: string;
    // Context Inventory for RAG component
    context_inventory?: {
        recentEntriesCount: number;
        semanticMatchCount: number;
        habits: Array<{ name: string; category: string; streak: number }>;
        goals: Array<{ text: string; category: string }>;
        hasReflection: boolean;
    };
}

interface AIProxyResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    _meta?: AIProxyMeta;
}

// Track the last AI call's metadata for GlassBox consumption
let _lastAIMeta: AIProxyMeta | null = null;
export function getLastAIMeta(): AIProxyMeta | null {
    return _lastAIMeta;
}

export function enrichLastAIMeta(partial: Partial<AIProxyMeta>) {
    if (_lastAIMeta) {
        _lastAIMeta = { ..._lastAIMeta, ...partial };
    } else {
        _lastAIMeta = { ...partial };
    }
}

// Custom error for demo limit reached
export class DemoLimitError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DemoLimitError';
    }
}

/**
 * Call the AI proxy Edge Function
 * Automatically includes user authentication
 * Demo users go through the same pipeline — limits are enforced server-side
 */
export async function callAIProxy<T>(
    action: AIProxyAction,
    payload: Record<string, any>,
): Promise<T> {

    if (!supabase) {
        throw new Error('Supabase client not initialized');
    }

    const { data, error } = await supabase.functions.invoke<AIProxyResponse<T>>(AI_PROXY_URL, {
        body: { action, payload }
    });

    if (error) {
        console.error('[AI Proxy] Function error:', error);
        throw new Error(error.message || 'AI service unavailable');
    }

    // Handle demo limit reached
    if (data?.error === 'DEMO_LIMIT_REACHED') {
        throw new DemoLimitError(data.message || 'Demo AI calls exhausted');
    }

    if (!data?.success) {
        throw new Error(data?.error || 'AI request failed');
    }

    // Capture metadata for GlassBox
    if (data._meta) {
        if ((data._meta as any).fallback_events) {
            for (const event of (data._meta as any).fallback_events) {
                console.warn('[PROVIDER_FALLBACK]', event.from, '->', event.to, event.reason);
            }
        }
        _lastAIMeta = _lastAIMeta ? { ..._lastAIMeta, ...data._meta } : data._meta;
    }

    return data.data as T;
}

/**
 * Verify AI service is available
 * Just checks if the Edge Function is reachable
 */
export const verifyApiKey = async (): Promise<boolean> => {
    // With Edge Function, we don't need to verify client-side API key
    // The function handles authentication (works for both regular and demo users)
    return true;
};

/**
 * Parse JSON from AI responses (kept for backward compatibility)
 */
export const parseGeminiJson = <T>(jsonString: string): T => {
    let clean = jsonString.trim();
    const match = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) clean = match[1];
    return JSON.parse(clean);
};

// Legacy exports for backward compatibility during migration
export const GEMINI_API_KEY_AVAILABLE = true; // Always available via Edge Function
export const getAiClient = () => null; // No longer needed

// Legacy callWithFallback - these services need to be migrated to use callAIProxy
// For now, this stub will cause them to throw/return fallback values
export async function callWithFallback<T>(operation: (model: string) => Promise<T>): Promise<T> {
    // Since getAiClient returns null, any service using this pattern will need migration
    // For now, we throw to make it clear these need updating
    throw new Error('callWithFallback is deprecated. Please migrate to callAIProxy.');
}

