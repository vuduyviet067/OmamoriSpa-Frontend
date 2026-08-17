import Button from './Button';

function ErrorState({
  title = 'Đã xảy ra lỗi',
  message = 'Vui lòng thử lại sau.',
  onRetry,
}) {
  return (
    <div className="error-state">
      <svg
        className="empty-state-icon"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        style={{ color: 'var(--color-error)' }}
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
      <h3 className="error-state-title">{title}</h3>
      <p className="empty-state-description">{message}</p>
      {onRetry && (
        <div style={{ marginTop: 'var(--space-6)' }}>
          <Button onClick={onRetry}>Thử lại</Button>
        </div>
      )}
    </div>
  );
}

export default ErrorState;
