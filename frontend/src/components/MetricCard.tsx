type MetricCardProps = {
  label: string;
  value: string | number;
  tone?: 'default' | 'success' | 'warning';
};

export function MetricCard({ label, value, tone = 'default' }: MetricCardProps) {
  return (
    <div className={`metric-card ${tone}`}>
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{value}</strong>
    </div>
  );
}
