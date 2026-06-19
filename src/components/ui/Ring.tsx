import { useEffect, useRef } from 'react';

interface RingProps {
  value: number; // 0–1
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label: string;
  centerText: string;
  subText?: string;
  animate?: boolean;
}

export function Ring({
  value,
  size = 140,
  strokeWidth = 12,
  color = '#00E5FF',
  trackColor = '#1C1C21',
  label,
  centerText,
  subText,
  animate = true,
}: RingProps) {
  const clampedValue = Math.max(0, Math.min(1, value));
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - clampedValue);
  const circleRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (!animate || !circleRef.current) return;
    const el = circleRef.current;
    el.style.strokeDashoffset = `${circumference}`;
    el.style.transition = 'none';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)';
        el.style.strokeDashoffset = `${offset}`;
      });
    });
  }, [value, circumference, offset, animate]);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
          {/* Fill */}
          <circle
            ref={circleRef}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={animate ? circumference : offset}
            style={{ filter: `drop-shadow(0 0 6px ${color}60)` }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-black tracking-tighter-nums text-primary" style={{ fontSize: size * 0.18 }}>
            {centerText}
          </span>
          {subText && (
            <span className="text-muted uppercase tracking-widest" style={{ fontSize: size * 0.08 }}>
              {subText}
            </span>
          )}
        </div>
      </div>
      <span className="text-xs uppercase tracking-widest text-muted font-medium">{label}</span>
    </div>
  );
}
