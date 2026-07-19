import type { AnalysisResult } from '../../engine/types';
import { VerdictBadge } from './VerdictBadge';
import { ConfidenceMeter } from './ConfidenceMeter';
import { HighlightedText } from './HighlightedText';
import { EvidenceBreakdown } from './EvidenceBreakdown';
import { DownloadPDFButton } from './DownloadPDFButton';

interface ResultsPanelProps {
  result: AnalysisResult;
}

export function ResultsPanel({ result }: ResultsPanelProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <ConfidenceMeter score={result.overallScore} />
          <div className="text-center sm:text-left flex-1">
            <div className="flex items-center gap-3 mb-2">
              <VerdictBadge verdict={result.verdict} />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Overall credibility score based on {result.signals.length} signal{result.signals.length > 1 ? 's' : ''}
              {result.modelLoaded ? ' (including AI analysis)' : ' (AI models loading)'}
            </p>
            <div className="mt-4">
              <DownloadPDFButton result={result} />
            </div>
          </div>
        </div>
      </div>

      {result.suspiciousSpans.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Analyzed Text with Highlights</h2>
          <p className="text-sm text-gray-500 mb-4">
            Hover over highlighted text to see why it was flagged.
          </p>
          <HighlightedText text={result.originalText} spans={result.suspiciousSpans} />
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <EvidenceBreakdown signals={result.signals} />
      </div>
    </div>
  );
}
