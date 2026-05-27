import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Brain, Shield, ChevronUp } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { parseTemporalIntent } from '../services/temporalParser';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface GlassBoxMeta {
    provider?: string;
    latency_ms?: number;
    tokens_in?: number;
    tokens_out?: number;
    rag_matches?: any[];
    prompt_length?: number;
    fallback_chain?: string[];
    action?: string;
    userMessage?: string;
    contextSnippet?: string;
    attempted?: string[];
    query_intent?: {
        intent: string;
        hasTemporalIntent: boolean;
        temporalExpression: string | null;
        topicKeywords: string[];
        detectedTopic?: string | null;
        confidence: number;
        reasoning: string;
        startDate: string | null;
        endDate: string | null;
    };
    retrieval_strategy?: string;
    classifier_latency_ms?: number;
    // Granular timing (captured client-side)
    embedding_latency_ms?: number;
    search_latency_ms?: number;
    inference_ms?: number;
    parse_ms?: number;
    // Per-layer token counts (instrumented)
    system_prompt_tokens?: number;
    rag_context_tokens?: number;
    history_tokens?: number;
    user_message_tokens?: number;
    context_inventory?: {
        recentEntriesCount: number;
        semanticMatchCount: number;
        habits: Array<{ name: string; category: string; streak: number }>;
        goals: Array<{ text: string; category: string }>;
        hasReflection: boolean;
    };
}

interface GlassBoxProps {
    isOpen: boolean;
    onClose: () => void;
    meta: GlassBoxMeta | null;
    isProcessing: boolean;
    entries?: any[];
    queryId?: number;
    lastAIResponse?: string;
    mode?: 'modal' | 'docked';
    currentUserMessage?: string;
}

type StepState = 'pending' | 'active' | 'complete' | 'failed';
type EvalState = 'idle' | 'active' | 'complete' | 'failed';

type StepId = 'input' | 'intent' | 'embedding' | 'retrieval' | 'context' | 'generation' | 'evaluation' | 'complete';

