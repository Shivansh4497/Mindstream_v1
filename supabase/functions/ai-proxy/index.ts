import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { generateEmbedding } from './embeddingService.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const groqKey = Deno.env.get('GROQ_API_KEY');
const geminiKey = Deno.env.get('GEMINI_API_KEY');

// =============================================================================
// PROVIDER CONFIGURATION
// =============================================================================

// Groq models (primary - most capacity)
const GROQ_API_BASE = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL_PRIMARY = 'llama-3.3-70b-versatile';
const GROQ_MODEL_BACKUP = 'llama-3.1-8b-instant';

// Gemini models (fallback)
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODEL_PRIMARY = 'gemini-2.0-flash';
const GEMINI_MODEL_BACKUP = 'gemini-2.5-flash-lite';

// Startup logging
console.log('[AI Proxy] Initializing multi-provider system...');
console.log('[AI Proxy] GROQ_API_KEY present:', !!groqKey);
console.log('[AI Proxy] GEMINI_API_KEY present:', !!geminiKey);
console.log('[AI Proxy] Provider chain: Groq 70B -> Groq 8B -> Gemini Flash -> Gemini Lite -> Cached');

interface AIRequest {
    action: 'process-entry' | 'chat' | 'suggestions' | 'instant-insight' | 'analyze-habit' | 'analyze-intention' | 'extract-keywords' | 'daily-reflection' | 'weekly-reflection' | 'monthly-reflection' | 'chat-summary' | 'list-models' | 'evaluate-response' | 'build-ai-profile';
    payload: Record<string, any>;
}

// =============================================================================
// PROVIDER CALL FUNCTIONS
// =============================================================================

