import type { AnalysisResult, IntentType, Verdict, SuspiciousPart, Source } from './types';

let generator: any = null;
let modelLoading = false;
let loadError: string | null = null;

const MODEL_IDS = [
  'onnx-community/gemma-3-1b-it-ONNX',
  'Xenova/LaMini-Flan-T5-783M',
  'onnx-community/Qwen2.5-1.5B-Instruct-q4',
];

const SYSTEM_PROMPT = `You are TruthScope, a browser-based fact-checking assistant. Analyze the user's input and respond with ONLY valid JSON.

USER INPUT: "{text}"

Respond with one of these JSON formats:

If it is a greeting (hi, hello, how are you, etc):
{"intent":"greeting","intentLabel":"Greeting","explanation":"Friendly response..."}

If it is a question (who, what, when, where, why, how, or ending with ?):
{"intent":"question","intentLabel":"Question","explanation":"Answer the question concisely."}

If it is an opinion (I think, I believe, etc):
{"intent":"opinion","intentLabel":"Opinion","explanation":"Explain this is a subjective opinion."}

If it is a factual claim:
{"intent":"claim","intentLabel":"Factual Claim","verdict":"real or likely_real or uncertain or likely_fake or fake","confidence":0-100,"explanation":"Explain reasoning. If false, state correct facts.","suspiciousParts":[{"text":"exact text from input","reason":"why suspicious"}],"sources":[{"title":"Source name","url":"https://...","snippet":"evidence"}]}

If unclear:
{"intent":"unclear","intentLabel":"Unclear","explanation":"Explain you are unsure."}

Rules: Return ONLY valid JSON. No other text. confidence is 0-100 where 100 = definitely true. Up to 3 sources.`;

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

  for (const modelId of MODEL_IDS) {
    try {
      onProgress?.(`Loading ${modelId}...`);
      const { pipeline } = await import('@huggingface/transformers');

      const pipeType = modelId.includes('Flan-T5') ? 'text2text-generation' : 'text-generation';
      const isGemma = modelId.includes('gemma');

      generator = await (pipeline as any)(pipeType, modelId, {
        dtype: 'q4',
        device: isGemma ? 'webgpu' : 'wasm',
        progress_callback: (p: any) => {
          if (typeof p === 'number') {
            onProgress?.(`Downloading: ${Math.round(p * 100)}%`);
          }
        },
      });

      modelLoading = false;
      onProgress?.('Model ready.');
      return true;
    } catch (err) {
      console.warn(`Failed to load ${modelId}:`, err);
      continue;
    }
  }

  modelLoading = false;
  loadError = 'All models failed to load.';
  return false;
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
  const validIntents: IntentType[] = ['greeting', 'question', 'opinion', 'claim', 'unclear'];
  const intent = validIntents.includes(raw?.intent) ? raw.intent as IntentType : 'unclear';

  const verdicts: Verdict[] = ['real', 'likely_real', 'uncertain', 'likely_fake', 'fake'];
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
  const t = text.trim().toLowerCase();
  const words = t.split(/\s+/).length;

  if (words <= 5 && /^(hi|hello|hey|howdy|good\s*(morning|afternoon|evening)|what'?s\s*up|how'?s\s*it\s*going)/.test(t)) {
    return {
      intent: 'greeting', intentLabel: 'Greeting',
      explanation: "Hi there! I am TruthScope, your fact-checking assistant. Paste a claim or news headline and I will verify it for you.",
      suspiciousParts: [], sources: [], originalText: text, analyzedAt: new Date(), modelLoaded: true,
    };
  }
  if (t.endsWith('?') || /^(who|what|which|when|where|why|how|is|are|was|were|do|does|did|has|have|had|can|could|will|would)\b/.test(t)) {
    return {
      intent: 'question', intentLabel: 'Question',
      explanation: "I detected a question but the analysis model is not loaded yet. Please try again shortly.",
      suspiciousParts: [], sources: [], originalText: text, analyzedAt: new Date(), modelLoaded: true,
    };
  }
  if (/\b(i think|i believe|i feel|i guess|in my opinion|personally|i love|i hate|i like)\b/.test(t)) {
    return {
      intent: 'opinion', intentLabel: 'Opinion',
      explanation: "This appears to be a personal opinion, which cannot be objectively fact-checked. I need the AI model to verify factual claims.",
      suspiciousParts: [], sources: [], originalText: text, analyzedAt: new Date(), modelLoaded: true,
    };
  }
  return {
    intent: 'claim', intentLabel: 'Factual Claim',
    explanation: "I could not load the analysis model. Make sure you are online for the first download (~300-900MB). Once cached, it works offline. Please refresh and try again.",
    suspiciousParts: [], sources: [], originalText: text, analyzedAt: new Date(), modelLoaded: true,
  };
}

export async function analyzeWithGemma(text: string): Promise<AnalysisResult> {
  if (!generator) {
    const loaded = await loadModels();
    if (!loaded) return buildFallback(text);
  }

  try {
    const prompt = SYSTEM_PROMPT.replace('{text}', text.replace(/"/g, "'"));
    const isT5 = generator.model.config?.model_type === 't5' || generator.model.config?.architectures?.[0]?.includes('T5');

    const result = await generator(prompt, {
      max_new_tokens: 512,
      temperature: 0.1,
      do_sample: false,
      ...(isT5 ? {} : { repetition_penalty: 1.1 }),
    });

    const generated: string = result[0]?.generated_text || '';
    const responseText = isT5 ? generated : (generated.includes(prompt) ? generated.slice(prompt.length).trim() : generated);

    const parsed = tryParseJSON(responseText);
    if (parsed) return sanitizeResult(parsed, text);

    const lastBrace = responseText.lastIndexOf('}');
    if (lastBrace !== -1) {
      const jsonOnly = responseText.slice(responseText.indexOf('{'), lastBrace + 1);
      const parsed2 = tryParseJSON(jsonOnly);
      if (parsed2) return sanitizeResult(parsed2, text);
    }

    console.warn('Model returned unparseable output:', responseText.slice(0, 200));
    return {
      ...buildFallback(text),
      explanation: "Analysis complete but the result format was unexpected. Please try rephrasing your input.",
    };
  } catch (err) {
    console.error('Model analysis failed:', err);
    return {
      ...buildFallback(text),
      error: err instanceof Error ? err.message : 'Analysis failed',
    };
  }
}
