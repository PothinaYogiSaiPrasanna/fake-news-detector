import type { IntentResult } from './types';

const GREETING_PATTERNS = [
  /^(hi|hello|hey|greetings|sup|yo|howdy|good\s*(morning|afternoon|evening|day))(\s|$|[.!?,])/i,
  /^(what'?s\s*up|how'?s\s*it\s*going|how\s*are\s*you|nice\s*to\s*meet\s*you)/i,
  /^(bye|goodbye|cya|see\s*ya|later|peace)(\s|$|[.!?,])/i,
];

const QUESTION_PATTERNS = [
  /^(who|what|which|when|where|why|how|whose|whom)\b/i,
  /^(is|are|was|were|do|does|did|has|have|had|can|could|will|would|shall|should|may|might)\s+\w/i,
  /\?\s*$/,
];

const OPINION_PATTERNS = [
  /\bi\s*(think|believe|feel|guess|suppose|reckon|consider|find)\b/i,
  /\bin\s*my\s*opinion\b/i,
  /\b(from\s*)?my\s*(point\s*of\s*view|perspective|viewpoint)\b/i,
  /\b(personally|frankly|honestly)\s*,?\s+i\b/i,
  /\bi\s*would\s*(say|argue|suggest)\b/i,
  /\bit\s*seems?\s*(to\s*me|like)\b/i,
  /\bi\s*(love|hate|like|dislike|enjoy|prefer|admire|detest)\b/i,
  /\bi\s*don'?t\s*(think|believe|like|agree)\b/i,
  /\bas\s*far\s*as\s*i'?m\s*concerned\b/i,
  /\bi'?m\s*(not\s*)?sure\b/i,
];

export function classifyIntent(text: string): IntentResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { type: 'unclear', label: 'Unclear', explanation: 'No text provided.' };
  }

  for (const pattern of GREETING_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        type: 'greeting',
        label: 'Greeting / Chit-chat',
        explanation: 'This appears to be a greeting or casual conversation, not a factual claim or question.',
      };
    }
  }

  for (const pattern of QUESTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        type: 'question',
        label: 'Question',
        explanation: 'You asked a question. The app will attempt to find an answer rather than judge truthfulness.',
      };
    }
  }

  for (const pattern of OPINION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        type: 'opinion',
        label: 'Opinion / Subjective Statement',
        explanation: 'This appears to be a personal opinion or subjective statement. Opinions are not evaluated for factual accuracy.',
      };
    }
  }

  const words = trimmed.split(/\s+/);
  if (words.length >= 3 && /\b(is|are|was|were)\b/i.test(trimmed)) {
    if (/\b(the|a|an|this|that|these|those|my|our|his|her|their)\b/i.test(trimmed)) {
      return {
        type: 'claim',
        label: 'Factual Claim',
        explanation: 'This appears to be a factual claim. Running multi-source verification.',
      };
    }
    if (words.length <= 5 && !OPINION_PATTERNS.some(p => p.test(trimmed))) {
      return {
        type: 'claim',
        label: 'Factual Claim',
        explanation: 'This appears to be a factual claim about someone or something. Running multi-source verification.',
      };
    }
  }

  if (words.length >= 5) {
    return {
      type: 'claim',
      label: 'Factual Claim',
      explanation: 'This appears to be a factual claim. Running multi-source verification.',
    };
  }

  return {
    type: 'unclear',
    label: 'Unclear',
    explanation: 'Could not determine the intent of this text. Running basic analysis.',
  };
}
