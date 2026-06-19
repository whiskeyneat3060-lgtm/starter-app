type Status = 'AHEAD' | 'ON_TRACK' | 'BEHIND' | 'INSUFFICIENT_DATA';

const config: Record<Status, { label: string; bg: string; text: string }> = {
  AHEAD:             { label: 'AHEAD',    bg: 'bg-green/20',  text: 'text-green' },
  ON_TRACK:          { label: 'ON TRACK', bg: 'bg-energy/15', text: 'text-energy' },
  BEHIND:            { label: 'BEHIND',   bg: 'bg-danger/20', text: 'text-danger' },
  INSUFFICIENT_DATA: { label: 'NO DATA',  bg: 'bg-dim/30',    text: 'text-muted' },
};

export function StatusPill({ status }: { status: Status }) {
  const { label, bg, text } = config[status];
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest ${bg} ${text}`}>
      {label}
    </span>
  );
}
