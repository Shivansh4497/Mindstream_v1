// Supabase Edge Function: Weekly Pattern Detection
// Runs every Sunday at 9 AM to generate insight cards for all users

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
        // Create Supabase client with service role key
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        console.log('[Weekly Patterns] Starting batch analysis...')

        // Get all user IDs
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id')

        if (profilesError) {
            throw profilesError
        }

        console.log(`[Weekly Patterns] Found ${profiles?.length || 0} users`)

        let successCount = 0
        let errorCount = 0
        let insightsCreated = 0

        // Analyze patterns for each user
        for (const profile of profiles || []) {
            try {
                const count = await detectWeeklyPatterns(supabase, profile.id)
                insightsCreated += count
                successCount++
            } catch (error) {
                errorCount++
                console.error(`[Weekly Patterns] Error for user ${profile.id}:`, error)
            }
        }

        console.log(`[Weekly Patterns] Complete. Users: ${successCount}, Insights: ${insightsCreated}, Errors: ${errorCount}`)

        return new Response(
            JSON.stringify({
                success: true,
                usersProcessed: successCount,
                insightsCreated,
                errorCount
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        )
    } catch (error) {
        console.error('[Weekly Patterns] Fatal error:', error)
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
// Detect Weekly Patterns for One User
// ============================================
async function detectWeeklyPatterns(supabase: any, userId: string): Promise<number> {
    console.log(`[Weekly Patterns] Analyzing user: ${userId}`)

    // 1. Fetch last 7 days of data
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const [entriesRes, habitsRes] = await Promise.all([
        supabase
            .from('entries')
            .select('*')
            .eq('user_id', userId)
            .gte('timestamp', sevenDaysAgo.toISOString()),

        supabase
            .from('habits')
            .select('*, habit_logs(*)')
            .eq('user_id', userId)
    ])

    const entries = entriesRes.data || []
    const habits = habitsRes.data || []

    // 2. Skip if insufficient data
    if (entries.length < 3) {
        console.log(`[Weekly Patterns] Insufficient data for user ${userId}`)
        return 0
    }

    let insightCount = 0

    // 3. Pattern Detection: Tag Frequency
    const tagCounts: Record<string, number> = {}
    entries.forEach(entry => {
        entry.tags?.forEach((tag: string) => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1
        })
    })

    const topTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .filter(([, count]) => count >= 3)

    if (topTags.length > 0) {
        const tags = topTags.map(([tag]) => tag)
        const { error } = await supabase
            .from('insight_cards')
            .insert({
                user_id: userId,
                type: 'pattern',
                title: `You're thinking about: ${tags.join(', ')}`,
                content: `These themes appeared ${topTags[0][1]}+ times this week. They seem to be on your mind.`,
                metadata: { tags }
            })

        if (!error) insightCount++
    }

    // 4. Pattern Detection: Sentiment Trend
    const sentiments = entries
        .filter(e => e.primary_sentiment)
        .map(e => ({
            sentiment: e.primary_sentiment,
            timestamp: new Date(e.timestamp)
        }))

    if (sentiments.length >= 5) {
        const sentimentScores: Record<string, number> = {
            'Joyful': 2, 'Grateful': 2, 'Proud': 2, 'Hopeful': 1, 'Content': 1,
            'Anxious': -2, 'Frustrated': -2, 'Sad': -2, 'Overwhelmed': -2, 'Confused': -1,
            'Reflective': 0, 'Inquisitive': 0, 'Observational': 0
        }

        const midpoint = Math.floor(sentiments.length / 2)
        const firstHalf = sentiments.slice(0, midpoint)
        const secondHalf = sentiments.slice(midpoint)

        const avgFirst = firstHalf.reduce((sum, s) => sum + (sentimentScores[s.sentiment] || 0), 0) / firstHalf.length
        const avgSecond = secondHalf.reduce((sum, s) => sum + (sentimentScores[s.sentiment] || 0), 0) / secondHalf.length

        const change = avgSecond - avgFirst
        const percentChange = Math.round(Math.abs(change) * 50) // Scale to percentage

        if (Math.abs(change) > 0.5) {
            const direction = change > 0 ? 'improving' : 'declining'
            const { error } = await supabase
                .from('insight_cards')
                .insert({
                    user_id: userId,
                    type: 'correlation',
                    title: `Mood ${direction} this week`,
                    content: `Your emotional state shifted ${percentChange}% ${direction === 'improving' ? 'positively' : 'negatively'} compared to early this week.`,
                    metadata: { sentiment_shift: percentChange }
                })

            if (!error) insightCount++
        }
    }

    console.log(`[Weekly Patterns] Generated ${insightCount} insights for user ${userId}`)
    return insightCount
}
