import { useEffect, useRef, useCallback, useState } from 'react';
import * as db from '../services/dbService';
import type { Message } from '../types';

export const INITIAL_GREETING = "Hey! I'm here to help you reflect on what's on your mind. I can see your journal entries and help you spot patterns. What's going on today?";

const DEBOUNCE_MS = 2000;       // write to DB 2s after last message

export const useChatSession = (
  userId: string | null,
  messages: Message[],
  personality: string,
  setMessages: (msgs: Message[]) => void
) => {
  const sessionIdRef = useRef<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialised = useRef(false);
  const [isResumed, setIsResumed] = useState(false);

  // ── On mount: load or create session ──────────────────
  useEffect(() => {
    if (!userId || isInitialised.current) return;
    isInitialised.current = true;

    const init = async () => {
      const active = await db.getActiveChatSession(userId);

      if (active && active.messages.length > 0) {
        // Resume existing session
        sessionIdRef.current = active.id;
        setMessages(active.messages);
        setIsResumed(true);
        console.log('[ChatSession] Resumed session:', active.id);
      } else {
        // Start new session
        const id = await db.createChatSession(userId, personality);
        sessionIdRef.current = id;
        setMessages([{ sender: 'ai', text: INITIAL_GREETING, id: 'initial' }]);
        console.log('[ChatSession] New session:', id);
      }
    };

    init();
  }, [userId, personality, setMessages]);

  // ── On every message change: debounced DB write ────────
  useEffect(() => {
    if (!sessionIdRef.current || !userId || messages.length === 0) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      db.updateChatSession(sessionIdRef.current!, messages, personality);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [messages, personality, userId]);

  // ── Manual flush on tab close / unmount ────────────────
  useEffect(() => {
    const flush = () => {
      if (sessionIdRef.current && messages.length > 0) {
        // sendBeacon for reliability on tab close
        const payload = JSON.stringify({
          action: 'flush-session',
          sessionId: sessionIdRef.current,
          messages,
          personality
        });
        navigator.sendBeacon('/api/flush-session', payload);
        // Also try direct (may be cancelled but worth it)
        db.updateChatSession(sessionIdRef.current, messages, personality);
      }
    };

    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, [messages, personality]);

  // ── Expose session ID for extractions ──────────────────
  const getSessionId = useCallback(() => sessionIdRef.current, []);

  return { getSessionId, isResumed };
};
