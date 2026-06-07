import { callAIProxy } from './geminiClient';
import { ASPIRATIONAL_SIGNALS, DEFINITE_SIGNALS, VAGUE_LABELS } from '../config/commitmentLanguage';
import type { Message, Habit, Intention, ExtractionResult } from '../types';

// Fuzzy match — pure string logic, no AI
function isSimilarToExisting(name: string, existing: string[]): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const target = normalize(name);
  return existing.some(e => {
    const candidate = normalize(e);
    if (target === candidate) return true;
    // Token overlap > 60%
    const targetTokens = new Set(target.split(' '));
    const candidateTokens = new Set(candidate.split(' '));
    const overlap = [...targetTokens].filter(t => candidateTokens.has(t)).length;
    return overlap / Math.max(targetTokens.size, candidateTokens.size) > 0.6;
  });
}

// Hard-coded confidence adjustment based on language signals
function adjustConfidenceForLanguage(message: string, confidence: number): number {
  const lower = message.toLowerCase();
  const hasAspirational = ASPIRATIONAL_SIGNALS.some(s => lower.includes(s));
  const hasDefinite = DEFINITE_SIGNALS.some(s => lower.includes(s));
  
  if (hasAspirational) return Math.min(confidence, 0.5);
  if (hasDefinite) return Math.max(confidence, 0.7);
  return confidence;
}

export async function runExtractionPipeline(
  userId: string,
  userMessage: string,
  recentMessages: Message[],
  habits: Habit[],
  intentions: Intention[]
): Promise<ExtractionResult> {

  // Stage 1 — classify (fast, cheap)
  const classifyResult = await callAIProxy<any>('classify-behavior', {
    userMessage,
    recentMessages: recentMessages.slice(-4)
  });

  let { contains_behavioral_signal, signal_type, confidence } = classifyResult;

  // Apply hard-coded language rules on top of AI confidence
  confidence = adjustConfidenceForLanguage(userMessage, confidence);

  // Gate: if no signal or low confidence → skip
  if (!contains_behavioral_signal || confidence < 0.75) {
    return { 
      action: 'none', 
      classificationConfidence: confidence,
      skippedReason: `Low confidence: ${confidence.toFixed(2)}`
    };
  }

  // Stage 2 — extract (only if stage 1 passed)
  const extractResult = await callAIProxy<any>('extract-behavior', {
    userMessage,
    signalType: signal_type,
    existingHabits: habits.map(h => ({ name: h.name, frequency: h.frequency })),
    existingGoals: intentions.map(i => ({ text: i.text }))
  });

  const { action, type, name, frequency, category, commitment_level, 
          matched_item_name, due_date, is_life_goal, extraction_confidence } = extractResult;

  // Stage 3 — deduplication (pure code, no AI)
  if (action === 'create_new' && name) {
    const existingNames = type === 'habit' 
      ? habits.map(h => h.name)
      : intentions.map(i => i.text);
    
    if (isSimilarToExisting(name, existingNames)) {
      return {
        action: 'none',
        classificationConfidence: confidence,
        skippedReason: 'Duplicate detected by fuzzy match'
      };
    }

    // Vague label check
    if (VAGUE_LABELS.some(v => name.toLowerCase().includes(v)) || name.split(' ').length < 2) {
      return {
        action: 'none',
        classificationConfidence: confidence,
        skippedReason: 'Label too vague'
      };
    }
  }

  // Map to final action
  if (action === 'none' || commitment_level === 'reflective') {
    return { action: 'none', classificationConfidence: confidence };
  }

  if (action === 'log_existing' && matched_item_name) {
    return {
      action: type === 'habit' ? 'log_habit' : 'none',
      name: matched_item_name,
      classificationConfidence: confidence,
      extractionConfidence: extraction_confidence,
      commitment_level
    };
  }

  if (action === 'create_new' && name) {
    return {
      action: type === 'habit' ? 'create_habit' : 'create_goal',
      name,
      frequency: frequency ?? undefined,
      category: category ?? 'Growth',
      commitment_level,
      classificationConfidence: confidence,
      extractionConfidence: extraction_confidence,
      due_date: due_date ?? undefined,
      is_life_goal: is_life_goal ?? undefined
    };
  }

  return { action: 'none', classificationConfidence: confidence };
}
