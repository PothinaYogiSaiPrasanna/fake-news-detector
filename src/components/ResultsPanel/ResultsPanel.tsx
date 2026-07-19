import type { AnalysisResult } from '../../engine/types';
import { VerdictBadge } from './VerdictBadge';
import { ConfidenceMeter } from './ConfidenceMeter';
import { DownloadPDFButton } from './DownloadPDFButton';

interface ResultsPanelProps {
  result: AnalysisResult;
}

function GreetingResult({ result }: { result: AnalysisResult }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
      <div className="text-5xl mb-4">👋</div>
      <h2 className="text-xl font-semibold text-gray-800 mb-2">{result.intentLabel}</h2>
      <p className="text-gray-500 max-w-md mx-auto leading-relaxed">{result.explanation}</p>
    </div>
  );
}

function OpinionResult({ result }: { result: AnalysisResult }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
      <div className="text-5xl mb-4">💭</div>
      <h2 className="text-xl font-semibold text-gray-800 mb-2">{result.intentLabel}</h2>
      <p className="text-gray-500 max-w-md mx-auto leading-relaxed">{result.explanation}</p>
    </div>
  );
}

function QuestionResult({ result }: { result: AnalysisResult }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      <div className="flex items-start gap-4 mb-4">
        <div className="text-3xl">❓</div>
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-1">{result.intentLabel}</h2>
          <p className="text-gray-600 leading-relaxed">{result.explanation}</p>
        </div>
      </div>
      {result.sources.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 mb-2">Sources:</p>
          {result.sources.map((s, i) => (
            <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
              className="block text-xs text-blue-600 hover:underline mb-1 truncate">
              {s.title}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function ClaimResult({ result }: { result: AnalysisResult }) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <ConfidenceMeter score={result.confidence ?? 50} />
          <div className="text-center sm:text-left flex-1">
            <div className="flex items-center gap-3 mb-2">
              {result.verdict && <VerdictBadge verdict={result.verdict} />}
            </div>
            <p className="text-sm text-gray-500 mt-1">{result.explanation}</p>
            <div className="mt-4">
              <DownloadPDFButton result={result} />
            </div>
          </div>
        </div>
      </div>

      {result.suspiciousParts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Suspicious Content</h2>
          <div className="space-y-3">
            {result.suspiciousParts.map((sp, i) => (
              <div key={i} className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm font-medium text-red-800 mb-1">&ldquo;{sp.text}&rdquo;</p>
                <p className="text-xs text-red-600">{sp.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.sources.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sources</h2>
          <div className="space-y-3">
            {result.sources.slice(0, 5).map((s, i) => (
              <div key={i}>
                <a href={s.url} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline font-medium">
                  {s.title}
                </a>
                {s.snippet && <p className="text-xs text-gray-500 mt-0.5">{s.snippet}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UnclearResult({ result }: { result: AnalysisResult }) {
  return (
    <div className="space-y-6">
      {result.confidence !== undefined && result.verdict && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ConfidenceMeter score={result.confidence} />
            <div className="text-center sm:text-left flex-1">
              <div className="flex items-center gap-3 mb-2">
                <VerdictBadge verdict={result.verdict} />
              </div>
              <p className="text-sm text-gray-500">{result.explanation}</p>
              <div className="mt-4">
                <DownloadPDFButton result={result} />
              </div>
            </div>
          </div>
        </div>
      )}
      {!result.verdict && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">{result.intentLabel}</h2>
          <p className="text-gray-500">{result.explanation}</p>
        </div>
      )}
    </div>
  );
}

export function ResultsPanel({ result }: ResultsPanelProps) {
  if (result.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <div className="text-3xl mb-2">⚠️</div>
        <h2 className="text-lg font-semibold text-red-800 mb-2">Analysis Error</h2>
        <p className="text-red-600">{result.error}</p>
      </div>
    );
  }

  switch (result.intent) {
    case 'greeting': return <GreetingResult result={result} />;
    case 'opinion': return <OpinionResult result={result} />;
    case 'question': return <QuestionResult result={result} />;
    case 'claim': return <ClaimResult result={result} />;
    default: return <UnclearResult result={result} />;
  }
}
