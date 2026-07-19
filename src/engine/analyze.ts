import type { AnalysisInput, AnalysisResult, SignalScore, SuspiciousSpan, Verdict } from './types';
import { analyzeHeuristics, calculateHeuristicScore } from './heuristicAnalysis';
import { analyzeWithML, loadModels } from './mlAnalysis';
import { analyzeURL } from './urlAnalysis';
import { extractTextFromImage } from './ocr';
import { factCheck } from './factCheck';

const CORS_PROXIES = [
  (url: string) => `https://proxy.cors.sh/${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.org/?${encodeURIComponent(url)}`,
];

async function fetchURLContent(url: string): Promise<string> {
  for (const proxy of CORS_PROXIES) {
    try {
      const res = await fetch(proxy(url), { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const html = await res.text();

      const textContent = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&[^;]+;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const sentences = textContent.split(/[.!?]+/).filter(s => s.trim().split(/\s+/).length > 5);
      return sentences.slice(0, 30).join('. ').trim();
    } catch {
      continue;
    }
  }
  return '';
}

export class AnalysisEngine {
  private modelLoading = false;
  private onProgress?: (msg: string) => void;

  constructor(onProgress?: (msg: string) => void) {
    this.onProgress = onProgress;
  }

  async startModelLoad() {
    if (this.modelLoading) return;
    this.modelLoading = true;
    await loadModels(this.onProgress);
  }

  async analyze(input: AnalysisInput): Promise<AnalysisResult> {
    let text = '';
    let urlSignal: { score: number; details: string; spans: SuspiciousSpan[] } | null = null;
    let urlContentFetched = false;

    switch (input.type) {
      case 'text':
        text = input.content.trim();
        break;
      case 'url':
        urlSignal = analyzeURL(input.content);
        this.onProgress?.('Fetching URL content...');
        const fetched = await fetchURLContent(input.content);
        urlContentFetched = !!fetched;
        text = fetched || input.content;
        if (!fetched) {
          this.onProgress?.('Could not fetch page content, analyzing URL only...');
        }
        break;
      case 'image':
        if (!input.imageFile) throw new Error('No image file provided');
        this.onProgress?.('Extracting text from image...');
        text = await extractTextFromImage(input.imageFile, this.onProgress);
        if (!text) throw new Error('No text found in the image.');
        break;
    }

    if (text.length < 10) {
      throw new Error('Not enough text to analyze. Please provide more content.');
    }

    this.onProgress?.('Running heuristic analysis...');
    const heuristicSpans = analyzeHeuristics(text);
    const heuristicResult = calculateHeuristicScore(heuristicSpans);

    this.onProgress?.('Fact-checking claims...');
    const factCheckResult = await factCheck(text);

    this.onProgress?.('Loading AI models...');
    await this.startModelLoad();

    this.onProgress?.('Running ML analysis...');
    const mlResult = await analyzeWithML(text);

    const signals: SignalScore[] = [];

    if (mlResult.modelLoaded && mlResult.aiDetectionScore !== null) {
      signals.push({
        name: 'AI Text Detection',
        score: mlResult.aiDetectionScore,
        weight: 30,
        details: mlResult.aiLabel === 'Real'
          ? 'Text appears to be human-written.'
          : 'Text appears to be AI-generated, which may indicate fabricated content.',
      });
    }

    if (mlResult.modelLoaded && mlResult.zeroShotScore !== null) {
      signals.push({
        name: 'Content Classification',
        score: mlResult.zeroShotScore,
        weight: 20,
        details: mlResult.zeroShotLabel === 'factual news'
          ? 'Content classified as factual.'
          : `Content classified as "${mlResult.zeroShotLabel}".`,
      });
    }

    if (urlSignal) {
      signals.push({
        name: 'URL Credibility',
        score: urlSignal.score,
        weight: urlSignal.spans.length > 0 ? 15 : 10,
        details: urlSignal.details,
        spans: urlSignal.spans,
      });
    }

    if (factCheckResult.spans.length > 0) {
      signals.push({
        name: 'Factual Accuracy',
        score: factCheckResult.score,
        weight: factCheckResult.hasFactualError ? 60 : 25,
        details: factCheckResult.details,
        spans: factCheckResult.spans,
      });
    }

    if (heuristicResult.score < 100) {
      signals.push({
        name: 'Language Patterns',
        score: heuristicResult.score,
        weight: mlResult.modelLoaded ? 25 : 35,
        details: heuristicResult.details,
        spans: heuristicSpans,
      });
    } else {
      signals.push({
        name: 'Language Patterns',
        score: heuristicResult.score,
        weight: mlResult.modelLoaded ? 25 : 35,
        details: heuristicResult.details,
      });
    }

    let totalWeight = 0;
    let weightedSum = 0;
    for (const s of signals) {
      weightedSum += s.score * s.weight;
      totalWeight += s.weight;
    }
    const overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 50;

    const allSpans = [...heuristicSpans, ...factCheckResult.spans];
    if (urlSignal && !urlContentFetched) {
      allSpans.push(...urlSignal.spans);
    }
    allSpans.sort((a, b) => a.start - b.start);

    let verdict: Verdict;
    if (factCheckResult.hasFactualError && overallScore < 50) {
      verdict = 'fake';
    } else if (overallScore >= 80) verdict = 'real';
    else if (overallScore >= 60) verdict = 'likely_real';
    else if (overallScore >= 40) verdict = 'uncertain';
    else if (overallScore >= 20) verdict = 'likely_fake';
    else verdict = 'fake';

    return {
      overallScore,
      verdict,
      signals,
      suspiciousSpans: allSpans,
      originalText: text,
      analyzedAt: new Date(),
      modelLoaded: mlResult.modelLoaded,
    };
  }
}
