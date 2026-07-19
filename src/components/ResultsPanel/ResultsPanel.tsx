import type { AnalysisResult } from '../../engine/types';
import { VerdictBadge } from './VerdictBadge';
import { ConfidenceMeter } from './ConfidenceMeter';
import { HighlightedText } from './HighlightedText';
import { EvidenceBreakdown } from './EvidenceBreakdown';
import { DownloadPDFButton } from './DownloadPDFButton';

interface ResultsPanelProps {
  result: AnalysisResult;
}

function GreetingResult({ text }: { text: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
      <div className="text-5xl mb-4">👋</div>
      <h2 className="text-xl font-semibold text-gray-800 mb-2">
        Hi there!
      </h2>
      <p className="text-gray-500 max-w-md mx-auto leading-relaxed">
        This looks like a greeting or casual conversation. I'm designed to fact-check news articles, claims, and statements. Try pasting a news headline or something you've heard and I'll verify it for you.
      </p>
      <p className="text-xs text-gray-400 mt-4">
        Input: <span className="italic">"{text.slice(0, 60)}{text.length > 60 ? '...' : ''}"</span>
      </p>
    </div>
  );
}

function OpinionResult({ text }: { text: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
      <div className="text-5xl mb-4">💭</div>
      <h2 className="text-xl font-semibold text-gray-800 mb-2">
        Opinion Detected
      </h2>
      <p className="text-gray-500 max-w-md mx-auto leading-relaxed">
        This appears to be a personal opinion or subjective statement. Opinions are based on personal beliefs and perspectives, so they can't be verified as true or false. Try pasting a factual claim for fact-checking.
      </p>
      <p className="text-xs text-gray-400 mt-4">
        Input: <span className="italic">"{text.slice(0, 60)}{text.length > 60 ? '...' : ''}"</span>
      </p>
    </div>
  );
}

function QuestionResult({ result }: { result: AnalysisResult }) {
  const hasSignals = result.signals && result.signals.length > 0;
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className="text-3xl">❓</div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Question Detected</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              You asked a question. The analysis below shows any relevant fact-checks or patterns found. Questions themselves aren't "fake" — but the claims within them can be checked.
            </p>
          </div>
        </div>
      </div>
      {result.overallScore !== undefined && result.verdict && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ConfidenceMeter score={result.overallScore} />
            <div className="text-center sm:text-left flex-1">
              <div className="flex items-center gap-3 mb-2">
                <VerdictBadge verdict={result.verdict} />
              </div>
              {hasSignals && (
                <p className="text-sm text-gray-500 mt-1">
                  Based on {result.signals!.length} signal{result.signals!.length > 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      {hasSignals && result.signals!.some(s => s.spans && s.spans.length > 0) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Analyzed Text</h2>
          <HighlightedText text={result.originalText} spans={result.suspiciousSpans || []} />
        </div>
      )}
      {hasSignals && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <EvidenceBreakdown signals={result.signals!} />
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
          <ConfidenceMeter score={result.overallScore!} />
          <div className="text-center sm:text-left flex-1">
            <div className="flex items-center gap-3 mb-2">
              <VerdictBadge verdict={result.verdict!} />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Overall credibility score based on {result.signals!.length} signal{result.signals!.length > 1 ? 's' : ''}
              {result.modelLoaded ? ' (including AI analysis)' : ' (AI models loading)'}
            </p>
            <div className="mt-4">
              <DownloadPDFButton result={result} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Analyzed Text</h2>
        {result.suspiciousSpans && result.suspiciousSpans.length > 0 && (
          <p className="text-sm text-gray-500 mb-4">Hover over highlighted text to see why it was flagged.</p>
        )}
        <HighlightedText text={result.originalText} spans={result.suspiciousSpans || []} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <EvidenceBreakdown signals={result.signals!} />
      </div>
    </div>
  );
}

function UnclearResult({ result }: { result: AnalysisResult }) {
  const hasSignals = result.signals && result.signals.length > 0;
  return (
    <div className="space-y-6">
      {result.overallScore !== undefined && result.verdict && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ConfidenceMeter score={result.overallScore} />
            <div className="text-center sm:text-left flex-1">
              <div className="flex items-center gap-3 mb-2">
                <VerdictBadge verdict={result.verdict} />
              </div>
              {hasSignals && (
                <p className="text-sm text-gray-500 mt-1">
                  Based on {result.signals!.length} signal{result.signals!.length > 1 ? 's' : ''}
                </p>
              )}
              <div className="mt-4">
                <DownloadPDFButton result={result} />
              </div>
            </div>
          </div>
        </div>
      )}
      {result.suspiciousSpans && result.suspiciousSpans.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Analyzed Text</h2>
          <HighlightedText text={result.originalText} spans={result.suspiciousSpans} />
        </div>
      )}
      {hasSignals && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <EvidenceBreakdown signals={result.signals!} />
        </div>
      )}
    </div>
  );
}

export function ResultsPanel({ result }: ResultsPanelProps) {
  switch (result.intent.type) {
    case 'greeting':
      return <GreetingResult text={result.originalText} />;
    case 'opinion':
      return <OpinionResult text={result.originalText} />;
    case 'question':
      return <QuestionResult result={result} />;
    case 'claim':
      return <ClaimResult result={result} />;
    default:
      return <UnclearResult result={result} />;
  }
}
