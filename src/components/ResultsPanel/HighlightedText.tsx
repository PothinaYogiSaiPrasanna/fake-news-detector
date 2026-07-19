import type { SuspiciousSpan } from '../../engine/types';

interface HighlightedTextProps {
  text: string;
  spans: SuspiciousSpan[];
}

const SEVERITY_CLASSES = {
  high: 'bg-red-200 text-red-900 border-b-2 border-red-500',
  medium: 'bg-orange-200 text-orange-900 border-b-2 border-orange-400',
  low: 'bg-yellow-200 text-yellow-900 border-b-2 border-yellow-400',
};

export function HighlightedText({ text, spans }: HighlightedTextProps) {
  if (spans.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{text}</p>
      </div>
    );
  }

  const sorted = [...spans].sort((a, b) => a.start - b.start);
  const merged: SuspiciousSpan[] = [];

  for (const span of sorted) {
    if (merged.length === 0) {
      merged.push(span);
      continue;
    }
    const last = merged[merged.length - 1];
    if (span.start <= last.end) {
      last.end = Math.max(last.end, span.end);
      last.text = text.slice(last.start, last.end);
      last.severity = span.severity === 'high' || last.severity === 'high' ? 'high'
        : span.severity === 'medium' || last.severity === 'medium' ? 'medium'
        : 'low';
      last.reason = [last.reason, span.reason].filter(Boolean).join('; ');
    } else {
      merged.push(span);
    }
  }

  const parts: { text: string; span?: SuspiciousSpan }[] = [];
  let lastIdx = 0;

  for (const span of merged) {
    if (span.start > lastIdx) {
      parts.push({ text: text.slice(lastIdx, span.start) });
    }
    parts.push({ text: span.text, span });
    lastIdx = span.end;
  }
  if (lastIdx < text.length) {
    parts.push({ text: text.slice(lastIdx) });
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="mb-3 flex gap-4 text-xs flex-wrap">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-red-200 border border-red-500" />
          High suspicion
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-orange-200 border border-orange-400" />
          Medium suspicion
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-yellow-200 border border-yellow-400" />
          Low suspicion
        </span>
      </div>
      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
        {parts.map((part, i) =>
          part.span ? (
            <span
              key={i}
              className={`rounded px-0.5 cursor-help transition-colors ${SEVERITY_CLASSES[part.span.severity]}`}
              title={part.span.reason}
            >
              {part.text}
            </span>
          ) : (
            <span key={i}>{part.text}</span>
          )
        )}
      </p>
    </div>
  );
}
