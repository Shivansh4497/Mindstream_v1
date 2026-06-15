import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

export function useChatSeed(userId: string | undefined) {
  const [seed, setSeed] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setSeed(null);
      return;
    }

    const fetchSeed = async () => {
      const cutoff = new Date();
      cutoff.setHours(cutoff.getHours() - 48);

      const { data } = await supabase
        .from('entries')
        .select('chat_seed, timestamp')
        .eq('user_id', userId)
        .not('chat_seed', 'is', null)
        .gte('timestamp', cutoff.toISOString())
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      setSeed(data?.chat_seed ?? null);
    };

    fetchSeed();
  }, [userId]);

  return seed;
}
