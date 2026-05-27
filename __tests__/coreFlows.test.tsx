import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from '../services/dbService';
import { supabase } from '../services/supabaseClient';

// Test Suite for Core User Flows (Logic Verification)
describe('Core User Flows', () => {

    // Universal Chain Mock
    // This allows any method to be called and return the same chain headers
    const mockChain = {
        select: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        upsert: vi.fn(),
        eq: vi.fn(),
        neq: vi.fn(),
        gt: vi.fn(),
        lt: vi.fn(),
        gte: vi.fn(),
        lte: vi.fn(),
        is: vi.fn(),
        in: vi.fn(),
        contains: vi.fn(),
        order: vi.fn(),
        limit: vi.fn(),
        single: vi.fn(),
        maybeSingle: vi.fn()
    };

    // Make functions return the chain itself (circular)
    Object.keys(mockChain).forEach(key => {
        (mockChain as any)[key].mockReturnValue(mockChain);
    });

    // Special cases for terminators if needed
    (mockChain.single as any).mockResolvedValue({ data: { id: 'test-id' }, error: null });
    (mockChain.maybeSingle as any).mockResolvedValue({ data: null, error: null });

    // Setup aliases
    const mockSelect = mockChain.select;
    const mockInsert = mockChain.insert;
    const mockUpdate = mockChain.update;
    const mockDelete = mockChain.delete;
    const mockUpsert = mockChain.upsert;
    const mockEq = mockChain.eq;

    const mockFrom = vi.fn().mockReturnValue(mockChain);

    beforeEach(() => {
        vi.clearAllMocks();
        (supabase.from as any) = mockFrom;
        (supabase as any).functions = {
            invoke: vi.fn().mockResolvedValue({ data: {}, error: null })
        };
    });

    // --- 1. Journaling Flow ---
    describe('Journaling Flow', () => {
        it('addEntry should insert data with correct structure', async () => {
            const entryData = {
                title: 'Test Entry',
                text: 'Hello World',
                primary_sentiment: 'Joyful' as const,
                timestamp: new Date().toISOString(),
                tags: ['test'],
                emoji: '🧪'
            };
            await db.addEntry('user-1', entryData);

            expect(supabase.from).toHaveBeenCalledWith('entries');
            // Check that the insert was called with the merged user_id
            expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
                user_id: 'user-1',
                title: 'Test Entry',
                text: 'Hello World'
            }));
        });

        it('updateEntry should update specific fields', async () => {
            const updates = { text: 'Updated Text' };
            await db.updateEntry('entry-1', updates);

            expect(mockUpdate).toHaveBeenCalledWith(updates);
        });
    });

    // --- 2. Habit Flow ---
    describe('Habit Flow', () => {
        it('addHabit should insert new habit', async () => {
            await db.addHabit('user-1', 'Gym', '🏋️', 'Health', 'daily');

            expect(supabase.from).toHaveBeenCalledWith('habits');
            expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
                user_id: 'user-1',
                name: 'Gym',
                frequency: 'daily'
            }));
        });

        it('syncHabitCompletion (Complete) should UPSERT a log', async () => {
            await db.syncHabitCompletion('user-1', 'habit-1', 'daily', new Date().toISOString(), true);

            // Should insert into habit_logs
            expect(supabase.from).toHaveBeenCalledWith('habit_logs');
            expect(mockInsert).toHaveBeenCalled();
        });

        it('syncHabitCompletion (Un-Complete) should DELETE a log', async () => {
            await db.syncHabitCompletion('user-1', 'habit-1', 'daily', new Date().toISOString(), false);

            expect(supabase.from).toHaveBeenCalledWith('habit_logs');
            expect(mockDelete).toHaveBeenCalled();
        });
    });

    // --- 3. Intention (Goal) Flow ---
    describe('Intention Flow', () => {
        it('addIntention should create a goal', async () => {
            // Fix: Pass just userId, text, and timeframe string (if that was the signature) OR Fix signature usage
            // Looking at dbService.ts: addIntention(userId, text, dueDate, isLifeGoal, isStarred)
            // But test tried ('user-1', 'Read Book', 'weekly'). 'weekly' is not a Date.
            // Adjusting test to pass null for date and let default take over or pass a valid date.

            await db.addIntention('user-1', 'Read Book', new Date());

            expect(supabase.from).toHaveBeenCalledWith('intentions');
            expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
                text: 'Read Book',
                status: 'pending'
            }));
        });

        it('updateIntentionStatus should toggle completion', async () => {
            await db.updateIntentionStatus('goal-1', 'completed');

            // It also updates completed_at, so we check for partial match
            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
        });
    });

    // --- 4. Profile/Onboarding Flow ---
    describe('Profile Flow', () => {
        it('createProfile should initialize user profile', async () => {
            const mockUser = {
                id: 'user-1',
                email: 'test@example.com',
                user_metadata: { avatar_url: 'http://test.com/avatar.jpg' }
            };

            // Pass the mock user object as expected
            await db.createProfile(mockUser as any);

            expect(supabase.from).toHaveBeenCalledWith('profiles');
            // Uses upsert, not insert
            expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({
                id: 'user-1',
                email: 'test@example.com'
            }), expect.anything());
        });
    });
});
