import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Volume2, VolumeX, Share2, Check, FileText, Loader2 } from 'lucide-react';
import { Message, AISuggestion, Entry, ExtractionChip } from '../types';
import { MessageBubble } from './MessageBubble';
import { speak, stopSpeaking, initializeTTS } from '../utils/tts';
import { ChatSharingModal } from './ChatSharingModal';
import { createChatFeedback, updateChatFeedback, logEvent, EntryPoint, ChatMessage, saveChatTakeaway, updateChatTakeaway } from '../services/dbService';
import { callAIProxy } from '../services/geminiClient';
import { ChatEmptyState as ChatIllustration } from './illustrations/ChatEmptyState';
import { glass } from '../styles/glass';

interface ChatViewProps {
  messages: Message[];
  isLoading: boolean;
  onAddSuggestion: (suggestion: AISuggestion) => void;
  userId?: string;
  currentPersonality?: string;
  entryPoint?: EntryPoint;
  onTakeawaySaved?: (entry: Entry) => void;
  setToast?: (toast: { message: string; action?: { label: string; onClick: () => void } } | null) => void;
  isDemo?: boolean;
  isResumed?: boolean;
  onConfirmExtraction?: (chip: ExtractionChip) => void;
  onUndoExtraction?: (chip: ExtractionChip) => void;
  seed?: string | null;
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  isLoading,
  onAddSuggestion,
  userId,
  currentPersonality = 'stoic',
  entryPoint = 'organic',
  onTakeawaySaved,
  setToast,
  isDemo = false,
  isResumed = false,
  onConfirmExtraction,
  onUndoExtraction,
  seed
}) => {
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const [ttsEnabled, setTtsEnabled] = useState(() => {
    const saved = localStorage.getItem('ttsEnabled');
    return saved ? JSON.parse(saved) : false;
  });
  const lastMessageRef = useRef<string>('');

  // Chat sharing state
  const [chatSharingEnabled, setChatSharingEnabled] = useState(() => {
    const saved = localStorage.getItem('chatSharingEnabled');
    return saved ? JSON.parse(saved) : false;
  });

  // Default sharing to true in demo mode
  useEffect(() => {
    if (isDemo) {
      setChatSharingEnabled(true);
    }
  }, [isDemo]);
  const [chatSharingPromptShown, setChatSharingPromptShown] = useState(() => {
    const saved = localStorage.getItem('chatSharingPromptShown');
    return saved ? JSON.parse(saved) : false;
  });
  const [showSharingModal, setShowSharingModal] = useState(false);

  // Session ID for chat feedback - INSERT on first save, UPDATE on subsequent
  const feedbackSessionId = useRef<string | null>(null);
  const wasLoadingRef = useRef(false);
  const lastSavedMessageCount = useRef(0);

  // Chat Takeaways state
  const [isSavingTakeaway, setIsSavingTakeaway] = useState(false);
  const [lastSavedTakeawayId, setLastSavedTakeawayId] = useState<string | null>(null);
  const [takeawayToast, setTakeawayToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Calculate if takeaway button should show (3+ exchanges AND 20+ user words)
  const showTakeawayButton = useMemo(() => {
    const userMessages = messages.filter(m => m.sender === 'user');
    const userWordCount = userMessages.reduce(
      (sum, m) => sum + (m.text?.split(/\s+/).length || 0), 0
    );
    return messages.length >= 6 && userWordCount >= 20;
  }, [messages]);

  // Auto-dismiss takeaway toast after 3 seconds
  useEffect(() => {
    if (takeawayToast) {
      const timer = setTimeout(() => setTakeawayToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [takeawayToast]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Initialize TTS on mount
  useEffect(() => {
    initializeTTS();
  }, []);

  // Save TTS preference
  useEffect(() => {
    localStorage.setItem('ttsEnabled', JSON.stringify(ttsEnabled));
  }, [ttsEnabled]);

  // Save chat sharing preference
  useEffect(() => {
    localStorage.setItem('chatSharingEnabled', JSON.stringify(chatSharingEnabled));
  }, [chatSharingEnabled]);

  // Save prompt shown state
  useEffect(() => {
    localStorage.setItem('chatSharingPromptShown', JSON.stringify(chatSharingPromptShown));
  }, [chatSharingPromptShown]);

  // Count user messages and trigger prompt after 3rd
  // ONLY show if: not shown before, not currently showing, AND sharing not already enabled
  useEffect(() => {
    const userMessages = messages.filter(m => m.sender === 'user');

    // Count user messages and trigger prompt after 3rd
    // ONLY show if: not shown before, not currently showing, AND sharing not already enabled
    // Always bypassed in demo mode
    if (!isDemo && userMessages.length >= 3 && !chatSharingPromptShown && !showSharingModal && !chatSharingEnabled) {
      setShowSharingModal(true);
      if (userId) {
        logEvent(userId, 'chat_sharing_prompt_shown');
      }
    }
  }, [messages, chatSharingPromptShown, showSharingModal, chatSharingEnabled, userId, isDemo]);

  // Save/update chat feedback after AI finishes responding
  // INSERT on first save, UPDATE on subsequent saves
  useEffect(() => {
    const saveOrUpdateFeedback = async () => {
      // Detect when AI just finished responding
      if (wasLoadingRef.current && !isLoading && chatSharingEnabled && userId) {
        // Only save if we have new messages since last save
        if (messages.length > lastSavedMessageCount.current && messages.length > 1) {
          const chatMessages: ChatMessage[] = messages.map(m => ({
            sender: m.sender,
            text: m.text,
            timestamp: new Date().toISOString()
          }));

          if (feedbackSessionId.current === null) {
            // First save - INSERT
            const newId = await createChatFeedback(userId, chatMessages, currentPersonality, entryPoint);
            if (newId) {
              feedbackSessionId.current = newId;
              lastSavedMessageCount.current = messages.length;
              logEvent(userId, 'chat_feedback_session_saved', {
                message_count: chatMessages.length,
                entry_point: entryPoint,
                action: 'created'
              });
            }
          } else {
            // Subsequent save - UPDATE
            const success = await updateChatFeedback(feedbackSessionId.current, chatMessages);
            if (success) {
              lastSavedMessageCount.current = messages.length;
              // Don't log every update - too noisy
            }
          }
        }
      }
    };

    saveOrUpdateFeedback();
    wasLoadingRef.current = isLoading;
  }, [isLoading, chatSharingEnabled, userId, messages, currentPersonality, entryPoint]);

  // Auto-speak AI responses
  useEffect(() => {
    if (!ttsEnabled || isLoading) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.sender === 'ai' && lastMessage.text && lastMessage.text !== lastMessageRef.current) {
      lastMessageRef.current = lastMessage.text;
      speak(lastMessage.text);
    }
  }, [messages, ttsEnabled, isLoading]);

  // Stop speaking when component unmounts or TTS is disabled
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    if (!ttsEnabled) {
      stopSpeaking();
    }
  }, [ttsEnabled]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const toggleTTS = () => {
    setTtsEnabled(!ttsEnabled);
    if (ttsEnabled) {
      stopSpeaking();
    }
  };

  const toggleChatSharing = useCallback(() => {
    const newValue = !chatSharingEnabled;
    setChatSharingEnabled(newValue);
    if (userId) {
      logEvent(userId, newValue ? 'chat_sharing_enabled' : 'chat_sharing_disabled');
    }
  }, [chatSharingEnabled, userId]);

  const handleAcceptSharing = useCallback(() => {
    setChatSharingEnabled(true);
    setChatSharingPromptShown(true);
    setShowSharingModal(false);
    if (userId) {
      logEvent(userId, 'chat_sharing_prompt_accepted');
      logEvent(userId, 'chat_sharing_enabled');
    }
  }, [userId]);

  const handleDeclineSharing = useCallback(() => {
    setChatSharingPromptShown(true);
    setShowSharingModal(false);
    if (userId) {
      logEvent(userId, 'chat_sharing_prompt_declined');
    }
  }, [userId]);

  // Chat Takeaways: Save AI-generated summary
  const handleSaveTakeaway = useCallback(async () => {
    if (isSavingTakeaway || !userId) return;

    setIsSavingTakeaway(true);

    // Calculate metrics for logging
    const userMessages = messages.filter(m => m.sender === 'user');
    const userWordCount = userMessages.reduce(
      (sum, m) => sum + (m.text?.split(/\s+/).length || 0), 0
    );

    // Log button clicked
    logEvent(userId, 'takeaway_button_clicked', { message_count: messages.length });

    try {
      // Format messages for AI
      const formattedMessages = messages.map(m =>
        `${m.sender === 'user' ? 'User' : 'AI'}: ${m.text}`
      ).join('\n');

      console.log('[Takeaway] Calling AI with messages:', formattedMessages.substring(0, 200));

      // Call AI to generate summary
      const startTime = Date.now();
      const response = await callAIProxy<{ title: string; summary: string }>('chat-summary', { messages: formattedMessages });
      const latency = Date.now() - startTime;

      console.log('[Takeaway] AI Response:', response);

      if (!response?.title || !response?.summary) {
        console.error('[Takeaway] Invalid AI response - missing title or summary:', response);
        throw new Error('Invalid AI response');
      }

      console.log('[Takeaway] Saving to DB with title:', response.title);

      // Save or update in database (update if already saved in this session)
      let savedEntry: Entry | null;

      if (lastSavedTakeawayId) {
        // Update existing entry (prevents duplicates from same chat session)
        console.log('[Takeaway] Updating existing entry:', lastSavedTakeawayId);
        savedEntry = await updateChatTakeaway(
          lastSavedTakeawayId,
          userId,
          response.title,
          response.summary,
          messages.length,
          userWordCount
        );
      } else {
        // Create new entry
        savedEntry = await saveChatTakeaway(
          userId,
          response.title,
          response.summary,
          messages.length,
          userWordCount
        );
      }

      console.log('[Takeaway] DB save result:', savedEntry);

      if (!savedEntry) {
        console.error('[Takeaway] DB save returned null');
        throw new Error('Failed to save entry');
      }

      setLastSavedTakeawayId(savedEntry.id);

      // Log success
      logEvent(userId, lastSavedTakeawayId ? 'takeaway_updated' : 'takeaway_saved', {
        generation_id: savedEntry.source_meta?.generation_id,
        latency_ms: latency
      });

      // Notify parent if provided
      onTakeawaySaved?.(savedEntry);

      // Show success toast (internal) - different message for update
      setTakeawayToast({
        message: lastSavedTakeawayId ? 'Takeaway updated! ✓' : 'Takeaway saved to Stream! ✓',
        type: 'success'
      });

      // Also call external if provided
      setToast?.({ message: lastSavedTakeawayId ? 'Takeaway updated ✓' : 'Takeaway saved ✓' });

    } catch (error) {
      console.error('[Takeaway] Error:', error);
      logEvent(userId, 'takeaway_generation_failed', { error: String(error) });
      setTakeawayToast({ message: 'Failed to save. Try again.', type: 'error' });
      setToast?.({ message: 'Failed to save takeaway. Try again.' });
    } finally {
      setIsSavingTakeaway(false);
    }
  }, [isSavingTakeaway, userId, messages, lastSavedTakeawayId, onTakeawaySaved, setToast]);

  return (
    <>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Header with TTS and Sharing toggles */}
        <div className="flex-shrink-0 flex flex-col border-b border-white/5 bg-transparent">
          <div className="flex justify-end gap-2 p-3">
            {/* Chat Sharing Toggle - hidden in demo mode */}
            {!isDemo && (
              <button
                onClick={toggleChatSharing}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${chatSharingEnabled
                  ? 'bg-white/10 text-white border border-white/20 shadow-sm backdrop-blur-sm'
                  : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                  }`}
                title={chatSharingEnabled ? 'Chat sharing enabled' : 'Chat sharing disabled'}
              >
                {chatSharingEnabled ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Sharing</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    <span>Share: Off</span>
                  </>
                )}
              </button>
            )}

            {/* TTS Toggle */}
            <button
              onClick={toggleTTS}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${ttsEnabled
                ? 'bg-white/10 text-white border border-white/20 shadow-sm backdrop-blur-sm'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                }`}
              title={ttsEnabled ? 'Voice enabled' : 'Voice disabled'}
            >
              {ttsEnabled ? (
                <>
                  <Volume2 className="w-4 h-4" />
                  <span>Voice On</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4" />
                  <span>Voice Off</span>
                </>
              )}
            </button>

            {/* Save Takeaway Button */}
            {showTakeawayButton && (
              <button
                onClick={handleSaveTakeaway}
                disabled={isSavingTakeaway}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Save key insights from this chat"
              >
                {isSavingTakeaway ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Save Takeaway</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-4 min-h-0 flex flex-col">
          {messages.length === 0 && !seed && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in-up my-auto">
              <div className="mb-6">
                <ChatIllustration />
              </div>
              <h2 className="text-[16px] font-medium text-[rgba(255,255,255,0.88)] mb-2">
                Let's talk about it
              </h2>
              <p className="text-[13px] text-[rgba(255,255,255,0.5)] leading-[1.5] max-w-[240px] mx-auto">
                Your AI coach is ready to explore your thoughts and help you find clarity.
              </p>
            </div>
          )}
          {seed && messages.length === 0 && (
            <div className="flex flex-col w-full">
              <div className="flex items-start gap-3 my-4 justify-start animate-fade-in-up">
                <div 
                  className="flex-shrink-0 flex items-center justify-center"
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.06)',
                    border: '0.5px solid rgba(255,255,255,0.12)',
                    fontSize: '10px',
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.5)'
                  }}
                  aria-label="Mindstream avatar"
                >ms</div>
                <div className="flex flex-col gap-1 items-start">
                  <div 
                    className="p-[11px_13px] max-w-[85%] text-[13px] text-[rgba(255,255,255,0.75)] leading-[1.55]"
                    style={{ ...glass.regular, borderRadius: '0 12px 12px 12px' }}
                  >
                    {seed}
                  </div>
                  <div className="text-[10px] text-[rgba(255,255,255,0.25)] text-center mt-1">continuing from your last entry</div>
                </div>
              </div>
            </div>
          )}
          {messages.map((msg, index) => (
            <MessageBubble
              key={msg.id || index}
              sender={msg.sender}
              text={msg.text}
              suggestions={msg.suggestions}
              onAddSuggestion={onAddSuggestion}
              extraction={msg.extraction}
              onConfirmExtraction={onConfirmExtraction}
              onUndoExtraction={onUndoExtraction}
            />
          ))}
          {isLoading && messages[messages.length - 1]?.text !== '' && (
            <div className="flex items-start gap-3 my-4 justify-start animate-fade-in-up">
              <div 
                  className="flex-shrink-0 flex items-center justify-center"
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.06)',
                    border: '0.5px solid rgba(255,255,255,0.12)',
                    fontSize: '10px',
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.5)'
                  }}
                  aria-label="Mindstream avatar"
                >ms</div>
              <div 
                className="max-w-md lg:max-w-2xl p-[11px_13px] text-white"
                style={{ ...glass.regular, borderRadius: '0 12px 12px 12px' }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </main>
        
        {/* Session resume indicator */}
        {isResumed && (
          <div className="flex-shrink-0 text-xs text-center text-gray-500 py-2 border-t border-white/5 bg-transparent animate-fade-out">
            ↩ Continuing from where you left off
          </div>
        )}
      </div>

      {/* Chat Sharing Modal */}
      {showSharingModal && (
        <ChatSharingModal
          onAccept={handleAcceptSharing}
          onDecline={handleDeclineSharing}
        />
      )}

      {/* Takeaway Toast */}
      {takeawayToast && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg animate-fade-in-up ${takeawayToast.type === 'success'
          ? 'bg-green-600 text-white'
          : 'bg-red-600 text-white'
          }`}>
          {takeawayToast.message}
        </div>
      )}
    </>
  );
};
