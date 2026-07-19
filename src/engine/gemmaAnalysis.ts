import type { AnalysisResult, IntentType, Verdict, SuspiciousPart, Source } from './types';

let generator: any = null;
let modelLoading = false;
let loadError: string | null = null;

const MODEL_ID = 'onnx-community/gemma-2b-it-q4';

const SYSTEM_PROMPT = `You are TruthScope, a browser-based fact-checking assistant. Analyze the user's input and respond with ONLY valid JSON.

If it's a greeting (hi, hello, how are you, etc):
{"intent":"greeting","intentLabel":"Greeting","explanation":"..."}

If it's a question (who, what, when, where, why, how, or ending with ?):
{"intent":"question","intentLabel":"Question","explanation":"The answer to your question is: ..."}

If it's an opinion (I think, I believe, in my opinion, etc):
{"intent":"opinion","intentLabel":"Opinion","explanation":"..."}

If it's a factual claim (statement that can be verified):
{"intent":"claim","intentLabel":"Factual Claim","verdict":"real|likely_real|uncertain|likely_fake|fake","confidence":0-100,"explanation":"Explain your reasoning. If false, state the correct fact.","suspiciousParts":[{"text":"exact text of suspicious part","reason":"why it's suspicious"}],"sources":[{"title":"source name","url":"https://...","snippet":"brief evidence"}]}

If unclear:
{"intent":"unclear","intentLabel":"Unclear","explanation":"..."}

Rules:
- Use your training knowledge to verify claims. If you know the claim is false, say so and provide correct info.
- For "suspiciousParts", quote the EXACT text from the input that is problematic.
- Include up to 3 sources when you reference specific factual knowledge.
- For questions, provide a concise answer.
- For greetings and opinions, be friendly and brief.
- Return ONLY the JSON object, nothing else.
- confidence: 0-100 where 100 = definitely true, 0 = definitely false`;

export function isModelLoading(): boolean {
  return modelLoading;
}

export function getLoadError(): string | null {
  return loadError;
}

export async function loadModels(onProgress?: (msg: string) => void): Promise<boolean> {
  if (generator) return true;
  if (modelLoading) return false;

  modelLoading = true;
  loadError = null;

  try {
    onProgress?.('Loading Gemma 2B (q4) — ~1.3GB download...');
    const { pipeline } = await import('@huggingface/transformers');

    generator = await pipeline('text-generation', MODEL_ID, {
      dtype: 'q4',
      device: 'wasm',
      progress_callback: (p: any) => {
        if (typeof p === 'number') {
          const pct = Math.round(p * 100);
          onProgress?.(`Downloading Gemma: ${pct}%`);
        }
      },
    });

    modelLoading = false;
    onProgress?.('Gemma model ready.');
    return true;
  } catch (err) {
    modelLoading = false;
    loadError = err instanceof Error ? err.message : 'Failed to load model';
    console.error('Gemma load failed:', loadError);
    return false;
  }
}

function tryParseJSON(text: string): any {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

function sanitizeResult(raw: any, originalText: string): AnalysisResult {
  const intent = (['greeting', 'question', 'opinion', 'claim', 'unclear'] as IntentType[]).includes(raw?.intent)
    ? raw.intent as IntentType
    : 'unclear';

  const verdicts = ['real', 'likely_real', 'uncertain', 'likely_fake', 'fake'] as Verdict[];
  const verdict = verdicts.includes(raw?.verdict) ? raw.verdict as Verdict : undefined;

  const suspiciousParts: SuspiciousPart[] = (raw?.suspiciousParts || []).map((sp: any) => ({
    text: typeof sp?.text === 'string' ? sp.text : '',
    reason: typeof sp?.reason === 'string' ? sp.reason : '',
  })).filter((sp: SuspiciousPart) => sp.text);

  const sources: Source[] = (raw?.sources || []).map((s: any) => ({
    title: typeof s?.title === 'string' ? s.title : 'Source',
    url: typeof s?.url === 'string' ? s.url : '',
    snippet: typeof s?.snippet === 'string' ? s.snippet : '',
  })).filter((s: Source) => s.url || s.snippet);

  return {
    intent,
    intentLabel: typeof raw?.intentLabel === 'string' ? raw.intentLabel : intent.charAt(0).toUpperCase() + intent.slice(1),
    verdict,
    confidence: typeof raw?.confidence === 'number' ? Math.max(0, Math.min(100, raw.confidence)) : undefined,
    explanation: typeof raw?.explanation === 'string' ? raw.explanation : '',
    suspiciousParts,
    sources,
    originalText,
    analyzedAt: new Date(),
    modelLoaded: true,
  };
}

function buildFallback(text: string): AnalysisResult {
  const words = text.split(/\s+/).length;
  if (words <= 3 && /^(hi|hello|hey|howdy|good\s*(morning|afternoon|evening))/i.test(text)) {
    return {
      intent: 'greeting', intentLabel: 'Greeting',
      explanation: "Hi there! I am TruthScope, your fact-checking assistant. Paste a claim or news headline and I will verify it for you.",
      suspiciousParts: [], sources: [], originalText: text, analyzedAt: new Date(), modelLoaded: true,
    };
  }
  if (/\?/.test(text) || /^(who|what|which|when|where|why|how|is|are|was|were|do|does|did)\b/i.test(text)) {
    return {
      intent: 'question', intentLabel: 'Question',
      explanation: "I detected a question. The Gemma model is still loading. Once ready, I can answer it for you.",
      suspiciousParts: [], sources: [], originalText: text, analyzedAt: new Date(), modelLoaded: true,
    };
  }
  if (/\bi\s*(think|believe|feel|guess)\b/i.test(text)) {
    return {
      intent: 'opinion', intentLabel: 'Opinion',
      explanation: "This appears to be a personal opinion, which cannot be fact-checked as true or false.",
      suspiciousParts: [], sources: [], originalText: text, analyzedAt: new Date(), modelLoaded: true,
    };
  }
  return {
    intent: 'claim', intentLabel: 'Factual Claim',
    explanation: 'The Gemma model is still loading. Please try again shortly for a full analysis.',
    suspiciousParts: [], sources: [], originalText: text, analyzedAt: new Date(), modelLoaded: true,
  };
}

export async function analyzeWithGemma(text: string): Promise<AnalysisResult> {
  if (!generator) {
    const loaded = await loadModels();
    if (!loaded) return buildFallback(text);
  }

  try {
    const prompt = `${SYSTEM_PROMPT}\n\nInput: "${text}"\n\nResponse:`;
    const result = await generator(prompt, {
      max_new_tokens: 512,
      temperature: 0.1,
      do_sample: false,
      repetition_penalty: 1.1,
    });

    const generated = result[0]?.generated_text || '';
    const responseText = generated.includes('Response:')
      ? generated.split('Response:')[1].trim()
      : generated;

    const parsed = tryParseJSON(responseText);
    if (parsed) return sanitizeResult(parsed, text);

    console.warn('Gemma returned unparseable output:', responseText.slice(0, 200));
    return {
      ...buildFallback(text),
      explanation: 'Could not parse the analysis. Please try rephrasing.',
    };
  } catch (err) {
    console.error('Gemma analysis failed:', err);
    return {
      ...buildFallback(text),
      error: err instanceof Error ? err.message : 'Analysis failed',
    };
  }
}