async function callGroqWithModel(model: string, prompt: string): Promise<string> {
    if (!groqKey) throw new Error('Groq API key not configured');

    console.log(`[AI Proxy] Calling Groq ${model}, prompt length: ${prompt.length}`);

    const response = await fetch(GROQ_API_BASE, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 2048,
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[AI Proxy] Groq ${model} error ${response.status}:`, errorText);
        throw new Error(`Groq API error: ${response.status}`);
    }

    const result = await response.json();
    if (!result.choices?.[0]?.message?.content) {
        throw new Error('No response from Groq');
    }

    return result.choices[0].message.content;
}

async function callGeminiWithModel(model: string, prompt: string): Promise<string> {
    if (!geminiKey) throw new Error('Gemini API key not configured');

    const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${geminiKey}`;
    console.log(`[AI Proxy] Calling Gemini ${model}, prompt length: ${prompt.length}`);

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
            }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[AI Proxy] Gemini ${model} error ${response.status}:`, errorText);
        throw new Error(`Gemini API error: ${response.status}`);
    }

    const result = await response.json();
    if (!result.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('No response from Gemini');
    }

    return result.candidates[0].content.parts[0].text;
}

// =============================================================================
// CACHED FALLBACK RESPONSES (Layer 8 - Never fails)
// =============================================================================

interface CachedResponses {
    [key: string]: any;
}

const CACHED_FALLBACKS: CachedResponses = {
    'process-entry': {
        title: 'Entry',
        tags: [],
        primary_sentiment: 'Reflective',
        emoji: '📝'
    },
    'suggestions': {
        suggestions: []
    },
    'instant-insight': {
        insight: "Every moment of self-reflection is a step toward understanding yourself better. Take a breath and appreciate that you're here, thinking about what matters to you.",
        followUpQuestion: "What's one small thing you could do right now to feel a bit better?",
        confidence: 0.5
    },
    'analyze-habit': {
        emoji: '✨',
        category: 'Growth'
    },
    'analyze-intention': {
        emoji: '🎯',
        category: 'Growth'
    },
    'extract-keywords': {
        keywords: []
    },
    'chat': {
        response: "I'm having trouble connecting right now — please try again in a moment. Your data is safe."
    },
    'daily-reflection': {
        summary: "Today brought its own unique lessons. Take a moment to acknowledge your efforts and appreciate how far you've come. Tomorrow offers a fresh start.",
        suggestions: []
    },
    'weekly-reflection': {
        summary: "This week held its own story. Whether filled with progress or challenges, each day contributed to your growth. Look ahead with optimism.",
        suggestions: []
    },
    'monthly-reflection': {
        summary: "Another month has passed in your journey. The experiences, both highs and lows, have shaped who you are becoming. Trust the process and keep moving forward.",
        suggestions: []
    },
    'chat-summary': {
        title: "Conversation Insights",
        summary: "• Unable to generate summary at this time\n• Please try again in a moment",
        prompt_version: 'chat-summary-v1'
    }
};

function getCachedResponse(action: string): any {
    console.log(`[AI Proxy] Using cached fallback for: ${action}`);
    return CACHED_FALLBACKS[action] || { error: 'Unknown action' };
}

// =============================================================================
// MULTI-PROVIDER CALL WITH FALLBACK CHAIN
// =============================================================================

interface AICallResult {
    text: string;
    provider: string;
    latency_ms: number;
    attempted: string[];
}

function estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token for English
    return Math.ceil(text.length / 4);
}

async function callAI(prompt: string, action: string): Promise<AICallResult> {
    const providers = [
        { name: 'Groq 70B', fn: async () => callGroqWithModel(GROQ_MODEL_PRIMARY, prompt), available: !!groqKey },
        { name: 'Groq 8B', fn: async () => callGroqWithModel(GROQ_MODEL_BACKUP, prompt), available: !!groqKey },
        { name: 'Gemini Flash', fn: async () => callGeminiWithModel(GEMINI_MODEL_PRIMARY, prompt), available: !!geminiKey },
    ];

    if (action === 'evaluate-response' || action === 'extract-keywords') {
        providers.push({ name: 'Gemini Lite', fn: async () => callGeminiWithModel(GEMINI_MODEL_BACKUP, prompt), available: !!geminiKey });
    }

    const attempted: string[] = [];
    const fallback_events: any[] = [];
    const providerErrors: Record<string, string> = {};
    let lastProvider = '';

    for (const provider of providers) {
        if (!provider.available) {
            console.log(`[AI Proxy] Skipping ${provider.name} (not configured)`);
            continue;
        }

        if (lastProvider) {
            fallback_events.push({ 
                from: lastProvider, 
                to: provider.name,
                reason: 'Previous provider failed',
                error: (provider as any).lastError || 'Unknown error'
            });
        }
        lastProvider = provider.name;
        attempted.push(provider.name);
        const start = Date.now();

        try {
            let result: string;
            try {
                result = await provider.fn();
            } catch (e: any) {
                // Check for 429 or JSON fallback in error
                if (provider.name === 'Groq 70B' && (e.message.includes('429') || e.message.includes('rate limit'))) {
                    console.warn('[AI Proxy] Rate limited on Groq 70B, retrying in 1s...');
                    await new Promise(r => setTimeout(r, 1000));
                    result = await provider.fn();
                } else {
                    throw e;
                }
            }

            const latency_ms = Date.now() - start;
            console.log(`[AI Proxy] ✓ ${provider.name} succeeded in ${latency_ms}ms`);
            
            if (result && result.trim().startsWith('{') && result.includes('"response":')) {
                if (provider.name === 'Groq 70B') {
                    console.warn(`[AI Proxy] ✗ Groq 70B returned JSON fallback response, retrying in 1s...`);
                    await new Promise(r => setTimeout(r, 1000));
                    result = await provider.fn();
                    if (result && result.trim().startsWith('{') && result.includes('"response":')) {
                        throw new Error("Returned rate limit JSON fallback response after retry");
                    }
                } else {
                    throw new Error("Returned rate limit JSON fallback response instead of plain text");
                }
            }
            
            return { text: result, provider: provider.name, latency_ms, attempted, fallback_events };
        } catch (error: any) {
            console.warn(`[AI Proxy] ✗ ${provider.name} failed: ${error.message}`);
            providerErrors[provider.name] = error.message;
            if (fallback_events.length > 0) {
                fallback_events[fallback_events.length - 1].reason = error.message;
            } else if (lastProvider) {
                (provider as any).lastError = error.message;
            }
        }
    }

    // All providers failed
    console.error('[GENERATION_FAILED] All providers exhausted:', providerErrors);
    throw new Error('All AI providers failed');
}

function parseJSON<T>(text: string): T {
    // Clean markdown code blocks if present
    let clean = text.trim();
    const match = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) clean = match[1];
    return JSON.parse(clean);
}

// Normalize reflection response - Llama often returns nested objects instead of plain summary
function normalizeReflection(parsed: any): { summary: string; suggestions: any[] } {
    let summary = '';

    // Try to extract summary from various possible fields
    if (typeof parsed.summary === 'string') {
        summary = parsed.summary;
    } else if (typeof parsed.text === 'string') {
        summary = parsed.text;
    } else if (typeof parsed === 'object' && !Array.isArray(parsed)) {
        // If summary is an object, try to concatenate its values
        const fields = ['picture', 'emotional_arc', 'sentiment_arc', 'text', 'description', 'mood_to_action', 'win', 'improvement', 'goal_progress', 'pattern'];
        const parts: string[] = [];
        for (const field of fields) {
            if (parsed[field] && typeof parsed[field] === 'string') {
                parts.push(parsed[field]);
            }
        }
        if (parts.length > 0) {
            summary = parts.join(' ');
        } else if (parsed.summary && typeof parsed.summary === 'object') {
            // Nested summary object
            summary = Object.values(parsed.summary).filter(v => typeof v === 'string').join(' ');
        }
    }

    // Normalize suggestions
    let suggestions = parsed.suggestions || [];
    if (!Array.isArray(suggestions)) suggestions = [];

    return { summary: summary || 'Unable to generate reflection', suggestions };
}

// =============================================================================
// RATE LIMITING
// =============================================================================

const userCallCounts: Map<string, { count: number; resetAt: number }> = new Map();
const RATE_LIMIT = 200; // Increased since we have more capacity now
const RATE_WINDOW_MS = 60 * 60 * 1000;

function checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const userLimit = userCallCounts.get(userId);
    if (!userLimit || userLimit.resetAt < now) {
        userCallCounts.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
        return true;
    }
    if (userLimit.count >= RATE_LIMIT) return false;
    userLimit.count++;
    return true;
}

// =============================================================================
// MAIN REQUEST HANDLER
// =============================================================================

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        if (req.method !== 'POST') {
            return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
                status: 405,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Parse request body safely using clone() to preserve req for standard body parsing
        const reqClone = req.clone();
        let body: any = {};
        try {
            body = await reqClone.json();
        } catch (e) {
            console.error('[AI Proxy] Error cloning request body:', e);
        }
        const action = body.action;
        const payload = body.payload || {};

        // A) WARMUP — pre-warms the model on cold start (bypasses auth entirely)
        if (action === 'warmup') {
            console.log('[AI Proxy] Pre-warming embedding model...');
            await generateEmbedding('warmup');
            return new Response(
                JSON.stringify({ status: 'warm' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Authenticate user
        let user: any = null;
        if (action !== 'generate-and-store-embedding') {
            const authHeader = req.headers.get('Authorization');
            if (!authHeader) {
                return new Response(JSON.stringify({ success: false, error: 'Missing authorization' }), {
                    status: 401,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const supabase = createClient(supabaseUrl, supabaseKey);
            const { data: { user: authedUser }, error: userError } = await supabase.auth.getUser(
                authHeader.replace('Bearer ', '')
            );

            if (userError || !authedUser) {
                console.error('[AI Proxy] Auth error:', userError);
                return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
                    status: 401,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            user = authedUser;
            console.log(`[AI Proxy] Authenticated user: ${user.id}`);

            // Rate limiting
            if (!checkRateLimit(user.id)) {
                return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded' }), {
                    status: 429,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        }

        // Demo AI call limit check
        let isDemoUser = false;
        if (action !== 'list-models' && 
            action !== 'generate-embedding' && 
            action !== 'generate-and-store-embedding' && 
            action !== 'semantic-search') {
            const adminClient = createClient(supabaseUrl, supabaseKey);
            const { data: profile } = await adminClient
                .from('profiles')
                .select('is_demo, demo_ai_calls_remaining')
                .eq('id', user.id)
                .single();

            if (profile?.is_demo) {
                isDemoUser = true;
                console.log(`[AI Proxy] Demo user detected. Calls remaining: ${profile.demo_ai_calls_remaining}`);

                if (profile.demo_ai_calls_remaining <= 0) {
                    console.log('[AI Proxy] Demo limit reached for user:', user.id);
                }

                // Decrement counter
                await adminClient
                    .from('profiles')
                    .update({ demo_ai_calls_remaining: profile.demo_ai_calls_remaining - 1 })
                    .eq('id', user.id);
            }
        }

        let result: any;
        let aiMeta: AICallResult | null = null;  // Track metadata from callAI

        try {
            switch (action) {
                case 'list-models': {
                    result = {
                        providers: {
                            groq: { available: !!groqKey, models: [GROQ_MODEL_PRIMARY, GROQ_MODEL_BACKUP] },
                            gemini: { available: !!geminiKey, models: [GEMINI_MODEL_PRIMARY, GEMINI_MODEL_BACKUP] },
                            cached: { available: true, models: ['fallback-templates'] }
                        }
                    };
                    break;
                }

                case 'test-gemini': {
                    try {
                        const resPrimary = await callGeminiWithModel(GEMINI_MODEL_PRIMARY, 'hello');
                        result = { success: true, model: GEMINI_MODEL_PRIMARY, response: resPrimary };
                    } catch (ePrimary: any) {
                        try {
                            const resBackup = await callGeminiWithModel(GEMINI_MODEL_BACKUP, 'hello');
                            result = { success: false, primaryError: ePrimary.message, backupSuccess: true, model: GEMINI_MODEL_BACKUP, response: resBackup };
                        } catch (eBackup: any) {
                            result = { success: false, primaryError: ePrimary.message, backupError: eBackup.message };
                        }
                    }
                    break;
                }

                case 'generate-embedding': {
                    const { text } = payload;
                    result = { embedding: await generateEmbedding(text) };
                    break;
                }

                case 'generate-and-store-embedding': {
                    const { entryId, entryText } = payload;
                    const embedding = await generateEmbedding(entryText);
                    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
                    await supabaseAdmin
                        .from('entries')
                        .update({ embedding })
                        .eq('id', entryId);
                    return new Response(
                        JSON.stringify({ success: true }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    );
                }

                case 'semantic-search': {
                    const {
                        userId,
                        queryText,
                        matchCount = 3,
                        matchThreshold = 0.82,
                        startDate = null,
                        endDate = null,
                        embedding: preGeneratedEmbedding = null
                    } = payload;
                    console.log('[Temporal Edge]', {
                        startDate,
                        endDate
                    });
                    if (!queryText || queryText.trim().length < 3) {
                        return new Response(
                            JSON.stringify({ matches: [] }),
                            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                        );
                    }
                    const queryEmbedding = preGeneratedEmbedding ?? await generateEmbedding(queryText);
                    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
                    const { data, error } = await supabaseAdmin.rpc(
                        'match_entries',
                        {
                            query_embedding: queryEmbedding,
                            match_threshold: matchThreshold,
                            match_count: matchCount,
                            p_user_id: userId,
                            start_date: startDate,
                            end_date: endDate
                        }
                    );
                    if (error) throw error;
                    return new Response(
                        JSON.stringify({ matches: data || [] }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    );
                }

                case 'classify-intent': {
                    const { prompt, userMessage } = payload;
                    
                    const classifierProviders = [
                        { name: 'Groq 70B', fn: () => callGroqWithModel(GROQ_MODEL_PRIMARY, prompt), available: !!groqKey },
                        { name: 'Groq 8B', fn: () => callGroqWithModel(GROQ_MODEL_BACKUP, prompt), available: !!groqKey },
                        { name: 'Gemini Flash', fn: () => callGeminiWithModel(GEMINI_MODEL_PRIMARY, prompt), available: !!geminiKey },
                        { name: 'Gemini Lite', fn: () => callGeminiWithModel(GEMINI_MODEL_BACKUP, prompt), available: !!geminiKey }
                    ];

                    let classifyResult: any;
                    const providerErrors: string[] = [];
                    for (const provider of classifierProviders) {
                        if (!provider.available) continue;
                        try {
                            const res = await provider.fn();
                            classifyResult = { text: res, provider: provider.name, latency_ms: 0, attempted: [provider.name] };
                            break;
                        } catch (e: any) {
                            console.warn(`[AI Proxy] Classifier ${provider.name} failed:`, e.message);
                            providerErrors.push(`${provider.name}: ${e.message}`);
                            continue;
                        }
                    }

                    if (!classifyResult) {
                        const err = new Error("All intent classifiers failed");
                        (err as any).providerErrors = providerErrors;
                        throw err;
                    }
                    aiMeta = classifyResult;
                    result = { text: classifyResult.text };
                    break;
                }

                case 'process-entry': {
                    const { entryText } = payload;
                    const prompt = `Analyze this journal entry and respond with ONLY a JSON object (no markdown, no code blocks):
Entry: "${entryText}"

Return JSON in this exact format:
{"title": "Short Title", "tags": ["tag1", "tag2"], "primary_sentiment": "Reflective", "emoji": "🌟"}

EMOJI RULES:
- Choose an emoji that reflects the EMOTION or TOPIC of the entry
- Match the mood: 😓 for stress, 😊 for joy, 💪 for productivity, 😔 for sadness, 🎉 for celebration
- Match the topic: 💻 for coding, 🏋️ for exercise, 💼 for work, 🏠 for home, 💡 for ideas
- NEVER use 📓 or 📝 - too generic. Be specific to the content.

Sentiments must be one of: Joyful, Grateful, Proud, Hopeful, Content, Anxious, Frustrated, Sad, Overwhelmed, Confused, Reflective, Inquisitive, Observational`;

                    const aiResult = await callAI(prompt, action);
                    aiMeta = aiResult;
                    result = parseJSON(aiResult.text);
                    break;
                }

                case 'suggestions': {
                    const { entryText, isTest } = payload;
                    const prompt = `You are a wise, selective coach. Analyze this journal entry. Respond with ONLY JSON.

Entry: "${entryText}"

RULES:
- Only suggest if the entry shows CLEAR intent to change behavior, build a habit, or achieve a goal
- NO suggestions for: test entries, casual observations, vague statements, technical notes
- Maximum 1-2 suggestions total (prefer 0-1)
- Labels must be SHORT (5-7 words max), actionable, specific
- Use "habit" for recurring behaviors, "intention" for one-time goals
${isTest ? "- TEST MODE: Override rules, always return one habit and one intention." : "- Be VERY selective. When in doubt, return empty array."}

Return: {"suggestions": [{"type": "habit", "label": "Meditate 5 mins daily", "data": {"frequency": "daily"}}, {"type": "intention", "label": "Run first 5K by March", "data": {"timeframe": "weekly"}}]}
If entry doesn't warrant suggestions, return: {"suggestions": []}`;

                    const aiResult = await callAI(prompt, action);
                    aiMeta = aiResult;
                    result = parseJSON(aiResult.text);
                    break;
                }

                case 'build-ai-profile': {
                  const { entries, habits, habitLogs, intentions, onboardingContext } = payload;

                  const entrySummary = entries.slice(0, 40).map((e: any) =>
                    `[${e.timestamp.split('T')[0]}] sentiment:${e.primary_sentiment || 'unknown'} tags:${(e.tags || []).join(',')} title:"${e.title || ''}"`
                  ).join('\n');

                  const habitSummary = habits.map((h: any) => {
                    const logs = habitLogs.filter((l: any) => l.habit_id === h.id);
                    return `${h.name} (${h.frequency}): ${logs.length} completions, streak:${h.current_streak}`;
                  }).join('\n');

                  const intentionSummary = intentions.slice(0, 10).map((i: any) =>
                    `"${i.text}" status:${i.status} category:${i.category || 'unknown'}`
                  ).join('\n');

                  const onboardingLine = onboardingContext
                    ? `When they started: felt ${onboardingContext.sentiment} about ${onboardingContext.life_area} (${onboardingContext.trigger}). Said: "${onboardingContext.elaboration_summary}"`
                    : 'No onboarding context available.';

                  const prompt = `You are building a longitudinal understanding profile of a Mindstream user based on their journal entries, habits, and goals over time.

ONBOARDING CONTEXT:
${onboardingLine}

RECENT ENTRIES (last 40):
${entrySummary}

HABITS & COMPLETION:
${habitSummary}

GOALS:
${intentionSummary}

Build a profile that captures who this person is RIGHT NOW based on patterns in the data. Be specific — use actual themes from their entries.

Return ONLY JSON:
{
  "dominant_emotions": ["Anxious", "Reflective"],         // top 2-3 recurring emotions
  "active_life_areas": ["Work", "Health"],                 // life areas they write about most
  "pattern_summary": "Tends to journal when stressed about work deliverables. More positive entries on days exercise is logged. Struggles with consistency on health habits despite setting them repeatedly.",
  "goal_trajectory": "Currently focused on career growth and health. Three goals set, one completed. Health goals show pattern of resets.",
  "last_updated": "${new Date().toISOString()}"
}

Rules:
- pattern_summary must be 2-3 sentences max, specific to their actual data
- goal_trajectory must be 1-2 sentences, factual
- dominant_emotions max 3 items
- active_life_areas max 3 items
- If insufficient data (< 5 entries), return all fields empty with last_updated set`;

                  const aiResult = await callAI(prompt, action);
                  aiMeta = aiResult;
                  result = parseJSON(aiResult.text);
                  break;
                }

                case 'instant-insight': {
                    const { text, sentiment, lifeArea, trigger } = payload;
                    const prompt = `You are a wise coach. Respond with ONLY JSON (no markdown):
User feeling: ${sentiment}
Life area: ${lifeArea}
Trigger: ${trigger}
Entry: "${text}"

Provide an empathetic insight and follow-up question. Rate confidence 0.0-1.0 based on entry quality.
Return: {"insight": "Your insight...", "followUpQuestion": "Your question?", "confidence": 0.8}`;

                    const aiResult = await callAI(prompt, action);
                    aiMeta = aiResult;
                    result = parseJSON(aiResult.text);
                    result.confidence = typeof result.confidence === 'number' ? result.confidence : 0.5;
                    break;
                }

                case 'analyze-habit': {
                    const { habitName } = payload;
                    const prompt = `Classify this habit and assign an emoji. Respond with ONLY JSON:
Habit: "${habitName}"
Categories: Health, Growth, Career, Finance, Connection, System
Return: {"emoji": "🏃", "category": "Health"}`;

                    const aiResult = await callAI(prompt, action);
                    aiMeta = aiResult;
                    result = parseJSON(aiResult.text);
                    break;
                }

                case 'analyze-intention': {
                    const { intentionText } = payload;
                    const prompt = `Classify this goal into ONE category and pick the matching emoji.

Goal: "${intentionText}"

CATEGORIES AND EMOJIS:
- Health (exercise, sleep, diet, mental health) → 🏃
- Growth (learning, reading, skills, habits) → 📚
- Career (work, projects, job, promotion) → 💼
- Finance (money, savings, budget, investing) → 💰
- Connection (relationships, family, social) → 💜
- System (organization, productivity, routines) → 🛠️

Pick the BEST match based on the goal's content.
Respond with ONLY this JSON format:
{"emoji": "<emoji from list>", "category": "<category name>"}`;

                    console.log('[AI Proxy] analyze-intention: Goal:', intentionText.substring(0, 50));
                    const aiResult = await callAI(prompt, action);
                    aiMeta = aiResult;
                    console.log('[AI Proxy] analyze-intention: Response:', aiResult.text);
                    result = parseJSON(aiResult.text);
                    console.log('[AI Proxy] analyze-intention: Parsed:', result);
                    break;
                }

                case 'extract-keywords': {
                    const { query } = payload;
                    const prompt = `Extract 2-4 search keywords from: "${query}"
Respond with ONLY JSON: {"keywords": ["term1", "term2"]}`;

                    const aiResult = await callAI(prompt, action);
                    aiMeta = aiResult;
                    result = parseJSON(aiResult.text);
                    break;
                }

                case 'chat': {
                    const { history, userPrompt, systemInstruction } = payload;

                    let context = systemInstruction ? `${systemInstruction}\n\n` : '';
                    if (history && Array.isArray(history)) {
                        for (const msg of history) {
                            const role = msg.role === 'user' ? 'User' : 'Assistant';
                            const text = msg.parts?.[0]?.text || '';
                            context += `${role}: ${text}\n`;
                        }
                    }
                    context += `User: ${userPrompt}\n\nRespond as a helpful, empathetic assistant:`;

                    const aiResult = await callAI(context, action);
                    aiMeta = aiResult;
                    result = { response: aiResult.text };
                    break;
                }

                case 'daily-reflection': {
                    const { entries, intentions, habits } = payload;
                    const prompt = `You are the user's thoughtful life coach. Generate a Daily Reflection. Respond with ONLY valid JSON.

TODAY'S DATA:
Entries: ${entries || 'No entries today'}
Pending Goals: ${intentions || 'No active goals'}
Habits Already Tracked: ${habits || 'No habits'}

VOICE RULES (CRITICAL):
- ALWAYS use second-person: "you felt", "you did", "your day"
- NEVER use third-person: "they", "the user", "one"
- Speak directly TO the user, not ABOUT them
- Use pattern language when relevant: "you tend to...", "when you..., you usually..."

YOUR TASK - SUMMARY (3-5 sentences):
- Paint a picture of YOUR day. What was the emotional arc?
- Connect your mood (from entries) to your actions (habits completed, goals progressed)
- Celebrate ONE specific win - be precise, name the actual thing you did
- Offer ONE gentle observation about what could improve - be kind, not preachy
- Don't include exact timestamps - use natural time references ("this morning", "later")

YOUR TASK - SUGGESTIONS (max 1, can be empty):
CRITICAL: Do NOT suggest something already tracked as a habit! Check "Habits Already Tracked" above.
- Only suggest a NEW intention/goal, never an existing habit
- MUST reference SPECIFIC items from the entries or pending goals
- The suggestion must DIRECTLY relate to something mentioned in the entries
- Format: 5-12 words max, actionable
- BAD: "Prioritize your goals" (generic)
- BAD: "Take a break before emails" (if emails weren't mentioned)
- GOOD: "Tomorrow: finish the Mindstream migration" (specific from data)
- If day was balanced or data is sparse, return empty array []

Return: {"summary": "Your personalized daily story...", "suggestions": [{"text": "Short actionable text", "type": "intention", "timeframe": "daily"}]}`;

                    const aiResult = await callAI(prompt, action);
                    aiMeta = aiResult;
                    result = normalizeReflection(parseJSON(aiResult.text));
                    break;
                }

                case 'weekly-reflection': {
                    const { entries, intentions, habits } = payload;
                    const prompt = `You are the user's strategic life coach. Generate a Weekly Reflection. Respond with ONLY valid JSON.

THIS WEEK'S DATA:
Entries: ${entries || 'No entries this week'}
Goals: ${intentions || 'No active goals'}
Habits Tracked: ${habits || 'No habits'}

VOICE RULES (CRITICAL):
- ALWAYS use second-person: "you felt", "you did", "your week"
- NEVER use third-person: "they", "the user", "one"
- Speak directly TO the user, not ABOUT them
- Use pattern language: "you tend to...", "when you..., you usually..."

YOUR TASK - SUMMARY (3-5 sentences):
- What was the dominant emotional theme YOUR week?
- How did YOU progress on your stated goals? Be specific about which ones
- What pattern do you notice in your entries?
- End with an encouraging observation about YOUR trajectory

YOUR TASK - SUGGESTIONS (max 1):
CRITICAL: Must be 15 words or fewer. One short sentence only.
- MUST reference a SPECIFIC goal or pattern from the data
- The suggestion must DIRECTLY relate to something mentioned in the entries
- Do NOT suggest things already tracked as habits
- BAD: "Given the consistent theme of sleep affecting your performance..." (too long!)
- GOOD: "Break 'Launch project' into 3 small daily tasks" (short, specific)
- If week was balanced, return empty array []

Return: {"summary": "Your weekly story arc...", "suggestions": [{"text": "Max 15 words action item", "type": "intention", "timeframe": "weekly"}]}`;

                    const weeklyResult = await callAI(prompt, action);
                    aiMeta = weeklyResult;
                    result = normalizeReflection(parseJSON(weeklyResult.text));
                    break;
                }

                case 'monthly-reflection': {
                    const { entries, intentions, habits } = payload;
                    const prompt = `You are the user's wise life coach. Generate a Monthly Reflection. Respond with ONLY valid JSON.

THIS MONTH'S DATA:
Entries: ${entries || 'No entries this month'}
Goals: ${intentions || 'No active goals'}
Habits: ${habits || 'No habits tracked'}

VOICE RULES (CRITICAL):
- ALWAYS use second-person: "you", "your", "you've"
- NEVER use third-person: "they", "the user", "one"
- Speak directly TO the user, not ABOUT them

YOUR TASK - SUMMARY (4-6 sentences as ONE paragraph):
Write a cohesive narrative paragraph that includes:
- A "chapter title" feeling (e.g., "This was YOUR month of...")
- The sentiment arc: how did YOU start vs end the month?
- Which of YOUR goals saw progress? Which got stuck? Be specific by name
- What life area (Health, Career, Relationships, Growth) got the most of YOUR attention?
- End with an inspiring observation about YOUR growth

IMPORTANT: Return summary as a PLAIN TEXT string, not nested JSON. No chapter_title field, no sentiment_arc field - just one flowing paragraph.

YOUR TASK - SUGGESTIONS (max 1):
- Should be a meaningful goal for YOUR next month
- MUST connect to something specific from your entries
- Maximum 15 words
- MUST connect to patterns you noticed in their data
- BAD: "Set clearer goals" (generic advice)
- GOOD: "Next month: dedicate mornings to 'Learn Spanish'" (specific)
- If month was well-balanced, return empty array []

Return exactly this format:
{"summary": "This month you... (full paragraph here)...", "suggestions": [{"text": "Next month: specific action", "type": "intention", "timeframe": "monthly"}]}`;

                    const monthlyResult = await callAI(prompt, action);
                    aiMeta = monthlyResult;
                    result = normalizeReflection(parseJSON(monthlyResult.text));
                    break;
                }

                case 'chat-summary': {
                    const { messages } = payload;
                    const prompt = `Extract the USER's specific realizations from this conversation.

CONVERSATION:
${messages}

CRITICAL: Capture what the USER specifically discovered or decided - NOT generic advice.
Look for: specific blockers they named, decisions they made, "aha" moments, concrete next steps.

Respond with valid JSON. Use | to separate bullets (NOT newlines):
{"title": "their specific topic", "summary": "• What you realized about X | • Your decision to Y | • Next step: Z"}

DO NOT output generic advice like "break tasks down" or "focus on one thing".
DO quote or paraphrase the user's actual words and specific situation.

Rules:
- title: Name THEIR specific challenge (e.g. "MVP Launch Anxiety" not "Productivity Tips")
- summary: 2-3 bullets with THEIR specific insights
- Under 50 words total`;

                    console.log('[AI Proxy] chat-summary: Calling AI with prompt length:', prompt.length);
                    let chatSummaryResult = await callAI(prompt, action);
                    aiMeta = chatSummaryResult;
                    let rawResponse = chatSummaryResult.text;
                    console.log('[AI Proxy] chat-summary: Raw AI response:', rawResponse?.substring(0, 500));

                    let parsed: any = null;
                    try {
                        // First try direct parse
                        parsed = JSON.parse(rawResponse.trim());
                    } catch (e1) {
                        console.log('[AI Proxy] chat-summary: Direct parse failed, trying cleanup...');
                        try {
                            // Try extracting JSON from markdown
                            let clean = rawResponse.trim();
                            const match = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                            if (match && match[1]) clean = match[1];
                            // Remove any actual newlines inside the JSON string
                            clean = clean.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ');
                            parsed = JSON.parse(clean);
                        } catch (e2) {
                            console.error('[AI Proxy] chat-summary: JSON parse failed:', e2);
                        }
                    }
                    console.log('[AI Proxy] chat-summary: Parsed result:', JSON.stringify(parsed));

                    // Convert pipe separators to newlines in summary
                    if (parsed?.summary) {
                        parsed.summary = parsed.summary.replace(/\s*\|\s*/g, '\n');
                    }

                    // Validation: must have title, summary, and bullet points
                    const isValid = parsed?.title &&
                        parsed?.summary &&
                        typeof parsed.summary === 'string' &&
                        parsed.summary.includes('•');

                    // Retry once if invalid
                    if (!isValid) {
                        console.log('[AI Proxy] chat-summary: Invalid response, retrying...');
                        chatSummaryResult = await callAI(prompt, action);
                        aiMeta = chatSummaryResult;
                        rawResponse = chatSummaryResult.text;
                        console.log('[AI Proxy] chat-summary: Retry raw response:', rawResponse?.substring(0, 500));
                        try {
                            let clean = rawResponse.trim();
                            const match = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                            if (match && match[1]) clean = match[1];
                            clean = clean.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ');
                            parsed = JSON.parse(clean);
                            if (parsed?.summary) {
                                parsed.summary = parsed.summary.replace(/\s*\|\s*/g, '\n');
                            }
                        } catch (e) {
                            console.error('[AI Proxy] chat-summary: Retry JSON parse failed:', e);
                            parsed = null;
                        }
                        console.log('[AI Proxy] chat-summary: Retry parsed:', JSON.stringify(parsed));
                    }

                    // Final validation - return error if still invalid
                    if (!parsed?.title || !parsed?.summary) {
                        console.error('[AI Proxy] chat-summary: Final validation failed, parsed:', parsed);
                        return new Response(JSON.stringify({
                            success: false,
                            error: 'Failed to generate valid summary',
                            prompt_version: 'chat-summary-v2'
                        }), {
                            status: 200,
                            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                        });
                    }

                    result = {
                        title: parsed.title,
                        summary: parsed.summary,
                        prompt_version: 'chat-summary-v2'
                    };
                    break;
                }


                case 'evaluate-response': {
                    const clamp = (n: number, min: number, max: number) => Math.round(Math.min(max, Math.max(min, n || 0)));
                    
                    const { userMessage, retrievedContext, profileContext, recentContext, historyContext, aiResponse, queryIntent } = payload;
                    const prompt = `You are evaluating a RAG system response using RAGAS metrics.

QUERY INTENT: ${queryIntent || 'UNKNOWN'}
USER QUERY: "${userMessage}"
PROFILE CONTEXT: ${profileContext || 'None'}
RECENT CONTEXT: ${recentContext || 'None'}
RETRIEVED CONTEXT: ${retrievedContext || 'None'}
HISTORY CONTEXT: ${historyContext || 'None'}
AI RESPONSE: "${aiResponse}"

Score these 4 RAGAS metrics (0-100 each):

FAITHFULNESS: Is every claim in the response grounded in the provided contexts?
Score 100 if fully grounded, 0 if hallucinated.

ANSWER_RELEVANCY: Does the response directly address what the user asked?
Score 100 if fully addresses query, 0 if off-topic.

CONTEXT_PRECISION: Of the provided contexts, how much was actually useful for the answer?
Score 100 if all context was useful, 0 if irrelevant.

CONTEXT_RECALL: Did the provided contexts contain all information needed to answer?
Score 100 if complete, 0 if major gaps.

Return ONLY valid JSON:
{
  "faithfulness": 85,
  "answerRelevancy": 90,
  "contextPrecision": 75,
  "contextRecall": 80,
  "fScore": 82,
  "summary": "One sentence assessment"
}`;

                    const evalResult = await callAI(prompt, action);
                    aiMeta = evalResult;
                    const scores = parseJSON<any>(evalResult.text);

                    result = {
                        faithfulness: clamp(scores.faithfulness, 0, 100),
                        answerRelevancy: clamp(scores.answerRelevancy, 0, 100),
                        contextPrecision: clamp(scores.contextPrecision, 0, 100),
                        contextRecall: clamp(scores.contextRecall, 0, 100),
                        fScore: clamp(scores.fScore, 0, 100),
                        summary: scores.summary || ''
                    };
                    break;
                }


                case 'summarise-session': {
                    const { messages } = payload;
                    const transcript = messages
                        .map((m: any) => `${m.sender === 'user' ? 'User' : 'Coach'}: ${m.text}`)
                        .join('\n');

                    const prompt = `Summarise this conversation in 2-3 sentences from the coach's perspective.
Focus on: what the user was processing, any decisions made, emotional state, open threads.
Be specific — use actual details from the conversation, not generic summaries.
Also extract 3-5 key topics as single words.

Conversation:
${transcript}

Return ONLY JSON: 
{
  "summary": "User was processing anxiety about...",
  "key_topics": ["anxiety", "work", "exercise"]
}`;

                    const aiResult = await callAI(prompt, action);
                    aiMeta = aiResult;
                    result = parseJSON(aiResult.text);
                    break;
                }

                case 'classify-behavior': {
                    const { userMessage, recentMessages } = payload;
                    
                    const conversationContext = recentMessages
                        ?.slice(-4)
                        .map((m: any) => `${m.sender === 'user' ? 'User' : 'Coach'}: ${m.text}`)
                        .join('\n') ?? '';

                    const prompt = `You are analyzing a message to determine if it contains a behavioral signal — a habit the user does or wants to track, or a goal they are working toward.

Recent conversation context:
${conversationContext}

Current message: "${userMessage}"

RULES:
- "habit_log" = user reporting they DID something (past tense, definite)
- "habit_intent" = user expressing desire/plan to build a recurring behavior (future, conditional)  
- "goal_log" = user reporting progress on a one-time goal
- "goal_intent" = user expressing a specific one-time goal with an end state
- "none" = everything else (venting, questions, casual conversation, greetings)

Confidence rules:
- Words like "should", "maybe", "thinking about", "would be nice", "eventually" → confidence MAX 0.5
- Words like "i did", "just finished", "went for", "hit the gym", "completed" → confidence MIN 0.7
- Vague labels like "exercise more", "be healthier", "do better" → confidence MAX 0.4

Respond ONLY with JSON:
{
  "contains_behavioral_signal": true,
  "signal_type": "habit_log",
  "confidence": 0.85,
  "reason": "User said 'went for a run' — past tense, definite action"
}

If no behavioral signal: { "contains_behavioral_signal": false, "signal_type": "none", "confidence": 1.0, "reason": "..." }`;

                    const aiResult = await callAI(prompt, action);
                    aiMeta = aiResult;
                    result = parseJSON(aiResult.text);
                    break;
                }

                case 'extract-behavior': {
                    const { userMessage, signalType, existingHabits, existingGoals } = payload;

                    const habitsContext = existingHabits?.length
                        ? `Existing habits: ${existingHabits.map((h: any) => `"${h.name}" (${h.frequency})`).join(', ')}`
                        : 'No existing habits.';

                    const goalsContext = existingGoals?.length
                        ? `Existing goals: ${existingGoals.map((g: any) => `"${g.text}"`).join(', ')}`
                        : 'No existing goals.';

                    const prompt = `You are extracting structured data from a user message. Be conservative — when in doubt, return "none".

User message: "${userMessage}"
Signal type detected: ${signalType}

${habitsContext}
${goalsContext}

TASK: Determine the correct action and extract structured data.

action options:
- "log_existing": user is reporting completion of an existing habit/goal (match by name similarity)
- "create_new": user is describing something genuinely new
- "none": not enough specificity to act

commitment_level options:
- "definite": clear, specific, committed ("went for a run", "meditated this morning", "finish report by Friday")
- "aspirational": desire or intention but not committed ("want to start running", "should meditate more")
- "reflective": observational, no action implied ("I never seem to exercise", "I used to meditate")

HARD RULES:
- If label would be fewer than 3 meaningful words → action: "none"
- If label contains "more", "better", "try", "maybe" → action: "none"  
- If same meaning exists in existing habits/goals (fuzzy match) → action: "log_existing" with that item's name
- commitment_level "reflective" → always action: "none"
- frequency must be explicit in message, never inferred. If unclear → null

Respond ONLY with JSON:
{
  "action": "create_new",
  "type": "habit",
  "name": "Morning run",
  "frequency": "daily",
  "category": "Health",
  "commitment_level": "definite",
  "matched_item_name": null,
  "due_date": null,
  "is_life_goal": false,
  "extraction_confidence": 0.9
}`;

                    const aiResult = await callAI(prompt, action);
                    aiMeta = aiResult;
                    result = parseJSON(aiResult.text);
                    break;
                }
                case 'detect-correlations': {
                    const { entries, habits, habitLogs } = payload;

                    // Build structured data summary for AI
                    const entryLines = entries.slice(0, 30).map((e: any) =>
                        `[${e.timestamp.split('T')[0]}] sentiment:${e.primary_sentiment || 'unknown'} tags:${(e.tags || []).join(',')} text:"${e.text?.substring(0, 100)}"`
                    ).join('\n');

                    const habitLogLines = habitLogs.slice(0, 60).map((log: any) => {
                        const habit = habits.find((h: any) => h.id === log.habit_id);
                        return `[${log.completed_at.split('T')[0]}] completed:"${habit?.name || 'unknown'}"`;
                    }).join('\n');

                    const prompt = `You are analyzing a user's personal data to find genuine behavioral correlations. Be specific and honest. Only report patterns that appear at least 3 times in the data.

JOURNAL ENTRIES (last 30):
${entryLines}

HABIT COMPLETIONS (last 60 logs):
${habitLogLines}

TASK: Find the single strongest correlation between habits and mood/sentiment in this data.

RULES:
- Must appear at least 3 times to count as a pattern
- Must be specific — cite actual dates or counts
- Must connect a habit (or habit absence) to a mood/sentiment outcome
- If no clear pattern exists, return confidence: 0.0
- Pattern text must be one sentence, under 100 characters, written as an observation
- Good: "Anxiety entries appear 3x more often on days you skipped Morning run"
- Bad: "Exercise seems to affect your mood" (too vague, no data cited)

Return ONLY JSON:
{
  "pattern_text": "...",
  "pattern_type": "habit_mood",
  "confidence": 0.82,
  "evidence_dates": ["2026-05-12", "2026-05-15"],
  "habit_name": "Morning run",
  "entry_sentiments": ["Anxious", "Overwhelmed"]
}

If no pattern found: { "pattern_text": "", "confidence": 0.0 }`;

                    const aiResult = await callAI(prompt, action);
                    aiMeta = aiResult;
                    result = parseJSON(aiResult.text);
                    break;
                }

                default:
                    return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
                        status: 400,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
            }
        } catch (parseError: any) {
            // JSON parsing failed even after all providers - use cached fallback
            console.error(`[AI Proxy] Parse error for ${action}:`, parseError.message);
            if (action === 'classify-intent') {
                throw parseError;
            }
            result = getCachedResponse(action);
        }

        console.log(`[AI Proxy] Success for action: ${action}`);

        // Build _meta from tracked AI call data
        const _meta = aiMeta ? {
            provider: aiMeta.provider,
            latency_ms: aiMeta.latency_ms,
            attempted: aiMeta.attempted,
            fallback_events: (aiMeta as any).fallback_events,
            tokens_in: estimateTokens(JSON.stringify(payload)),
            tokens_out: estimateTokens(JSON.stringify(result)),
        } : undefined;

        return new Response(JSON.stringify({ success: true, data: result, _meta }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('[AI Proxy] Critical error:', error.message);

        // Even on critical error, try to return something useful
        // Parse action from request if possible
        try {
            const { action } = await req.clone().json();
            if (action === 'classify-intent') {
                return new Response(JSON.stringify({ 
                    success: false, 
                    error: error.message, 
                    providerErrors: error.providerErrors || [] 
                }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            const fallback = getCachedResponse(action);
            return new Response(JSON.stringify({ success: true, data: fallback }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch {
            return new Response(JSON.stringify({ success: false, error: error.message || 'Internal error' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
});
