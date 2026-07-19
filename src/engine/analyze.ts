import type { AnalysisInput, AnalysisResult } from './types';
import { extractTextFromImage } from './ocr';
import { analyzeWithGemma, loadModels } from './gemmaAnalysis';
import { corsFetch } from './factSources/corsFetch';

async function fetchURLContent(url: string): Promise<string> {
  const html = await corsFetch(url, 10000);
  if (!html) return '';

  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[^;]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const sentences = text.split(/[.!?]+/).filter(s => s.trim().split(/\s+/).length > 5);
  return sentences.slice(0, 50).join('. ').trim();
}

export class AnalysisEngine {
  private onProgress?: (msg: string) => void;

  constructor(onProgress?: (msg: string) => void) {
    this.onProgress = onProgress;
  }

  async startModelLoad() {
    await loadModels(this.onProgress);
  }

  async analyze(input: AnalysisInput): Promise<AnalysisResult> {
    let text = '';

    switch (input.type) {
      case 'text':
        text = input.content.trim();
        break;
      case 'url':
        this.onProgress?.('Fetching URL content...');
        const fetched = await fetchURLContent(input.content);
        if (fetched) {
          text = `URL: ${input.content}\n\nContent from page: ${fetched}`;
        } else {
          text = `URL: ${input.content} (page content could not be fetched)`;
          this.onProgress?.('Could not fetch page content, analyzing URL only...');
        }
        break;
      case 'image':
        if (!input.imageFile) throw new Error('No image file provided');
        this.onProgress?.('Extracting text from image...');
        const ocrText = await extractTextFromImage(input.imageFile, this.onProgress);
        if (!ocrText) throw new Error('No text found in the image.');
        text = ocrText;
        break;
    }

    if (text.length < 2) {
      throw new Error('Not enough content to analyze.');
    }

    this.onProgress?.('Analyzing with Gemma 2B...');
    const result = await analyzeWithGemma(text);
    result.originalText = text;

    return result;
  }
}
