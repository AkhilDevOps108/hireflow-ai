type StatusBadgeProps = {
  value: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
};

export function StatusBadge({ value, tone = 'neutral' }: StatusBadgeProps) {
  return <span className={`status-badge ${tone}`}>{value}</span>;
}
