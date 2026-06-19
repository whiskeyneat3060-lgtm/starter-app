import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';

interface SparkLineProps {
  data: Array<{ value: number }>;
  color?: string;
  height?: number;
}

export function SparkLine({ data, color = '#00E5FF', height = 40 }: SparkLineProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
        <Tooltip
          contentStyle={{ background: '#141417', border: 'none', borderRadius: 8, fontSize: 11 }}
          itemStyle={{ color }}
          labelStyle={{ display: 'none' }}
          formatter={(v: number) => [Math.round(v), '']}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
