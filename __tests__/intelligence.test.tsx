import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as gemini from '../services/geminiService';
import * as reflection from '../services/reflectionService';
import { callAIProxy } from '../services/geminiClient';
import type { UserContext, Entry, Intention, Habit } from '../types';

// Mock the network layer
vi.mock('../services/geminiClient', () => ({
    callAIProxy: vi.fn(),
    verifyApiKey: vi.fn(),
    GEMINI_API_KEY_AVAILABLE: true,
    getAiClient: vi.fn(),
    enrichLastAIMeta: vi.fn(),
    getLastAIMeta: vi.fn().mockReturnValue({ tokens_in: 100 })
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

});
