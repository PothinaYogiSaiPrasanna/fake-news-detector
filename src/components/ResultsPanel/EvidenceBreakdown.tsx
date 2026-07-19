import type { SignalScore } from '../../engine/types';

interface EvidenceBreakdownProps {
  signals: SignalScore[];
}

function SourcesList({ sources }: { sources: NonNullable<SignalScore['sources']> }) {
  if (sources.length === 0) return null;
  const displayed = sources.slice(0, 5);
  return (
    <div className="mt-2 space-y-1.5">
      <p className="text-xs font-medium text-gray-500">Sources ({displayed.length}):</p>
      {displayed.map((s, i) => (
        <div key={i} className="flex flex-col gap-0.5">
          <a
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline truncate"
          >
            {s.title}
          </a>
          {s.snippet && (
            <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-2">{s.snippet}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function SignalBar({ signal }: { signal: SignalScore }) {
  const getColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-green-400';
    if (score >= 40) return 'bg-amber-400';
    if (score >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">{signal.name}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Weight: {signal.weight}%</span>
          <span className={`font-semibold ${
            signal.score >= 60 ? 'text-green-600' : 'text-amber-600'
          }`}>
            {Math.round(signal.score)}%
          </span>
        </div>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${getColor(signal.score)}`}
          style={{ width: `${signal.score}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">{signal.details}</p>
      {signal.spans && signal.spans.length > 0 && (
        <p className="text-xs text-gray-400">
          {signal.spans.length} suspicious indicator{signal.spans.length > 1 ? 's' : ''} found
        </p>
      )}
      {signal.sources && <SourcesList sources={signal.sources} />}
    </div>
  );
}

export function EvidenceBreakdown({ signals }: EvidenceBreakdownProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Signal Breakdown</h3>
      {signals.map((signal, i) => (
        <SignalBar key={i} signal={signal} />
      ))}
    </div>
  );
}
