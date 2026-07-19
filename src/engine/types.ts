export type InputType = 'text' | 'url' | 'image';

export type IntentType = 'greeting' | 'question' | 'opinion' | 'claim' | 'unclear';

export type Verdict = 'real' | 'likely_real' | 'uncertain' | 'likely_fake' | 'fake';

export interface AnalysisInput {
  type: InputType;
  content: string;
  imageFile?: File;
}

export interface SuspiciousPart {
  text: string;
  reason: string;
}

export interface Source {
  title: string;
  url: string;
  snippet: string;
}

export interface AnalysisResult {
  intent: IntentType;
  intentLabel: string;
  verdict?: Verdict;
  confidence?: number;
  explanation: string;
  suspiciousParts: SuspiciousPart[];
  sources: Source[];
  originalText: string;
  analyzedAt: Date;
  modelLoaded: boolean;
  error?: string;
}
