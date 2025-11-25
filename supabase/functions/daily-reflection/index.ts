// Supabase Edge Function: Daily Reflection Auto-Generator
// Runs every night at 11 PM to generate reflections for all users

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Create Supabase client with service role key (admin access)
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        console.log('[Daily Reflection] Starting batch generation...')

        // Get all user IDs
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id')

        if (profilesError) {
            throw profilesError
        }

        console.log(`[Daily Reflection] Found ${profiles?.length || 0} users`)

        let successCount = 0
        let errorCount = 0
        const errors: any[] = []

        // Generate reflection for each user
        for (const profile of profiles || []) {
            try {
                await generateDailyReflection(supabase, profile.id)
                successCount++
            } catch (error) {
                errorCount++
                errors.push({ userId: profile.id, error: error.message })
                console.error(`[Daily Reflection] Error for user ${profile.id}:`, error)
            }
        }

        console.log(`[Daily Reflection] Complete. Success: ${successCount}, Errors: ${errorCount}`)

        return new Response(
            JSON.stringify({
                success: true,
                processed: profiles?.length || 0,
                successCount,
                errorCount,
                errors: errors.length > 0 ? errors : undefined
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        )
    } catch (error) {
        console.error('[Daily Reflection] Fatal error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
            }
        )
    }
})

// ============================================
// Generate Daily Reflection for One User
// ============================================
async function generateDailyReflection(supabase: any, userId: string) {
    console.log(`[Daily Reflection] Processing user: ${userId}`)

    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    // 1. Check if reflection already exists for today
    const { data: existing } = await supabase
        .from('reflections')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'daily')
        .eq('date', today)
        .single()

    if (existing) {
        console.log(`[Daily Reflection] Already exists for user ${userId}, skipping`)
        return
    }

    // 2. Fetch today's data
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const [entriesRes, habitsRes, intentionsRes] = await Promise.all([
        supabase
            .from('entries')
            .select('*')
            .eq('user_id', userId)
            .gte('timestamp', todayStart.toISOString())
            .lte('timestamp', todayEnd.toISOString()),

        supabase
            .from('habits')
            .select('*, habit_logs(*)')
            .eq('user_id', userId),

        supabase
            .from('intentions')
            .select('*')
            .eq('user_id', userId)
            .eq('timeframe', 'daily')
            .gte('created_at', todayStart.toISOString())
    ])

    const entries = entriesRes.data || []
    const habits = habitsRes.data || []
    const intentions = intentionsRes.data || []

    // 3. Skip if no activity today
    if (entries.length === 0 && habits.length === 0 && intentions.length === 0) {
        console.log(`[Daily Reflection] No activity for user ${userId}, skipping`)
        return
    }

    // 4. Generate AI summary (call Gemini via your API key)
    const summary = await generateAISummary(entries, habits, intentions, 'daily')

    // 5. Save reflection
    const { error: insertError } = await supabase
        .from('reflections')
        .insert({
            user_id: userId,
            type: 'daily',
            date: today,
            summary: summary,
            auto_generated: true,
            timestamp: new Date().toISOString()
        })

    if (insertError) {
        throw insertError
    }

    console.log(`[Daily Reflection] Successfully generated for user ${userId}`)
}

// ============================================
// AI Summary Generation (Placeholder)
// ============================================
async function generateAISummary(
    entries: any[],
    habits: any[],
    intentions: any[],
    type: string
): Promise<string> {
    // TODO: Replace with actual Gemini API call
    // For now, return a simple summary

    const entryCount = entries.length
    const habitCount = habits.length
    const intentionCount = intentions.length

    const sentiments = entries
        .filter(e => e.primary_sentiment)
        .map(e => e.primary_sentiment)

    const dominantSentiment = sentiments.length > 0
        ? sentiments[0]
        : 'neutral'

    return `Today you had ${entryCount} thoughts, tracked ${habitCount} habits, and set ${intentionCount} intentions. Your dominant mood was ${dominantSentiment}. Keep building consistency.`
}
