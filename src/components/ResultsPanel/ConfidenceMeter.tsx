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

  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;

  const getColor = () => {
    if (score >= 80) return { stroke: '#22c55e', text: '#16a34a', bg: '#f0fdf4' };
    if (score >= 60) return { stroke: '#84cc16', text: '#4d7c0f', bg: '#f7fee7' };
    if (score >= 40) return { stroke: '#facc15', text: '#a16207', bg: '#fefce8' };
    if (score >= 20) return { stroke: '#fb923c', text: '#c2410c', bg: '#fff7ed' };
    return { stroke: '#ef4444', text: '#dc2626', bg: '#fef2f2' };
  };

  const colors = getColor();
  const label = score >= 80 ? 'High' : score >= 60 ? 'Good' : score >= 40 ? 'Mixed' : score >= 20 ? 'Low' : 'Very Low';

  return (
    <div className="flex-shrink-0">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 70 70)"
          className="transition-all duration-1000 ease-out"
        />
        <text x="70" y="62" textAnchor="middle" className="text-2xl font-bold" fill={colors.text}>
          {Math.round(animatedScore)}
        </text>
        <text x="70" y="80" textAnchor="middle" className="text-xs" fill={colors.text}>
          {label}
        </text>
      </svg>
    </div>
  );
}
