export type InputType = 'text' | 'url' | 'image';

export interface AnalysisInput {
  type: InputType;
  content: string;
  imageFile?: File;
}

export interface Source {
  title: string;
  url: string;
  snippet: string;
}

export interface SuspiciousSpan {
  start: number;
  end: number;
  text: string;
  severity: 'low' | 'medium' | 'high';
  reason: string;
  category: string;
  sources?: Source[];
}

export interface SignalScore {
  name: string;
  score: number;
  weight: number;
  details: string;
  spans?: SuspiciousSpan[];
  sources?: Source[];
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
