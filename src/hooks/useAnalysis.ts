import { useState, useCallback, useRef } from 'react';
import type { AnalysisInput, AnalysisResult } from '../engine/types';
import { AnalysisEngine } from '../engine/analyze';

export function useAnalysis() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const engineRef = useRef<AnalysisEngine | null>(null);

  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = new AnalysisEngine((msg) => setProgress(msg));
    }
    return engineRef.current;
  }, []);

  const analyze = useCallback(async (input: AnalysisInput) => {
    setLoading(true);
    setError(null);
    setProgress('Starting analysis...');
    setResult(null);

    try {
      const engine = getEngine();
      const res = await engine.analyze(input);
      setResult(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(msg);
    } finally {
      setLoading(false);
      setProgress('');
    }
  }, [getEngine]);

  const reset = useCallback(() => {
    setResult(null);
    setLoading(false);
    setProgress('');
    setError(null);
  }, []);

  return { result, loading, progress, error, analyze, reset };
}