interface EvalScores {
    faithfulness: number;
    answerRelevancy: number;
    contextPrecision: number;
    contextRecall: number;
    fScore: number;
    summary: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const HIGH_CONFIDENCE = 0.85;

const PROVIDER_CHAIN = [
    { name: 'Groq 70B', model: 'llama-3.3-70b-versatile' },
    { name: 'Groq 8B', model: 'llama-3.1-8b-instant' },
    { name: 'Gemini Flash', model: 'gemini-2.0-flash' },
    { name: 'Gemini Lite', model: 'gemini-2.5-flash-lite' },
];

function detectTemporalLabel(msg: string): string | null {
    if (!msg) return null;
    const lower = msg.toLowerCase();
    const nDaysMatch = lower.match(/last\s+(\d+)\s+days?|past\s+(\d+)\s+days?/);
    if (nDaysMatch) {
        const days = nDaysMatch[1] || nDaysMatch[2];
        return `Last ${days} days`;
    }
    if (/\btoday\b/.test(lower)) return 'Today';
    if (/\byesterday\b/.test(lower)) return 'Yesterday';
    if (/last\s*7\s*days?|past\s*7\s*days?|this\s+week|last\s+week/.test(lower)) return 'Last 7 days';
    if (/last\s*30\s*days?|past\s*30\s*days?|last\s+month|this\s+month/.test(lower)) return 'Last 30 days';
    const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
    for (const m of months) {
        if (new RegExp(`${m}\\s+\\d{1,2}`, 'i').test(lower)) return `Specific date`;
    }
    return null;
}

function getPrecisionColor(pct: number) {
    if (pct >= 85) return { text: 'text-teal-400', bg: 'bg-teal-400/15 border-teal-400/30' };
    if (pct >= 70) return { text: 'text-amber-400', bg: 'bg-amber-400/15 border-amber-400/30' };
    return { text: 'text-red-400', bg: 'bg-red-400/15 border-red-400/30' };
}

function getFScoreLabel(score: number) {
    if (score >= 85) return { label: 'Excellent', color: 'text-teal-400', bar: 'bg-teal-400' };
    if (score >= 70) return { label: 'Good', color: 'text-amber-400', bar: 'bg-amber-400' };
    return { label: 'Needs attention', color: 'text-red-400', bar: 'bg-red-400' };
}

function getCategoryClass(category: string): string {
    if (!category) return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    const norm = category.trim().toLowerCase();
    switch (norm) {
        case 'health':
            return 'bg-rose-500/10 text-rose-300 border-rose-500/20';
        case 'growth':
            return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
        case 'career':
            return 'bg-sky-500/10 text-sky-300 border-sky-500/20';
        case 'finance':
            return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
        case 'connection':
            return 'bg-purple-500/10 text-purple-300 border-purple-500/20';
        default:
            return 'bg-slate-500/10 text-slate-300 border-slate-500/20';
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP NODE
// ═══════════════════════════════════════════════════════════════════════════════

const StepNode: React.FC<{ state: StepState }> = ({ state }) => {
    return (
        <div className="relative flex-shrink-0">
            {state === 'complete' && (
                <div className="w-5 h-5 rounded-full bg-teal-400 flex items-center justify-center shadow-[0_0_8px_rgba(45,212,191,0.5)]">
                    <svg className="w-2.5 h-2.5 text-[#0d1117]" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            )}
            {state === 'active' && (
                <div className="relative w-5 h-5">
                    <motion.div
                        className="absolute inset-0 rounded-full border-2 border-teal-400 opacity-30"
                        animate={{ scale: [1, 1.8], opacity: [0.3, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                    />
                    <div className="w-5 h-5 rounded-full border-2 border-teal-400 bg-teal-400/10 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                    </div>
                </div>
            )}
            {state === 'pending' && (
                <div className="w-5 h-5 rounded-full border-2 border-dashed border-white/20 bg-transparent" />
            )}
            {state === 'failed' && (
                <div className="w-5 h-5 rounded-full border-2 border-orange-500 bg-orange-500/10 flex items-center justify-center">
                    <span className="text-orange-400 text-[9px] font-bold leading-none">✗</span>
                </div>
            )}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECTOR LINE
// ═══════════════════════════════════════════════════════════════════════════════

const Connector: React.FC<{ filled: boolean }> = ({ filled }) => (
    <div className="ml-[9px] w-0.5 h-7" style={{
        background: filled
            ? 'linear-gradient(to bottom, rgba(45,212,191,0.8), rgba(45,212,191,0.3))'
            : 'repeating-linear-gradient(to bottom, rgba(255,255,255,0.12) 0px, rgba(255,255,255,0.12) 4px, transparent 4px, transparent 8px)'
    }} />
);

// ═══════════════════════════════════════════════════════════════════════════════
// SHIMMER PLACEHOLDER
// ═══════════════════════════════════════════════════════════════════════════════

const Shimmer: React.FC<{ lines?: number }> = ({ lines = 2 }) => (
    <div className="space-y-1.5">
        {Array.from({ length: lines }).map((_, i) => (
            <motion.div
                key={i}
                className="h-2.5 rounded-full bg-gradient-to-r from-white/5 via-white/10 to-white/5"
                style={{ width: i === 0 ? '70%' : '50%' }}
                animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            />
        ))}
    </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// LATENCY BADGE
// ═══════════════════════════════════════════════════════════════════════════════

const LatencyBadge: React.FC<{ ms: number }> = ({ ms }) => (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-white/5 text-white/40 border border-white/8">
        {ms}ms
    </span>
);

// ═══════════════════════════════════════════════════════════════════════════════
// METRIC PILL
// ═══════════════════════════════════════════════════════════════════════════════

const Pill: React.FC<{ label: string; value: string; colorClass: string }> = ({ label, value, colorClass }) => (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${colorClass}`}>
        <span className="opacity-60">{label}</span>
        <span>{value}</span>
    </span>
);

// ═══════════════════════════════════════════════════════════════════════════════
// STEP CONTENT COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

const StepContent: React.FC<{
    id: StepId;
    state: StepState;
    meta: GlassBoxMeta | null;
    evalState: EvalState;
    evalScores: EvalScores | null;
    currentUserMessage?: string;
}> = ({ id, state, meta, evalState, evalScores, currentUserMessage }) => {
    if (state === 'pending') return null;
    if (state === 'active' && id !== 'evaluation') return <Shimmer lines={id === 'generation' ? 3 : 2} />;

    // ── STEP 1: USER INPUT ──────────────────────────────────────────────────
    if (id === 'input') {
        const msg = meta?.userMessage || currentUserMessage || '';
        const truncated = msg.length > 80 ? msg.slice(0, 80) + '…' : msg;
        const temporalLabel = detectTemporalLabel(msg);
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-1.5">
                <p className="text-[13px] text-white/90 font-mono leading-relaxed">"{truncated}"</p>
                {temporalLabel && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-400/15 text-teal-400 border border-teal-400/30">
                        ⏱ Temporal: {temporalLabel}
                    </span>
                )}
            </motion.div>
        );
    }

    // ── STEP 1.5: INTENT CLASSIFICATION ─────────────────────────────────────
    if (id === 'intent') {
        const ms = meta?.classifier_latency_ms ?? 0;
        const queryIntent = meta?.query_intent;
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <span className="text-[12px] text-white/80 font-mono">Classifier (Groq 8B)</span>
                    {ms > 0 && <LatencyBadge ms={ms} />}
                </div>
                {queryIntent ? (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                        <Pill label="Intent" value={queryIntent.intent} colorClass="bg-teal-400/15 text-teal-400 border-teal-400/30" />
                        <Pill label="Confidence" value={`${Math.round(queryIntent.confidence * 100)}%`} colorClass="bg-blue-400/15 text-blue-400 border-blue-400/30" />
                        {queryIntent.detectedTopic ? (
                            <span className="text-[10px] text-white/40 italic">
                                Topic: {queryIntent.detectedTopic}
                            </span>
                        ) : queryIntent.topicKeywords.length > 0 ? (
                            <span className="text-[10px] text-white/40 italic">
                                Topics: {queryIntent.topicKeywords.join(', ')}
                            </span>
                        ) : null}
                    </div>
                ) : (
                    <span className="text-[10px] text-white/40 italic">Determining user intent...</span>
                )}
            </motion.div>
        );
    }

    // ── STEP 2: EMBEDDING ───────────────────────────────────────────────────
    if (id === 'embedding') {
        const ms = meta?.embedding_latency_ms ?? 0;
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-1">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <p className="text-[12px] text-white/80 font-mono">Supabase gte-small</p>
                        <p className="text-[10px] text-white/40">384-dim vector</p>
                    </div>
                    {ms > 0 && <LatencyBadge ms={ms} />}
                </div>
            </motion.div>
        );
    }

    // ── STEP 3: RETRIEVAL ───────────────────────────────────────────────────
    if (id === 'retrieval') {
        const matches = meta?.rag_matches ?? [];
        const searchMs = meta?.search_latency_ms ?? 0;
        const n = matches.length;
        const userMsg = meta?.userMessage || currentUserMessage || '';

        // Compute average similarity: sum of similarities divided by matches length, scaled by 100
        const avgSimilarity = n > 0
            ? Math.round(
                matches.reduce((sum: number, m: any) => sum + (m.similarity ?? 0), 0) / n * 100
              )
            : 0;

        // Compute recall/fill rate: matches out of requested count (3 default)
        const recall = Math.round(Math.min(100, (n / 3) * 100));

        const isKeywordFallback = meta?.retrieval_strategy?.includes('KEYWORD') || meta?.retrieval_strategy?.includes('fallback');
        const matchLabel = isKeywordFallback
            ? 'Keyword Match'
            : meta?.query_intent?.intent === 'TEMPORAL_SUMMARY'
            ? 'Date Match'
            : 'Semantic Match';

        const simColor = isKeywordFallback
            ? { text: 'text-white/50', bg: 'bg-white/10 border-white/20' }
            : getPrecisionColor(avgSimilarity);
        const recColor = getPrecisionColor(recall);

        const temporal = parseTemporalIntent(userMsg);
        const { startDate, endDate, hasTemporalIntent } = temporal;

        const allWithinBounds = hasTemporalIntent && matches.every((m: any) => {
            if (!startDate || !endDate) return true;
            const entryDate = new Date(m.timestamp);
            return entryDate >= startDate && entryDate <= endDate;
        });

        const inventory = meta?.context_inventory;

        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-4">
                {/* 1. Vector Search */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
                            {meta?.retrieval_strategy || 'Vector Search'}
                        </span>
                        {searchMs > 0 && <LatencyBadge ms={searchMs} />}
                    </div>
                    {n > 0 ? (
                        <>
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <Pill label={matchLabel} value={`${avgSimilarity}%`} colorClass={simColor.bg + ' ' + simColor.text} />
                                <Pill label="Fill Rate" value={`${recall}%`} colorClass={recColor.bg + ' ' + recColor.text} />
                                {hasTemporalIntent && (
                                    allWithinBounds ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-400/15 text-teal-400 border border-teal-400/30">
                                            Temporal ✓ 100%
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-400/15 text-amber-400 border border-amber-400/30">
                                            Temporal ⚠ Partial
                                        </span>
                                    )
                                )}
                            </div>
                            <div className="space-y-1 mt-1">
                                {matches.slice(0, 3).map((m: any, i: number) => {
                                    const txt = (m.matchText || m.text || '').slice(0, 50);
                                    const sim = m.similarity != null ? Math.round(m.similarity * 100) : null;
                                    const date = m.timestamp
                                        ? new Date(m.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                        : '';
                                    return (
                                        <div key={i} className="flex items-center justify-between gap-2 bg-white/3 rounded px-2 py-1.5 border border-white/6">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="text-white/30 text-[10px] font-mono flex-shrink-0">▸</span>
                                                {date && <span className="text-[10px] text-white/40 font-mono flex-shrink-0">[{date}]</span>}
                                                <span className="text-[10px] text-white/60 font-mono truncate font-semibold">"{txt}…"</span>
                                            </div>
                                            {sim != null && (
                                                <span className="flex-shrink-0 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-teal-400/15 text-teal-400 border border-teal-400/30">
                                                    {sim}%
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <span className="text-[11px] text-white/40 italic">No semantic matches found</span>
                    )}
                </div>

                {/* 2. Recent Context */}
                <div className="space-y-1.5 border-t border-white/5 pt-3">
                    <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider block">Recent Context</span>
                    <p className="text-[11px] text-white/60 font-mono">
                        {inventory 
                            ? `${inventory.recentEntriesCount} recent entries included in context` 
                            : meta?.userMessage
                                ? `${n > 0 ? 'Recent' : '0'} entries included in context`
                                : `Connecting...`}
                    </p>
                </div>

                {/* 3. Habits & Goals */}
                <div className="space-y-2 border-t border-white/5 pt-3">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Habits & Goals</span>
                        {inventory?.hasReflection && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                Reflection Badge
                            </span>
                        )}
                    </div>
                    
                    {inventory ? (
                        <div className="space-y-2">
                            {/* Habits */}
                            {inventory.habits.length > 0 ? (
                                <div className="space-y-1">
                                    {inventory.habits.slice(0, 5).map((h, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-white/3 rounded px-2 py-1 border border-white/6 text-[10px] font-mono">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="text-white/40">⟳</span>
                                                <span className="text-white/80 truncate font-semibold">{h.name}</span>
                                                <span className={`text-[8px] px-1 py-0.2 rounded border ${getCategoryClass(h.category)}`}>
                                                    {h.category.toUpperCase()}
                                                </span>
                                            </div>
                                            {h.streak > 0 && (
                                                <span className="text-orange-400 font-bold flex-shrink-0">
                                                    🔥{h.streak}d
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                    {inventory.habits.length > 5 && (
                                        <span className="text-[9px] text-teal-400 font-semibold block pl-1">
                                            +{inventory.habits.length - 5} more habits
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <p className="text-[10px] text-white/30 italic pl-1">No active habits in context</p>
                            )}

                            {/* Goals */}
                            {inventory.goals.length > 0 ? (
                                <div className="space-y-1 mt-1.5">
                                    {inventory.goals.slice(0, 3).map((g, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-white/3 rounded px-2 py-1 border border-white/6 text-[10px] font-mono">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="text-white/40">◎</span>
                                                <span className="text-white/70 truncate">{g.text}</span>
                                            </div>
                                            <span className={`text-[8px] px-1 py-0.2 rounded border flex-shrink-0 ${getCategoryClass(g.category)}`}>
                                                {(g.category || 'Growth').toUpperCase()}
                                            </span>
                                        </div>
                                    ))}
                                    {inventory.goals.length > 3 && (
                                        <span className="text-[9px] text-teal-400 font-semibold block pl-1">
                                            +{inventory.goals.length - 3} more goals
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <p className="text-[10px] text-white/30 italic pl-1">No pending goals in context</p>
                            )}
                        </div>
                    ) : (
                        <p className="text-[10px] text-white/30 italic">No habit/goal context available</p>
                    )}
                </div>
            </motion.div>
        );
    }

    // ── STEP 4: CONTEXT ASSEMBLY ────────────────────────────────────────────
    if (id === 'context') {
        const sys = meta?.system_prompt_tokens ?? 0;
        const rag = meta?.rag_context_tokens ?? 0;
        const hist = meta?.history_tokens ?? 0;
        const usr = meta?.user_message_tokens ?? 0;
        const total = sys + rag + hist + usr;
        const tokensIn = meta?.tokens_in ?? total;
        const tokensOut = meta?.tokens_out ?? 0;

        const pct = (n: number) => total > 0 ? Math.max(1, Math.round((n / total) * 100)) : 25;

        const segments = [
            { label: 'System', tokens: sys, pct: pct(sys), color: '#64748b', lightColor: 'rgba(100,116,139,0.7)' },
            { label: 'Context', tokens: rag, pct: pct(rag), color: '#2dd4bf', lightColor: 'rgba(45,212,191,0.7)' },
            { label: 'History', tokens: hist, pct: pct(hist), color: '#3b82f6', lightColor: 'rgba(59,130,246,0.7)' },
            { label: 'Message', tokens: usr, pct: pct(usr), color: '#a855f7', lightColor: 'rgba(168,85,247,0.7)' },
        ];

        const efficiency = tokensIn > 0 && tokensOut > 0 ? Math.round((tokensOut / tokensIn) * 100) : null;

        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-2.5">
                {/* Stacked bar */}
                <div className="relative">
                    <div className="h-4 rounded-full overflow-hidden flex" title="Token distribution by layer">
                        {segments.map((seg, i) => (
                            <motion.div
                                key={seg.label}
                                className="h-full flex-shrink-0"
                                style={{ width: `${seg.pct}%`, backgroundColor: seg.color }}
                                initial={{ width: 0 }}
                                animate={{ width: `${seg.pct}%` }}
                                transition={{ duration: 0.5, delay: i * 0.08 }}
                                title={`${seg.label}: ~${seg.tokens} tokens (${seg.pct}%)`}
                            />
                        ))}
                    </div>
                    {/* Legend */}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                        {segments.map(seg => (
                            <span key={seg.label} className="flex items-center gap-1 text-[10px] text-white/40">
                                <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: seg.color }} />
                                {seg.label}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Token breakdown line */}
                {total > 0 && (
                    <p className="text-[10px] text-white/30 font-mono">
                        ~{sys} sys · ~{rag} ctx · ~{hist} hist · ~{usr} msg
                    </p>
                )}

                {/* Token economics */}
                <div className="flex items-center justify-between text-[10px] font-mono border-t border-white/5 pt-1.5">
                    <span className="text-white/40">~{tokensIn} in → ~{tokensOut} out</span>
                    {efficiency != null && (
                        <span className="text-white/30">~{efficiency}% efficiency</span>
                    )}
                </div>
            </motion.div>
        );
    }

    // ── STEP 5: AI GENERATION ───────────────────────────────────────────────
    if (id === 'generation') {
        const provider = meta?.provider ?? 'Groq 70B';
        const totalMs = meta?.latency_ms ?? 0;
        const inferenceMs = meta?.inference_ms ?? totalMs;
        const parseMs = meta?.parse_ms ?? 12;
        const edgeBootMs = Math.round(totalMs * 0.04);
        const selectionMs = Math.round(totalMs * 0.01);
        const computedInferenceMs = Math.max(0, totalMs - edgeBootMs - selectionMs - parseMs);

        const phases = [
            { label: 'Edge boot', ms: edgeBootMs, color: '#3b82f6' },
            { label: 'Selection', ms: selectionMs, color: '#a855f7' },
            { label: 'Inference', ms: computedInferenceMs, color: '#10b981' },
            { label: 'Parse', ms: parseMs, color: '#2dd4bf' },
        ];
        const maxMs = Math.max(...phases.map(p => p.ms), 1);

        // Get the model ID for the used provider
        const usedProviderInfo = PROVIDER_CHAIN.find(p => p.name === provider) ?? PROVIDER_CHAIN[0];

        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-2.5">
                {/* Provider name */}
                <div>
                    <p className="text-[13px] font-semibold text-teal-400">{provider}</p>
                    <p className="text-[10px] text-white/30 font-mono">{usedProviderInfo.model}</p>
                </div>

                {/* Provider chain */}
                <div className="flex items-center gap-1 flex-wrap">
                    {PROVIDER_CHAIN.map(p => {
                        const used = p.name === provider;
                        return (
                            <span key={p.name} className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border transition-all ${
                                used
                                    ? 'bg-teal-400/15 text-teal-400 border-teal-400/30'
                                    : 'bg-white/3 text-white/20 border-white/6'
                            }`}>
                                {p.name} {used ? '[USED]' : ''}
                            </span>
                        );
                    })}
                </div>

                {/* Latency bar chart */}
                {totalMs > 0 && (
                    <div className="space-y-1.5">
                        {phases.map(phase => (
                            <div key={phase.label} className="flex items-center gap-2 text-[10px]">
                                <span className="text-white/30 w-16 flex-shrink-0 text-right font-mono">{phase.label}</span>
                                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full rounded-full"
                                        style={{ backgroundColor: phase.color }}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.max(2, (phase.ms / maxMs) * 100)}%` }}
                                        transition={{ duration: 0.4, delay: 0.1 }}
                                    />
                                </div>
                                <span className="text-white/30 font-mono w-10 flex-shrink-0">{phase.ms}ms</span>
                            </div>
                        ))}
                        <div className="flex items-center gap-2 text-[10px] border-t border-white/5 pt-1">
                            <span className="text-white/50 w-16 flex-shrink-0 text-right font-mono font-bold">Total</span>
                            <div className="flex-1 h-2 bg-gradient-to-r from-blue-400 via-emerald-400 to-teal-400 rounded-full" />
                            <span className="text-white/60 font-mono w-10 flex-shrink-0 font-bold">{totalMs}ms</span>
                        </div>
                    </div>
                )}
            </motion.div>
        );
    }

    // ── STEP 6: QUALITY EVALUATION ──────────────────────────────────────────
    if (id === 'evaluation') {
        if (evalState === 'idle' || evalState === 'active') {
            return (
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <motion.div
                            className="w-2 h-2 rounded-full bg-teal-400"
                            animate={{ opacity: [1, 0.3, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                        />
                        <span className="text-[11px] text-white/40">Evaluating response quality...</span>
                    </div>
                    <Shimmer lines={3} />
                </div>
            );
        }
        if (evalState === 'failed') {
            return (
                <p className="text-[11px] text-orange-400/70 italic">Quality evaluation unavailable</p>
            );
        }
        if (evalState === 'complete' && evalScores) {
            const scores = [
                { label: 'Faithfulness', value: evalScores.faithfulness },
                { label: 'Ans Relevancy', value: evalScores.answerRelevancy },
                { label: 'Ctx Precision', value: evalScores.contextPrecision },
                { label: 'Ctx Recall', value: evalScores.contextRecall },
            ];
            const fscore = getFScoreLabel(evalScores.fScore);
            return (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-2.5">
                    {/* Score rows */}
                    <div className="space-y-2">
                        {scores.map(s => (
                            <div key={s.label} className="space-y-0.5">
                                <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-white/40">{s.label}</span>
                                    <span className="font-mono text-white/60">{s.value}/100</span>
                                </div>
                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-teal-400 rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${s.value}%` }}
                                        transition={{ duration: 0.5 }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* F-Score composite */}
                    <div className="space-y-1 pt-1 border-t border-white/5">
                        <div className="flex items-center justify-between text-[10px]">
                            <span className="text-white/40">F-Score</span>
                            <span className={`font-mono font-bold ${fscore.color}`}>{evalScores.fScore}%</span>
                        </div>
                        <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                                className={`h-full rounded-full ${fscore.bar}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${evalScores.fScore}%` }}
                                transition={{ duration: 0.6 }}
                            />
                        </div>
                        <p className={`text-[10px] font-semibold ${fscore.color}`}>{fscore.label}</p>
                    </div>

                    {/* Summary */}
                    {evalScores.summary && (
                        <p className="text-[10px] text-white/30 italic leading-relaxed">"{evalScores.summary}"</p>
                    )}
                </motion.div>
            );
        }
        return null;
    }

    // ── STEP 7: COMPLETE ────────────────────────────────────────────────────
    if (id === 'complete') {
        const totalMs = meta?.latency_ms ?? 0;
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-1">
                <p className="text-[12px] text-white/80 font-semibold">AI Orchestration Complete</p>
                {totalMs > 0 && (
                    <p className="text-[11px] text-teal-400 font-mono">{totalMs}ms end-to-end</p>
                )}
                <div className="flex items-center gap-1.5 mt-1">
                    <Shield className="w-3 h-3 text-white/20" />
                    <span className="text-[10px] text-white/20">All AI calls secured via Edge Fns</span>
                </div>
            </motion.div>
        );
    }

    return null;
};

// ═══════════════════════════════════════════════════════════════════════════════
// STEP LABELS
// ═══════════════════════════════════════════════════════════════════════════════

const STEP_LABELS: Record<StepId, string> = {
    input: 'User Input',
    intent: 'Intent Classification',
    embedding: 'Embedding',
    retrieval: 'Retrieval',
    context: 'Context Assembly',
    generation: 'AI Generation',
    evaluation: 'Quality Evaluation',
    complete: 'Complete',
};

const STEP_ORDER: StepId[] = ['input', 'intent', 'embedding', 'retrieval', 'context', 'generation', 'evaluation', 'complete'];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const GlassBox: React.FC<GlassBoxProps> = ({
    isOpen,
    onClose,
    meta,
    isProcessing,
    entries,
    queryId = 0,
    lastAIResponse = '',
    mode = 'modal',
    currentUserMessage = '',
}) => {
    // Pipeline step states
    const [stepStates, setStepStates] = useState<Record<StepId, StepState>>({
        input: 'pending', intent: 'pending', embedding: 'pending', retrieval: 'pending',
        context: 'pending', generation: 'pending', evaluation: 'pending', complete: 'pending',
    });

    // Quality evaluation state
    const [evalState, setEvalState] = useState<EvalState>('idle');
    const [evalScores, setEvalScores] = useState<EvalScores | null>(null);

    // Session stats
    const [sessionQueryCount, setSessionQueryCount] = useState(0);
    const [sessionPrecisionSum, setSessionPrecisionSum] = useState(0);

    // Mobile bottom sheet
    const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
    const [isMobileFullOpen, setIsMobileFullOpen] = useState(false);

    // Refs to avoid stale closures
    const isProcessingRef = useRef(isProcessing);
    useEffect(() => { isProcessingRef.current = isProcessing; }, [isProcessing]);

    const completeStep = useCallback((id: StepId) => {
        setStepStates(prev => ({ ...prev, [id]: 'complete' }));
    }, []);

    // ── RESET on new query ────────────────────────────────────────────────
    useEffect(() => {
        if (queryId === 0) return;
        setStepStates({
            input: 'pending', intent: 'pending', embedding: 'pending', retrieval: 'pending',
            context: 'pending', generation: 'pending', evaluation: 'pending', complete: 'pending',
        });
        setEvalState('idle');
        setEvalScores(null);
    }, [queryId]);

    // ── PROCESSING: show input complete + others active ──────────────────
    useEffect(() => {
        if (!isProcessing) return;
        setStepStates(prev => ({
            ...prev,
            input: 'complete',
            intent: 'active',
            embedding: 'active',
            retrieval: 'active',
            context: 'active',
            generation: 'active',
            evaluation: 'pending',
            complete: 'pending',
        }));
    }, [isProcessing]);

    // ── CASCADE COMPLETE: proportional 800ms animation after meta arrives ─
    useEffect(() => {
        if (isProcessing || !meta) return;

        const t = {
            s2: meta.embedding_latency_ms ?? 120,
            s3: meta.search_latency_ms ?? 45,
            s4: 30,
            s5: meta.inference_ms ?? meta.latency_ms ?? 800,
        };
        const total = t.s2 + t.s3 + t.s4 + t.s5;
        const scale = (ms: number) => (ms / total) * 800;

        let acc = 0;
        const timers = [
            setTimeout(() => completeStep('intent'), acc),
            setTimeout(() => completeStep('embedding'), (acc += 100)),
            setTimeout(() => completeStep('retrieval'), (acc += scale(t.s2))),
            setTimeout(() => completeStep('context'),   (acc += scale(t.s3))),
            setTimeout(() => completeStep('generation'), (acc += scale(t.s4))),
        ];

        // Update session stats
        const matches = meta.rag_matches ?? [];
        const n = matches.length;
        const avgSimilarity = n > 0
            ? Math.round(
                matches.reduce((sum: number, m: any) => sum + (m.similarity ?? 0), 0) / n * 100
              )
            : 0;
        setSessionQueryCount(c => c + 1);
        setSessionPrecisionSum(s => s + avgSimilarity);

        return () => timers.forEach(clearTimeout);
    }, [isProcessing, meta, completeStep]);

    // ── QUALITY EVALUATION: fires 850ms after meta arrives ───────────────
    useEffect(() => {
        if (isProcessing || !meta?.userMessage) return;

        const t = setTimeout(async () => {
            setEvalState('active');
            setStepStates(prev => ({ ...prev, evaluation: 'active' }));

            try {
                const ragContext = (meta.rag_matches ?? [])
                    .slice(0, 3)
                    .map((m: any) => (m.matchText || m.text || '').slice(0, 120))
                    .join('\n');

                const habitsSummary = (meta.context_inventory?.habits ?? [])
                    .slice(0, 5)
                    .map(h => `${h.name} (${h.category}, ${h.streak} day streak)`)
                    .join(', ');

                const goalsSummary = (meta.context_inventory?.goals ?? [])
                    .slice(0, 3)
                    .map(g => g.text)
                    .join(', ');

                const fullContext = [
                    ragContext ? `Journal entries:\n${ragContext}` : '',
                    habitsSummary ? `Active habits: ${habitsSummary}` : '',
                    goalsSummary ? `Active goals: ${goalsSummary}` : '',
                ].filter(Boolean).join('\n\n');

                const { data, error } = await supabase!.functions.invoke('ai-proxy', {
                    body: {
                        action: 'evaluate-response',
                        payload: {
                            userMessage: meta.userMessage,
                            retrievedContext: fullContext,
                            aiResponse: lastAIResponse ?? '',
                        }
                    }
                });

                if (error) throw error;
                const scores = data?.data ?? data;
                setEvalScores(scores);
                setEvalState('complete');
                completeStep('evaluation');
                // Small delay then complete the pipeline
                setTimeout(() => completeStep('complete'), 200);
            } catch {
                setEvalState('failed');
                completeStep('evaluation');
                setTimeout(() => completeStep('complete'), 200);
            }
        }, 850);

        return () => clearTimeout(t);
    }, [isProcessing, meta, lastAIResponse, completeStep]);

    if (!isOpen) return null;

    // ─── Session stats ────────────────────────────────────────────────────
    const avgMatch = sessionQueryCount > 0
        ? Math.round(sessionPrecisionSum / sessionQueryCount)
        : 0;

    // ─── Mobile 3-line summary text ───────────────────────────────────────
    const mobileSummaryLine1 = meta
        ? `⬡ ${meta.provider ?? 'Groq 70B'} · ${meta.latency_ms ?? 0}ms · ${(meta.rag_matches ?? []).length} entries retrieved`
        : '⬡ AI Pipeline · waiting for query';
    const mobileAvgSimilarity = (() => {
        const matches = meta?.rag_matches ?? [];
        const n = matches.length;
        return n > 0
            ? Math.round(
                matches.reduce((sum: number, m: any) => sum + (m.similarity ?? 0), 0) / n * 100
              )
            : 0;
    })();
    const isTemporalSummary = meta?.query_intent?.intent === 'TEMPORAL_SUMMARY';
    const matchLabel = isTemporalSummary ? 'Date Match' : 'Semantic Match';
    const mobileSummaryLine2 = evalScores
        ? `${matchLabel} ${mobileAvgSimilarity}% · F-Score ${evalScores.fScore}%`
        : `${matchLabel} ${mobileAvgSimilarity}% · Evaluating…`;
    const temporalLabel = detectTemporalLabel(meta?.userMessage ?? '');
    const mobileSummaryLine3 = (() => {
        if (!temporalLabel) return null;
        const temporal = parseTemporalIntent(meta?.userMessage ?? '');
        const { startDate, endDate, hasTemporalIntent } = temporal;
        const matches = meta?.rag_matches ?? [];
        const allWithinBounds = hasTemporalIntent && matches.every((m: any) => {
            if (!startDate || !endDate) return true;
            const entryDate = new Date(m.timestamp);
            return entryDate >= startDate && entryDate <= endDate;
        });
        return allWithinBounds
            ? `Temporal: ${temporalLabel} ✓ 100%`
            : `Temporal: ${temporalLabel} ⚠ Partial`;
    })();

    // ─── Pipeline timeline ────────────────────────────────────────────────
    const PipelineTimeline = () => (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex-shrink-0 px-5 pt-5 pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400/20 to-emerald-400/20 flex items-center justify-center border border-teal-400/20">
                            <Brain className="w-4 h-4 text-teal-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-bold text-white leading-tight">Glass Box AI</h2>
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-400/15 text-teal-400 border border-teal-400/30 font-bold uppercase tracking-wider">
                                    Demo
                                </span>
                            </div>
                            <p className="text-[10px] text-white/30 mt-0.5">How I built this answer</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-white/8 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4 text-white/30" />
                    </button>
                </div>
            </div>

            {/* Pipeline steps — scrollable */}
            <div className="flex-1 overflow-y-auto px-5 pb-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                <div className="pb-4">
                    {STEP_ORDER.map((stepId, index) => {
                        const stepState = stepStates[stepId];
                        const isLast = index === STEP_ORDER.length - 1;
                        const connectorFilled = stepState === 'complete';

                        return (
                            <div key={stepId}>
                                <div className="flex items-start gap-3">
                                    {/* Node */}
                                    <div className="flex flex-col items-center">
                                        <StepNode state={stepState} />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 pb-2">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/30">
                                                {STEP_LABELS[stepId]}
                                            </span>
                                        </div>
                                        <StepContent
                                            id={stepId}
                                            state={stepState}
                                            meta={meta}
                                            evalState={evalState}
                                            evalScores={evalScores}
                                            currentUserMessage={currentUserMessage}
                                        />
                                    </div>
                                </div>

                                {/* Connector between steps */}
                                {!isLast && <Connector filled={connectorFilled} />}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Session footer — pinned 36px */}
            <div className="flex-shrink-0 h-9 flex items-center justify-between px-5 border-t border-white/6">
                <span className="text-[10px] text-white/25 font-mono">
                    Session · {sessionQueryCount} {sessionQueryCount === 1 ? 'query' : 'queries'}
                </span>
                {sessionQueryCount > 0 && (
                    <span className="text-[10px] text-white/25 font-mono">
                        Avg match {avgMatch}%
                    </span>
                )}
            </div>
        </div>
    );

    // ─── Docked mode ──────────────────────────────────────────────────────
    if (mode === 'docked') {
        return (
            <motion.div
                className="h-full flex flex-col overflow-hidden"
                style={{ background: '#141c35', borderLeft: '1px solid rgba(255,255,255,0.06)' }}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
            >
                <PipelineTimeline />
            </motion.div>
        );
    }

    // ─── Modal mode (mobile overlay) ──────────────────────────────────────
    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="w-full max-h-[90vh] flex flex-col overflow-hidden rounded-t-2xl"
                    style={{ background: '#141c35', border: '1px solid rgba(255,255,255,0.06)' }}
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    onClick={e => e.stopPropagation()}
                >
                    <PipelineTimeline />
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE FLOATING PILL + BOTTOM SHEET
// ═══════════════════════════════════════════════════════════════════════════════

interface MobilePipelineButtonProps {
    meta: GlassBoxMeta | null;
    isProcessing: boolean;
    evalScores: EvalScores | null;
    onOpen: () => void;
    currentUserMessage?: string;
}

export const MobilePipelineButton: React.FC<MobilePipelineButtonProps & {
    isOpen: boolean;
    onClose: () => void;
    queryId?: number;
    lastAIResponse?: string;
}> = ({ meta, isProcessing, evalScores: externalEvalScores, onOpen, isOpen, onClose, queryId, lastAIResponse, currentUserMessage }) => {
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const matches = meta?.rag_matches ?? [];
    const n = matches.length;
    const avgSimilarity = n > 0
        ? Math.round(
            matches.reduce((sum: number, m: any) => sum + (m.similarity ?? 0), 0) / n * 100
          )
        : 0;
    const temporalLabel = detectTemporalLabel(meta?.userMessage || currentUserMessage || '');
    const temporal = parseTemporalIntent(meta?.userMessage || currentUserMessage || '');
    const { startDate, endDate, hasTemporalIntent } = temporal;
    const allWithinBounds = hasTemporalIntent && matches.every((m: any) => {
        if (!startDate || !endDate) return true;
        const entryDate = new Date(m.timestamp);
        return entryDate >= startDate && entryDate <= endDate;
    });

    return (
        <>
            {/* Floating pill */}
            <motion.button
                onClick={() => setIsSheetOpen(true)}
                className="fixed bottom-24 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold shadow-lg"
                style={{
                    background: '#141c35',
                    border: '1px solid rgba(45,212,191,0.4)',
                    color: 'rgba(45,212,191,1)',
                    boxShadow: '0 0 20px rgba(45,212,191,0.1)',
                }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
            >
                <span>⬡</span>
                <span>AI Pipeline</span>
                <ChevronUp className="w-3.5 h-3.5 opacity-60" />
            </motion.button>

            {/* Bottom sheet */}
            <AnimatePresence>
                {isSheetOpen && (
                    <>
                        <motion.div
                            className="fixed inset-0 z-50 bg-black/50"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSheetOpen(false)}
                        />
                        <motion.div
                            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl flex flex-col overflow-hidden"
                            style={{
                                height: '80vh',
                                background: '#141c35',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderBottom: 'none',
                            }}
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        >
                            {/* Sheet header */}
                            <div className="flex items-center justify-between px-5 pt-5 pb-3">
                                <div className="flex items-center gap-2">
                                    <Brain className="w-4 h-4 text-teal-400" />
                                    <span className="text-sm font-bold text-white">AI Pipeline</span>
                                </div>
                                <button onClick={() => setIsSheetOpen(false)} className="p-1.5 hover:bg-white/8 rounded-lg transition-colors">
                                    <X className="w-4 h-4 text-white/30" />
                                </button>
                            </div>

                            {/* 3-line summary */}
                            <div className="px-5 space-y-1.5 pb-4 border-b border-white/6">
                                <p className="text-[12px] text-white/70 font-mono">
                                    {meta
                                        ? `⬡ ${meta.provider ?? 'Groq 70B'} · ${meta.latency_ms ?? 0}ms · ${n} ${n === 1 ? 'entry' : 'entries'} retrieved`
                                        : '⬡ Waiting for next query…'}
                                </p>
                                <p className="text-[12px] text-white/50 font-mono">
                                    {meta?.query_intent?.intent === 'TEMPORAL_SUMMARY' ? 'Date Match' : 'Semantic Match'} {avgSimilarity}% · F-Score {externalEvalScores ? `${externalEvalScores.fScore}%` : 'Evaluating…'}
                                </p>
                                {hasTemporalIntent && temporalLabel && (
                                    allWithinBounds ? (
                                        <p className="text-[12px] text-teal-400 font-mono">Temporal: {temporalLabel} ✓ 100%</p>
                                    ) : (
                                        <p className="text-[12px] text-amber-400 font-mono">Temporal: {temporalLabel} ⚠ Partial</p>
                                    )
                                )}
                            </div>

                            {/* View full pipeline link */}
                            <div className="px-5 py-3">
                                <button
                                    onClick={() => { setIsSheetOpen(false); onOpen(); }}
                                    className="text-[12px] text-teal-400 hover:text-teal-300 transition-colors font-semibold"
                                >
                                    View full pipeline →
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};
