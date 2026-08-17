import clsx from 'clsx';

const statusVariants = {
  success: 'badge-success',
  warning: 'badge-warning',
  error: 'badge-error',
  info: 'badge-info',
  neutral: 'badge-neutral',
};

function StatusBadge({
  status,
  variant,
  children,
  className,
}) {
  const badgeVariant = variant || statusVariants[status] || 'badge-neutral';

  return (
    <span className={clsx('badge', badgeVariant, className)}>
      {children}
    </span>
  );
}

export default StatusBadge;
