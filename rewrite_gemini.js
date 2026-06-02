const fs = require('fs');
const file = '/Users/director/Desktop/Mindstream_v1/services/geminiService.ts';
let code = fs.readFileSync(file, 'utf8');

const adaptiveRetrievalMatch = code.indexOf('export async function adaptiveRetrieval');
const endOfFile = code.indexOf('export const generateEntrySuggestions');

if (adaptiveRetrievalMatch === -1 || endOfFile === -1) {
    console.log("Could not find bounds");
    process.exit(1);
}

const replacement = `export async function adaptiveRetrieval(
    userId: string,
    userMessage: string,
    conversationHistory: string[],
    isDemoUser: boolean = false
): Promise<AdaptiveRetrievalResult | null> {
    const retrievalStart = Date.now();

    const [intent, preGeneratedEmbedding] = await Promise.all([
        classifyQueryIntent(userMessage, conversationHistory),
        generateQueryEmbedding(userMessage)
    ]);

    const classifierLatencyMs = Date.now() - retrievalStart;
    const semanticThreshold = isDemoUser ? 0.60 : 0.80;

    let matches: Array<Entry & { similarity?: number }> = [];
    const normalizedIntent = intent.intent?.trim() || 'SEMANTIC_TOPIC';
    let retrievalStrategy: string = normalizedIntent;

    switch (normalizedIntent) {
        case 'TEMPORAL_SUMMARY':
            if (intent.startDate && intent.endDate) {
                matches = await db.getEntriesByDateRange(userId, intent.startDate, intent.endDate);
            } else {
                matches = await db.getRecentEntries(userId, 15);
                retrievalStrategy = 'TEMPORAL_SUMMARY_FALLBACK';
            }
            break;
            
        case 'TEMPORAL_TOPIC':
            if (intent.startDate && intent.endDate) {
                matches = await db.semanticSearchWithBounds(
                    userId,
                    userMessage,
                    intent.startDate,
                    intent.endDate,
                    5,
                    semanticThreshold,
                    preGeneratedEmbedding ?? undefined
                );
            } else {
                matches = await db.semanticSearchEntries(
                    userId,
                    userMessage,
                    3,
                    semanticThreshold,
                    null,
                    null,
                    preGeneratedEmbedding ?? undefined
                );
                retrievalStrategy = 'TEMPORAL_TOPIC_FALLBACK';
            }
            break;
            
        case 'SEMANTIC_TOPIC':
            if (!preGeneratedEmbedding) {
                console.error('[P1] SEMANTIC_TOPIC: preGeneratedEmbedding is UNDEFINED. Check getChatResponseStream() call site — embedding must be passed through to adaptiveRetrieval().');
                return null;
            }
            matches = await db.semanticSearchEntries(
                userId,
                userMessage,
                5,
                semanticThreshold,
                undefined,
                undefined,
                preGeneratedEmbedding
            );
            retrievalStrategy = \`Vector search · threshold \${semanticThreshold}\`;
            break;
            
        case 'BEHAVIORAL':
        case 'CONVERSATIONAL':
            return null;
            
        case 'ANALYTICAL':
            const analytics = await db.getAnalyticalContext(userId);
            return {
                intent,
                queryIntent: intent,
                matches: analytics.entries.slice(0, 5),
                entries: analytics.entries.slice(0, 5),
                retrievalStrategy: 'ANALYTICAL',
                strategy: 'ANALYTICAL',
                analyticalContext: { topTags: analytics.topTags, sentimentDistribution: analytics.sentimentDistribution },
                classifierLatencyMs,
                embeddingLatencyMs: classifierLatencyMs
            };
    }

    return {
        intent,
        queryIntent: intent,
        matches,
        entries: matches,
        retrievalStrategy,
        strategy: retrievalStrategy,
        classifierLatencyMs,
        embeddingLatencyMs: classifierLatencyMs
    };
}

export const buildSystemContext = (
    userProfile: string,
    recentContext: string,
    layer4Results: AdaptiveRetrievalResult | null,
    conversationHistory: Message[],
    personalitySystemPrompt: string
): string => {
    let contextString = \`\${personalitySystemPrompt}\\n\\n\`;
    contextString += \`\${userProfile}\\n\\n\`;
    contextString += \`\${recentContext}\\n\\n\`;

    if (layer4Results && layer4Results.entries && layer4Results.entries.length > 0) {
        const matchesText = layer4Results.entries.map((e: any) => 
            \`- On \${new Date(e.timestamp).toLocaleDateString()}: "\${e.text}"\`
        ).join('\\n');
        contextString += \`[RETRIEVED CONTEXT]\\n\${matchesText}\\n\\n\`;
    }

    // Include last 3 complete turns = 6 messages + 1 user prompt from history
    const recentHistoryMsgs = conversationHistory.slice(-6);
    if (recentHistoryMsgs.length > 0) {
        const historyText = recentHistoryMsgs.map(msg => 
            \`User: \${msg.sender === 'user' ? msg.text : ''}\\nAssistant: \${msg.sender === 'ai' ? msg.text : ''}\`
        ).join('\\n');
        contextString += \`[CONVERSATION HISTORY]\\n\${historyText}\\n\\n\`;
    }

    const GROUNDING_RULES = \`
GROUNDING RULES (apply to every response):
- Only state facts present in [USER PROFILE], [LIVE HABITS], 
  [ACTIVE GOALS], [RECENT ENTRIES], or [RETRIEVED CONTEXT] above.
- Do not cite statistics, percentages, or numeric claims from 
  previous Assistant responses in conversation history — those 
  are not verified sources of user data.
- Only use completion rates and streak counts that are explicitly 
  provided in [LIVE HABITS]. Do not calculate or estimate your own.
- If you cannot ground a claim in the labeled context above, 
  do not make it.
\`;
    contextString += GROUNDING_RULES;

    return contextString;
}

export const getChatResponseStream = async (userId: string, history: Message[], isDemoUser: boolean) => {
    const userMessage = history[history.length - 1]?.text ?? '';
    
    const [userProfile, recentContext, retrieval] = await Promise.all([
        db.getUserProfile(userId),
        db.getRecentAmbientContext(userId),
        adaptiveRetrieval(userId, userMessage, history.slice(0, -1).map(m => m.text), isDemoUser)
    ]);
    
    const personality = getPersonality(DEFAULT_PERSONALITY);
    const systemInstruction = buildSystemContext(
        userProfile,
        recentContext,
        retrieval,
        history.slice(0, -1),
        personality.systemPrompt
    );
    
    const historyContext = history.slice(0, -1)
        .filter(m => m.sender === 'ai')
        .slice(-2)
        .map(m => typeof m.text === 'string' ? m.text : '')
        .join('\\n---\\n');
        
    const profileTokens = Math.ceil(userProfile.length / 4);
    const recentTokens = Math.ceil(recentContext.length / 4);
    
    let retrievedTokens = 0;
    let retrievedContextText = '';
    if (retrieval && retrieval.entries && retrieval.entries.length > 0) {
        retrievedContextText = retrieval.entries.map((e: any) => 
            \`- On \${new Date(e.timestamp).toLocaleDateString()}: "\${e.text}"\`
        ).join('\\n');
        retrievedTokens = Math.ceil(retrievedContextText.length / 4);
    }
    
    const historyTokens = Math.ceil(historyContext.length / 4);

    enrichLastAIMeta({
        profile_tokens: profileTokens,
        recent_tokens: recentTokens,
        retrieved_tokens: retrievedTokens,
        history_tokens: historyTokens,
        rag_matches: retrieval ? retrieval.matches.map((m: any) => ({
            type: 'entry',
            item: m,
            matchText: m.text,
            timestamp: m.timestamp,
            similarity: m.similarity ?? null
        })) : [],
        query_intent: retrieval?.intent,
        retrieval_strategy: retrieval?.retrievalStrategy,
        classifier_latency_ms: retrieval?.classifierLatencyMs,
        embedding_latency_ms: retrieval?.embeddingLatencyMs
    });

    const chatHistory = history.slice(0, -1).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
    }));

    let result;
    try {
        result = await callAIProxy<{ response: string }>('chat', {
            history: chatHistory,
            userPrompt: userMessage,
            systemInstruction
        });

        if (retrieval?.intent) {
            callAIProxy('evaluate-response', {
                userMessage,
                profileContext: userProfile,
                recentContext,
                retrievedContext: retrievedContextText,
                historyContext,
                aiResponse: result.response,
                queryIntent: retrieval.intent.intent
            }).then((evalResult: any) => {
                console.log("[RAGAS EVALUATION]", evalResult);
                enrichLastAIMeta({
                  // Store evaluation if needed
                });
            }).catch(console.error);
        }

    } catch (e: any) {
        console.error("[AI] Chat failed:", e);
        if (e && e.name === 'DemoLimitError') throw e;
        result = { response: "I'm having trouble connecting right now — please try again in a moment. Your data is safe." };
    }

    const unwrappedText = unwrapResponse(result.response || '');
    return {
        [Symbol.asyncIterator]: async function* () {
            yield { text: unwrappedText };
        }
    };
}

`;

const newCode = code.substring(0, adaptiveRetrievalMatch) + replacement + code.substring(endOfFile);
fs.writeFileSync(file, newCode);
console.log("Rewrite successful");
