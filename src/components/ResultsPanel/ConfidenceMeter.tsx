import { useEffect, useState } from 'react';

interface ConfidenceMeterProps {
  score: number;
}

export function ConfidenceMeter({ score }: ConfidenceMeterProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const displayScore = animatedScore;
  const offset = circumference - (displayScore / 100) * circumference;

  const getColor = () => {
    if (score >= 80) return { stroke: '#16a34a', text: 'text-green-600' };
    if (score >= 60) return { stroke: '#22c55e', text: 'text-green-500' };
    if (score >= 40) return { stroke: '#f59e0b', text: 'text-amber-500' };
    if (score >= 20) return { stroke: '#f97316', text: 'text-orange-500' };
    return { stroke: '#dc2626', text: 'text-red-600' };
  };

  const colors = getColor();

  const getLabel = () => {
    if (score >= 80) return 'Highly Credible';
    if (score >= 60) return 'Mostly Credible';
    if (score >= 40) return 'Needs Verification';
    if (score >= 20) return 'Suspicious';
    return 'Highly Suspicious';
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width="180" height="180" className="-rotate-90">
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="10"
          />
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-4xl font-bold ${colors.text}`}>{Math.round(displayScore)}</span>
          <span className="text-sm text-gray-500">/ 100</span>
        </div>
      </div>
      <span className={`text-sm font-medium ${colors.text}`}>{getLabel()}</span>
    </div>
  );
}
