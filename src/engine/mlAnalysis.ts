const AI_DETECTOR_MODEL = 'nicoamoretti/roberta-openai-detector-onnx';
const ZERO_SHOT_MODEL = 'Xenova/mobilebert-uncased-mnli';

let aiDetectorPipeline: any = null;
let zeroShotPipeline: any = null;
let modelLoadAttempted = false;

export async function loadModels(onProgress?: (msg: string) => void) {
  if (modelLoadAttempted) return;
  modelLoadAttempted = true;

  try {
    const { pipeline } = await import('@huggingface/transformers');

    onProgress?.('Loading AI text detector model (~120MB)...');
    aiDetectorPipeline = await pipeline('text-classification', AI_DETECTOR_MODEL, {
      dtype: 'q4',
    });

    onProgress?.('Loading zero-shot classifier (~94MB)...');
    zeroShotPipeline = await pipeline('zero-shot-classification', ZERO_SHOT_MODEL, {
      dtype: 'q4',
    });
  } catch (err) {
    console.warn('Failed to load ML models:', err);
  }
}

export interface MLAnalysisResult {
  aiDetectionScore: number | null;
  zeroShotScore: number | null;
  aiLabel: string;
  zeroShotLabel: string;
  modelLoaded: boolean;
}

export async function analyzeWithML(text: string): Promise<MLAnalysisResult> {
  const result: MLAnalysisResult = {
    aiDetectionScore: null,
    zeroShotScore: null,
    aiLabel: '',
    zeroShotLabel: '',
    modelLoaded: false,
  };

  try {
    if (!aiDetectorPipeline || !zeroShotPipeline) {
      await loadModels();
    }

    if (!aiDetectorPipeline || !zeroShotPipeline) {
      return result;
    }

    result.modelLoaded = true;

    const truncated = text.slice(0, 3000);

    const [aiResult] = await aiDetectorPipeline(truncated);
    result.aiLabel = aiResult.label;
    result.aiDetectionScore = aiResult.label === 'Real' ? aiResult.score * 100 : (1 - aiResult.score) * 100;

    const zsResult = await zeroShotPipeline(truncated, ['factual news', 'misleading information', 'fake news'], {
      multiLabel: false,
    });
    result.zeroShotLabel = zsResult.labels[0];
    result.zeroShotScore = zsResult.scores[0] * 100;

    if (zsResult.labels[0] === 'factual news') {
      result.zeroShotScore = zsResult.scores[0] * 100;
    } else {
      result.zeroShotScore = (1 - zsResult.scores[0]) * 100;
    }
  } catch (err) {
    console.warn('ML analysis error:', err);
  }

  return result;
}

export function isModelAvailable(): boolean {
  return aiDetectorPipeline !== null || zeroShotPipeline !== null;
}
