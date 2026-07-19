import type { Verdict } from '../../engine/types';

interface VerdictBadgeProps {
  verdict: Verdict;
}

const CONFIG: Record<Verdict, { label: string; classes: string; icon: string }> = {
  real: { label: 'Likely Real', classes: 'bg-green-100 text-green-800 border-green-300', icon: '✓' },
  likely_real: { label: 'Likely Real', classes: 'bg-green-100 text-green-800 border-green-300', icon: '✓' },
  uncertain: { label: 'Uncertain', classes: 'bg-amber-100 text-amber-800 border-amber-300', icon: '?' },
  likely_fake: { label: 'Likely Fake', classes: 'bg-red-100 text-red-800 border-red-300', icon: '✗' },
  fake: { label: 'Likely Fake', classes: 'bg-red-100 text-red-800 border-red-300', icon: '✗' },
};

export function VerdictBadge({ verdict }: VerdictBadgeProps) {
  const config = CONFIG[verdict] || CONFIG.uncertain;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${config.classes}`}>
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}
