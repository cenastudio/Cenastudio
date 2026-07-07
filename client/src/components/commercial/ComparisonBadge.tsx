import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ComparisonBadgeProps {
  change: string;
  isPositive: boolean;
  label?: string;
}

export function ComparisonBadge({ change, isPositive, label }: ComparisonBadgeProps) {
  const { t } = useLanguage();
  const changeNum = parseFloat(change);
  const isNeutral = changeNum === 0;
  const displayLabel = label ?? t('app.commercial.vsPrevMonth');

  return (
    <div className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${
      isNeutral
        ? 'bg-frame-gray-3 text-frame-gray-light'
        : isPositive
        ? 'bg-green-500/20 text-green-500'
        : 'bg-red-500/20 text-red-500'
    }`}>
      {isNeutral ? (
        <Minus size={12} />
      ) : isPositive ? (
        <TrendingUp size={12} />
      ) : (
        <TrendingDown size={12} />
      )}
      <span>
        {changeNum > 0 ? '+' : ''}{change}%
      </span>
      <span className="text-[10px] opacity-70">{displayLabel}</span>
    </div>
  );
}
