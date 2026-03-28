import { formatUsdFromMicros } from '../utils';

interface BudgetCardProps {
  spentMicros: number;
  capMicros: number;
  title?: string;
}

export default function BudgetCard({ spentMicros, capMicros, title = 'Current Month Budget' }: BudgetCardProps) {
  const remainingMicros = Math.max(0, capMicros - spentMicros);
  const usagePct = Math.min(100, capMicros > 0 ? (spentMicros / capMicros) * 100 : 0);

  return (
    <div className="w-full rounded-md bg-zinc-600 px-4 py-3 shadow-md">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-lg text-white">{title}</h3>
          <p className="text-sm text-zinc-300">
            {formatUsdFromMicros(spentMicros)} spent of {formatUsdFromMicros(capMicros)} cap
          </p>
        </div>
        <div className="text-right text-sm text-zinc-300">
          <div>{formatUsdFromMicros(remainingMicros)} remaining</div>
          <div>{usagePct.toFixed(0)}% used</div>
        </div>
      </div>
      <div className="mt-3 h-2 w-full rounded-full bg-zinc-800">
        <div className="h-2 rounded-full bg-teal-500 transition-all" style={{ width: `${usagePct}%` }} />
      </div>
    </div>
  );
}
