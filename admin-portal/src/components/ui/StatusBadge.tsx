interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const statusStyles: Record<string, string> = {
  active: 'badge-success',
  completed: 'badge-success',
  within_sla: 'badge-success',
  deployed: 'badge-success',
  in_use: 'badge-success',
  dispatched: 'badge-info',
  en_route: 'badge-info',
  on_site: 'badge-info',
  pending: 'badge-neutral',
  scheduled: 'badge-info',
  in_progress: 'badge-warning',
  planned: 'badge-info',
  idle: 'badge-neutral',
  maintenance: 'badge-warning',
  high_volume: 'badge-warning',
  warning: 'badge-warning',
  overdue: 'badge-danger',
  failed: 'badge-danger',
  cancelled: 'badge-danger',
  out_of_service: 'badge-danger',
};

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const style = statusStyles[status] || 'badge-neutral';
  return (
    <span className={`${style} ${size === 'sm' ? 'text-[10px] px-2 py-0.5' : ''}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
