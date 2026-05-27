// Run after every classifier fix:
// npm run eval:rag
//
// All 15 cases should pass before
// considering a classifier fix complete.
// Do not ship a fix that scores < 13/15.

import { classifyQueryIntent, QueryIntent } from '../services/queryClassifier';
import { supabase } from '../services/supabaseClient';

interface TestCase {
  id: number;
  query: string;
  expectedIntent: QueryIntent;
  expectedHasTemporal: boolean;
  expectedTopic: string | null;
  notes?: string;
}

const TEST_CASES: TestCase[] = [
  // SEMANTIC_TOPIC (no time window, specific topic)
  {
    id: 1,
    query: "when did I feel anxious?",
    expectedIntent: "SEMANTIC_TOPIC",
    expectedHasTemporal: false,
    expectedTopic: "anxiety",
    notes: "Classic semantic — topic without time window"
  },
  {
    id: 2,
    query: "tell me about my running",
    expectedIntent: "SEMANTIC_TOPIC",
    expectedHasTemporal: false,
    expectedTopic: "running"
  },
  {
    id: 3,
    query: "when did I last feel proud?",
    expectedIntent: "SEMANTIC_TOPIC",
    expectedHasTemporal: false,
    expectedTopic: "proud",
    notes: "'when did I' is NOT a time expression"
  },

  // TEMPORAL_SUMMARY (time window, no specific topic)
  {
    id: 4,
    query: "summarise my last 7 days",
    expectedIntent: "TEMPORAL_SUMMARY",
    expectedHasTemporal: true,
    expectedTopic: null,
    notes: "Generic summary — no topic"
  },
  {
    id: 5,
    query: "what happened this week",
    expectedIntent: "TEMPORAL_SUMMARY",
    expectedHasTemporal: true,
    expectedTopic: null
  },
  {
    id: 6,
    query: "catch me up on the last 10 days",
    expectedIntent: "TEMPORAL_SUMMARY",
    expectedHasTemporal: true,
    expectedTopic: null
  },

  // TEMPORAL_TOPIC (time window + specific topic)
  {
    id: 7,
    query: "what has been my running pattern last 15 days",
    expectedIntent: "TEMPORAL_TOPIC",
    expectedHasTemporal: true,
    expectedTopic: "running"
  },
  {
    id: 8,
    query: "how has my anxiety been this week",
    expectedIntent: "TEMPORAL_TOPIC",
    expectedHasTemporal: true,
    expectedTopic: "anxiety"
  },
  {
    id: 9,
    query: "my meditation habit last 2 weeks",
    expectedIntent: "TEMPORAL_TOPIC",
    expectedHasTemporal: true,
    expectedTopic: "meditation"
  },

  // BEHAVIORAL (habits, goals, consistency)
  {
    id: 10,
    query: "how consistent am I with habits",
    expectedIntent: "BEHAVIORAL",
    expectedHasTemporal: false,
    expectedTopic: null,
    notes: "No time window — pure behavioral"
  },
  {
    id: 11,
    query: "am I hitting my goals",
    expectedIntent: "BEHAVIORAL",
    expectedHasTemporal: false,
    expectedTopic: null
  },
  {
    id: 12,
    query: "what is my morning jog streak",
    expectedIntent: "BEHAVIORAL",
    expectedHasTemporal: false,
    expectedTopic: null
  },

  // CONVERSATIONAL (follow-up, short, reactive)
  {
    id: 13,
    query: "tell me more",
    expectedIntent: "CONVERSATIONAL",
    expectedHasTemporal: false,
    expectedTopic: null,
    notes: "Classic follow-up"
  },
  {
    id: 14,
    query: "interesting",
    expectedIntent: "CONVERSATIONAL",
    expectedHasTemporal: false,
    expectedTopic: null
  },
  {
    id: 15,
    query: "what do you mean?",
    expectedIntent: "CONVERSATIONAL",
    expectedHasTemporal: false,
    expectedTopic: null
  },
];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runEval() {
  if (supabase) {
    await supabase.auth.signInAnonymously();
  }

  const timestamp = new Date().toISOString()
    .replace('T', ' ').slice(0, 19);
  
  console.log(`\n🧪 MINDSTREAM RAG EVAL — ${timestamp}`);
  console.log('='.repeat(90));

  const results = [];

  for (const tc of TEST_CASES) {
    if (tc.id > 1) {
      await sleep(15000); // Space out requests to avoid Groq 8B rate limits (rolling TPM)
    }
    const start = Date.now();
    
    try {
      const result = await classifyQueryIntent(
        tc.query,
        [] // empty conversation history
      );
      
      const latency = Date.now() - start;
      
      const intentPass = 
        result.intent === tc.expectedIntent;
      const temporalPass = 
        result.hasTemporalIntent === tc.expectedHasTemporal;
      const pass = intentPass && temporalPass;

      const actualIntent = result?.intent || 'UNDEFINED';
      const confidenceVal = result?.confidence !== undefined ? `${Math.round(result.confidence * 100)}%` : '0%';
      results.push({
        id: tc.id,
        query: tc.query.slice(0, 38).padEnd(38),
        expected: tc.expectedIntent.padEnd(18),
        actual: actualIntent.padEnd(18),
        confidence: confidenceVal.padStart(4),
        topic: (result?.detectedTopic || '—').padEnd(12),
        latency: `${latency}ms`.padStart(6),
        pass
      });

      const icon = pass ? '✅' : '❌';
      const mismatch = !intentPass
        ? ` ← expected ${tc.expectedIntent}`
        : '';

      console.log(
        `${String(tc.id).padStart(2)}  ` +
        `${results.at(-1)!.query}  ` +
        `${results.at(-1)!.expected}  ` +
        `${results.at(-1)!.actual}  ` +
        `${results.at(-1)!.confidence}  ` +
        `${results.at(-1)!.topic}  ` +
        `${results.at(-1)!.latency}  ` +
        `${icon}${mismatch}`
      );

      if (!pass) {
        console.log(`     ↳ Raw: ${JSON.stringify(result)}`);
      }

    } catch (error) {
      results.push({
        id: tc.id,
        query: tc.query.slice(0, 38).padEnd(38),
        expected: tc.expectedIntent.padEnd(18),
        actual: 'ERROR'.padEnd(18),
        confidence: '  0%',
        topic: '—'.padEnd(12),
        latency: `${Date.now() - start}ms`.padStart(6),
        pass: false
      });
      console.log(
        `${String(tc.id).padStart(2)}  ` +
        `${tc.query.slice(0, 38).padEnd(38)}  ` +
        `${tc.expectedIntent.padEnd(18)}  ` +
        `ERROR               ` +
        `  0%  —             ` +
        `❌  [${(error as Error).message}]`
      );
    }
  }

  // Summary
  const passed = results.filter(r => r.pass).length;
  const total = results.length;
  const rate = Math.round(passed / total * 100);
  
  console.log('='.repeat(90));
  console.log(
    `\nRESULTS: ${passed}/${total} PASSED (${rate}%)`
  );
  
  const failed = results.filter(r => !r.pass);
  if (failed.length > 0) {
    console.log(
      `FAILED:  ${failed.map(f => `#${f.id}`).join(', ')}`
    );
    failed.forEach(f => {
      const tc = TEST_CASES.find(t => t.id === f.id)!;
      console.log(
        `  #${f.id}: "${tc.query}"`
      );
      console.log(
        `       expected ${tc.expectedIntent}` +
        ` → got ${f.actual.trim()}`
      );
      if (tc.notes) {
        console.log(`       note: ${tc.notes}`);
      }
    });
  }

  console.log('');
  
  // Exit with error code if any failed
  // so CI can detect failures
  process.exit(failed.length > 0 ? 1 : 0);
}

runEval().catch(console.error);
