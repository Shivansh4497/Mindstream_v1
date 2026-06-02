import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as gemini from '../services/geminiService';
import * as reflection from '../services/reflectionService';
import { callAIProxy } from '../services/geminiClient';
import type { UserContext, Entry, Intention, Habit } from '../types';
import { supabase } from '../services/supabaseClient';
import * as db from '../services/dbService';

// Mock the network layer
vi.mock('../services/geminiClient', () => ({
    callAIProxy: vi.fn(),
    verifyApiKey: vi.fn(),
    GEMINI_API_KEY_AVAILABLE: true,
    getAiClient: vi.fn(),
    enrichLastAIMeta: vi.fn(),
    getLastAIMeta: vi.fn().mockReturnValue({ tokens_in: 100 })
}));

vi.mock('../services/queryClassifier', () => ({
    classifyQueryIntent: vi.fn().mockResolvedValue({
        intent: 'SEMANTIC_TOPIC',
        hasTemporalIntent: false,
        temporalExpression: null,
        topicKeywords: [],
        detectedTopic: null,
        startDate: null,
        endDate: null,
        confidence: 0.9,
        reasoning: 'mock classification'
    })
}));

describe('Intelligence Layer Verification', () => {

    const mockDate = new Date('2026-01-30T12:00:00Z');

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // --- 1. RAG Context Builder ---
    describe('RAG Context Builder (buildSystemContext)', () => {
        it('should correctly format recent entries into the prompt', () => {
            const context: UserContext = {
                recentEntries: [
                    {
                        id: '1', user_id: 'u1', text: 'I am feeling great today', timestamp: mockDate.toISOString(),
                        primary_sentiment: 'Joyful', emoji: '😊', title: 'Good day', tags: []
                    }
                ],
                pendingIntentions: [],
                activeHabits: [],
                searchResults: [],
                latestReflection: null
            };

            const prompt = gemini.buildSystemContext(context);

            expect(prompt).toContain('I wrote: "I am feeling great today"');
            expect(prompt).toContain('feeling Joyful');
        });

        it('should include habits and goals', () => {
            const context: UserContext = {
                recentEntries: [],
                pendingIntentions: [
                    { id: 'g1', user_id: 'u1', text: 'Run a marathon', timeframe: 'yearly', status: 'pending', created_at: mockDate.toISOString() } as Intention
                ],
                activeHabits: [
                    { id: 'h1', user_id: 'u1', name: 'Drink Water', category: 'Health', current_streak: 5, frequency: 'daily' } as Habit
                ],
                searchResults: [],
                latestReflection: null,
                recentReflections: []
            };

            const prompt = gemini.buildSystemContext(context);

            expect(prompt).toContain('My [yearly] goal is: "Run a marathon"');
            expect(prompt).toContain('Habit: Drink Water');
            expect(prompt).toContain('Streak: 5');
        });

        it('should handle temporal memory (similar moments)', () => {
            const context: UserContext = {
                recentEntries: [],
                pendingIntentions: [],
                activeHabits: [],
                searchResults: [],
                latestReflection: null,
                similarMoments: [
                    {
                        matchType: 'emotional',
                        entry: { id: 'old', user_id: 'u1', text: 'Old anxiety', timestamp: '2025-01-01', primary_sentiment: 'Anxious' } as Entry,
                        score: 0.9
                    }
                ]
            };

            const prompt = gemini.buildSystemContext(context);

            expect(prompt).toContain('SIMILAR PAST MOMENTS');
            expect(prompt).toContain('[EMOTIONAL MATCH]');
            expect(prompt).toContain('Old anxiety');
        });

        it('should append TEMPORAL_SUMMARY instructions when intent is TEMPORAL_SUMMARY', () => {
            const context: UserContext = {
                recentEntries: [],
                pendingIntentions: [],
                activeHabits: [],
                searchResults: [],
                latestReflection: null
            };
            const mockRetrieval = {
                intent: {
                    intent: 'TEMPORAL_SUMMARY' as const,
                    hasTemporalIntent: true,
                    temporalExpression: 'last 7 days',
                    topicKeywords: [],
                    detectedTopic: null,
                    startDate: new Date(),
                    endDate: new Date(),
                    confidence: 0.9,
                    reasoning: ''
                },
                queryIntent: {
                    intent: 'TEMPORAL_SUMMARY' as const,
                    hasTemporalIntent: true,
                    temporalExpression: 'last 7 days',
                    topicKeywords: [],
                    detectedTopic: null,
                    startDate: new Date(),
                    endDate: new Date(),
                    confidence: 0.9,
                    reasoning: ''
                },
                matches: [],
                entries: [],
                retrievalStrategy: '',
                strategy: ''
            };

            const prompt = gemini.buildSystemContext(context, mockRetrieval);

            expect(prompt).toContain("Base your summary only on the journal entries provided in the context below");
            expect(prompt).toContain("Do not reference specific events, activities, or dates that are not present in these entries");
        });

        it('should append BEHAVIORAL instructions when intent is BEHAVIORAL', () => {
            const context: UserContext = {
                recentEntries: [],
                pendingIntentions: [],
                activeHabits: [],
                searchResults: [],
                latestReflection: null
            };
            const mockRetrieval = {
                intent: {
                    intent: 'BEHAVIORAL' as const,
                    hasTemporalIntent: false,
                    temporalExpression: null,
                    topicKeywords: [],
                    detectedTopic: null,
                    startDate: null,
                    endDate: null,
                    confidence: 0.9,
                    reasoning: ''
                },
                queryIntent: {
                    intent: 'BEHAVIORAL' as const,
                    hasTemporalIntent: false,
                    temporalExpression: null,
                    topicKeywords: [],
                    detectedTopic: null,
                    startDate: null,
                    endDate: null,
                    confidence: 0.9,
                    reasoning: ''
                },
                matches: [],
                entries: [],
                retrievalStrategy: '',
                strategy: ''
            };

            const prompt = gemini.buildSystemContext(context, mockRetrieval);

            expect(prompt).toContain('CRITICAL INSTRUCTION FOR BEHAVIORAL INTENT');
            expect(prompt).toContain('Only state completion rates and consistency percentages that are explicitly calculated and provided in the habits data below. Do not estimate or calculate your own percentages.');
        });
    });

    // --- 2. Reflection Service ---
    describe('Reflection Service', () => {
        it('generateReflection should call AI proxy with formatted data', async () => {
            const entries: Entry[] = [
                { id: '1', user_id: 'u1', text: 'Entry 1', timestamp: mockDate.toISOString(), primary_sentiment: 'Neutral', title: 'Custom Title', emoji: '😐', tags: [] }
            ];
            const intentions: Intention[] = [];

            // Mock successful AI response
            (callAIProxy as any).mockResolvedValue({
                summary: 'You had a neutral day.',
                suggestions: []
            });

            const result = await reflection.generateReflection(entries, intentions, [], [], '2026-01-30');

            expect(callAIProxy).toHaveBeenCalledWith('daily-reflection', expect.objectContaining({
                entries: expect.stringContaining('Entry 1'),
                intentions: expect.stringContaining('No active goals')
            }));

            expect(result.summary).toBe('You had a neutral day.');
        });
    });

    // --- 3. Chat Logic ---
    describe('Chat Logic', () => {
        it('getChatResponseStream should build context and call AI', async () => {
            const history = [{ id: 'm1', sender: 'user', text: 'Hello' }];
            const context: UserContext = {
                recentEntries: [],
                pendingIntentions: [],
                activeHabits: [],
                searchResults: [],
                latestReflection: null
            };

            // Mock successful response
            (callAIProxy as any).mockResolvedValue({ response: 'Hi there!' });

            const stream = await gemini.getChatResponseStream(history as any, context);

            // Consuming the generator
            let result = '';
            for await (const chunk of stream) {
                result += chunk.text;
            }

            expect(callAIProxy).toHaveBeenCalledWith('chat', expect.objectContaining({
                userPrompt: 'Hello',
                systemInstruction: expect.stringContaining('MINDSTREAM CHAT')
            }));

            expect(result).toBe('Hi there!');
        });
    });

    // --- 4. Adaptive Retrieval ---
    describe('Adaptive Retrieval Fallback', () => {
        it('should call semanticSearchEntries with 0.82, and fallback to 0.70 when embedding is undefined and 0 matches found', async () => {
            const semanticSearchSpy = vi.spyOn(db, 'semanticSearchEntries')
                .mockImplementation(async (userId, queryText, matchCount, matchThreshold) => {
                    if (matchThreshold === 0.82) {
                        return [];
                    }
                    return [{ id: '1' } as any];
                });
            vi.spyOn(db, 'searchUniversal').mockResolvedValue([]);
            
            const result = await gemini.adaptiveRetrieval('user-123', 'My test query', []);
            
            // Check that first call was made with threshold 0.82
            expect(semanticSearchSpy).toHaveBeenNthCalledWith(
                1,
                'user-123',
                'My test query',
                5,
                0.82,
                undefined,
                undefined,
                undefined
            );
            
            // Check that second (fallback) call was made with threshold 0.70
            expect(semanticSearchSpy).toHaveBeenNthCalledWith(
                2,
                'user-123',
                'My test query',
                5,
                0.70,
                undefined,
                undefined,
                undefined
            );
            
            expect(result.retrievalStrategy).toBe('Vector search · threshold 0.70 (fallback)');
        });

        it('should NOT fallback to 0.70 in SEMANTIC_TOPIC if embedding is defined', async () => {
            const originalFunctions = supabase ? (supabase as any).functions : null;
            if (supabase) {
                (supabase as any).functions = {
                    invoke: vi.fn().mockResolvedValue({
                        data: { embedding: [0.1, 0.2, 0.3] },
                        error: null
                    })
                };
            }
            
            const semanticSearchSpy = vi.spyOn(db, 'semanticSearchEntries').mockResolvedValue([]);
            vi.spyOn(db, 'searchUniversal').mockResolvedValue([]);
            
            const result = await gemini.adaptiveRetrieval('user-123', 'My test query', []);
            
            // Restore original functions
            if (supabase && originalFunctions) {
                (supabase as any).functions = originalFunctions;
            }
            
            expect(semanticSearchSpy).toHaveBeenCalledTimes(1);
            expect(semanticSearchSpy).toHaveBeenNthCalledWith(
                1,
                'user-123',
                'My test query',
                5,
                0.82,
                undefined,
                undefined,
                [0.1, 0.2, 0.3]
            );
            expect(result.retrievalStrategy).toBe('KEYWORD_FALLBACK');
        });
    });

});
