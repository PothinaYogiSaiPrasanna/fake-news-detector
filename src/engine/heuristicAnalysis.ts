import type { SuspiciousSpan } from './types';

const CLICKBAIT_PHRASES = [
  "you won't believe", "shocking", "doctors hate", "what happens next",
  "mind blowing", "goes viral", "the truth about", "they don't want you to know",
  "this is why", "number 1", "top 10", "you'll never guess",
  "must watch", "gone wrong", "will shock you", "can't handle the truth",
  "gov't hiding", "deep state", "they are hiding",
  "mainstream media won't tell", "what the media isn't telling",
  "this one trick", "miracle cure", "big pharma", "hidden truth",
  "the real reason", "what they don't want", "you need to know this",
  "share this", "viral video", "must see", "don't ignore",
  "this will change everything", "life changing", "secret",
  "the government doesn't want", "they're hiding", "cover up",
  "guaranteed", "results may vary", "limited time",
  "doctors are shocked", "everyone is talking about",
  "what the mainstream media", "censored", "banned",
];

const VAGUE_SOURCES = [
  "experts say", "studies show", "some people say", "it is said",
  "according to sources", "scientists believe", "researchers claim",
  "many are saying", "people are saying", "they say",
  "a study found", "research shows", "sources say",
  "critics say", "some experts", "leading scientists",
  "many experts", "it has been suggested",
];

const EMOTIONAL_TRIGGERS = [
  "outrageous", "unbelievable", "terrifying", "horrifying",
  "stunning", "jaw-dropping", "heartbreaking", "disgusting",
  "appalling", "shocking", "devastating", "incredible",
  "mind-blowing", "astounding", "alarming", "frightening",
  "disturbing", "sickening", "infuriating", "scary",
  "horrible", "awful", "dreadful", "monstrous",
  "atrocious", "abominable", "despicable", "contemptible",
];

const LOGICAL_FALLACIES = [
  "if you don't agree", "you're either with us", "everyone knows",
  "it's common sense", "it's obvious", "clearly",
  "any rational person", "only an idiot", "anyone with half a brain",
  "it's well known", "everyone agrees", "nobody in their right mind",
  "either you're with us", "there's no other explanation",
  "it's that simple", "end of story", "case closed",
  "wake up sheeple", "do your own research", "open your eyes",
];

const ULTIMATE_CLAIMS = [
  "100%", "guaranteed", "never before", "first ever",
  "only way", "always", "never", "every single",
  "absolutely", "completely", "totally", "undoubtedly",
  "certainly", "definitely", "without a doubt",
  "proven", "scientifically proven", "clinically proven",
];

interface MatchResult {
  phrase: string;
  index: number;
  category: string;
  severity: 'low' | 'medium' | 'high';
}

function findAllMatches(text: string, patterns: string[], category: string, severity: 'low' | 'medium' | 'high'): MatchResult[] {
  const results: MatchResult[] = [];
  const lower = text.toLowerCase();
  for (const phrase of patterns) {
    let idx = lower.indexOf(phrase);
    while (idx !== -1) {
      results.push({ phrase, index: idx, category, severity });
      idx = lower.indexOf(phrase, idx + 1);
    }
  }
  return results;
}

export function analyzeHeuristics(text: string): SuspiciousSpan[] {
  const spans: SuspiciousSpan[] = [];
  const seen = new Set<string>();

  const addSpan = (match: MatchResult) => {
    const key = `${match.index}-${match.phrase.length}`;
    if (seen.has(key)) return;
    seen.add(key);
    const originalText = text.slice(match.index, match.index + match.phrase.length);
    spans.push({
      start: match.index,
      end: match.index + match.phrase.length,
      text: originalText,
      severity: match.severity,
      reason: `Suspicious ${match.category}`,
      category: match.category,
    });
  };

  const allCapsPattern = /\b[A-Z]{4,}\b/g;
  let capMatch: RegExpExecArray | null;
  while ((capMatch = allCapsPattern.exec(text)) !== null) {
    const word = capMatch[0];
    if (['THE', 'AND', 'FOR', 'ARE', 'NOT', 'YOU', 'WAS', 'HAS', 'HAD', 'BUT', 'ALL', 'CAN', 'ITS'].includes(word)) continue;
    spans.push({
      start: capMatch.index,
      end: capMatch.index + word.length,
      text: word,
      severity: 'medium',
      reason: 'Excessive capitalization for emphasis',
      category: 'emotional language',
    });
  }

  const exclPattern = /!{2,}/g;
  let exclMatch: RegExpExecArray | null;
  while ((exclMatch = exclPattern.exec(text)) !== null) {
    spans.push({
      start: exclMatch.index,
      end: exclMatch.index + exclMatch[0].length,
      text: exclMatch[0],
      severity: 'medium',
      reason: 'Excessive use of exclamation marks',
      category: 'emotional language',
    });
  }

  const questionPattern = /\?{2,}/g;
  let qMatch: RegExpExecArray | null;
  while ((qMatch = questionPattern.exec(text)) !== null) {
    spans.push({
      start: qMatch.index,
      end: qMatch.index + qMatch[0].length,
      text: qMatch[0],
      severity: 'low',
      reason: 'Multiple question marks',
      category: 'emotional language',
    });
  }

  findAllMatches(text, CLICKBAIT_PHRASES, 'clickbait', 'high').forEach(m => addSpan(m));
  findAllMatches(text, VAGUE_SOURCES, 'vague source', 'medium').forEach(m => addSpan(m));
  findAllMatches(text, EMOTIONAL_TRIGGERS, 'emotional trigger', 'medium').forEach(m => addSpan(m));
  findAllMatches(text, LOGICAL_FALLACIES, 'logical fallacy', 'high').forEach(m => addSpan(m));
  findAllMatches(text, ULTIMATE_CLAIMS, 'unverified claim', 'medium').forEach(m => addSpan(m));

  return spans;
}

export function calculateHeuristicScore(spans: SuspiciousSpan[]): { score: number; details: string } {
  if (spans.length === 0) {
    return { score: 100, details: 'No suspicious patterns detected in the text.' };
  }

  const severityValues = { high: 15, medium: 8, low: 3 };
  let penalty = 0;

  for (const span of spans) {
    penalty += severityValues[span.severity];
  }

  penalty = Math.min(penalty, 70);
  const score = Math.max(0, 100 - penalty);

  const categories = new Map<string, number>();
  for (const span of spans) {
    categories.set(span.category, (categories.get(span.category) || 0) + 1);
  }
  const topCats = [...categories.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat, count]) => `${count}× ${cat}`)
    .join(', ');

  const details = `Found ${spans.length} suspicious pattern${spans.length > 1 ? 's' : ''}: ${topCats}.`;
  return { score, details };
}
