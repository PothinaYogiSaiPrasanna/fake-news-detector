import type { Verdict } from '../../engine/types';

interface VerdictBadgeProps {
  verdict: Verdict;
}

const CONFIG: Record<Verdict, { label: string; color: string; bg: string; icon: string }> = {
  real: {
    label: 'Likely Real',
    color: 'text-green-800',
    bg: 'bg-green-100',
    icon: '✅',
  },
  likely_real: {
    label: 'Likely Real',
    color: 'text-green-700',
    bg: 'bg-green-50',
    icon: '✅',
  },
  uncertain: {
    label: 'Uncertain',
    color: 'text-amber-800',
    bg: 'bg-amber-100',
    icon: '⚠️',
  },
  likely_fake: {
    label: 'Likely Fake',
    color: 'text-orange-800',
    bg: 'bg-orange-100',
    icon: '🚨',
  },
  fake: {
    label: 'Likely Fake',
    color: 'text-red-800',
    bg: 'bg-red-100',
    icon: '🚨',
  },
};

export function VerdictBadge({ verdict }: VerdictBadgeProps) {
  const c = CONFIG[verdict];
  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${c.bg} ${c.color}`}>
      <span>{c.icon}</span>
      <span>{c.label}</span>
    </div>
  );
}
