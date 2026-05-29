interface DashboardMetric {
  label: string;
  value: string;
}

interface DashboardModulePlaceholderProps {
  eyebrow: string;
  title: string;
  description: string;
  metrics?: DashboardMetric[];
  children?: React.ReactNode;
}

export function DashboardModulePlaceholder({
  eyebrow,
  title,
  description,
  metrics = [],
  children,
}: DashboardModulePlaceholderProps) {
  return (
    <section className="dashboard-module-placeholder">
      <div className="dashboard-page-header">
        <p className="dashboard-kicker">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>

      {metrics.length > 0 ? (
        <div className="dashboard-grid" aria-label={`${title} summary`}>
          {metrics.map((metric) => (
            <article className="dashboard-module-card" key={metric.label}>
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
            </article>
          ))}
        </div>
      ) : null}

      {children}
    </section>
  );
}
