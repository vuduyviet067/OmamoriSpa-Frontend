import { forwardRef } from 'react';
import clsx from 'clsx';

const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  type = 'button',
  className,
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={clsx(
        'btn',
        `btn-${variant}`,
        size === 'sm' && 'btn-sm',
        size === 'lg' && 'btn-lg',
        className
      )}
      {...props}
    >
      {loading && <span className="spinner" />}
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
