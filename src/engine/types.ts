export type InputType = 'text' | 'url' | 'image';

export interface AnalysisInput {
  type: InputType;
  content: string;
  imageFile?: File;
}

export interface SuspiciousSpan {
  start: number;
  end: number;
  text: string;
  severity: 'low' | 'medium' | 'high';
  reason: string;
  category: string;
}

export interface SignalScore {
  name: string;
  score: number;
  weight: number;
  details: string;
  spans?: SuspiciousSpan[];
}

export type Verdict = 'real' | 'likely_real' | 'uncertain' | 'likely_fake' | 'fake';

export interface AnalysisResult {
  overallScore: number;
  verdict: Verdict;
  signals: SignalScore[];
  suspiciousSpans: SuspiciousSpan[];
  originalText: string;
  analyzedAt: Date;
  modelLoaded: boolean;
}
