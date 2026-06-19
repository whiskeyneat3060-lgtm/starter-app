export function SkeletonCard({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-2xl ${className}`} />;
}

export function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-full ${className}`} />;
}
