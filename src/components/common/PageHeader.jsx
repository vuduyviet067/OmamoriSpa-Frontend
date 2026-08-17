function PageHeader({
  title,
  description,
  actions,
  className,
}) {
  return (
    <div className={`page-header ${className || ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-header-title">{title}</h1>
          {description && (
            <p className="page-header-description">{description}</p>
          )}
        </div>
        {actions && (
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

export default PageHeader;
