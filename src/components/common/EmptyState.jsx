function EmptyState({
  icon,
  title,
  description,
  action,
}) {
  return (
    <div className="empty-state">
      {icon && (
        <div className="empty-state-icon">
          {icon}
        </div>
      )}
      <h3 className="empty-state-title">{title}</h3>
      {description && (
        <p className="empty-state-description">{description}</p>
      )}
      {action && (
        <div style={{ marginTop: 'var(--space-6)' }}>
          {action}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
