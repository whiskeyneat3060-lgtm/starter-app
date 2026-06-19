interface MacroBarProps {
  label: string;
  current: number;
  target: number;
  color: string;
  unit?: string;
}

export function MacroBar({ label, current, target, color, unit = 'g' }: MacroBarProps) {
  const pct = Math.min(1, target > 0 ? current / target : 0);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted uppercase tracking-wider font-medium">{label}</span>
        <span className="text-primary font-semibold tracking-tighter-nums">
          {Math.round(current)}<span className="text-muted text-[10px]">/{Math.round(target)}{unit}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-elevated overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct * 100}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
