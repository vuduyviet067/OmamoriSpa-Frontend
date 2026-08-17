import { forwardRef } from 'react';
import clsx from 'clsx';

const Input = forwardRef(({
  label,
  error,
  helper,
  type = 'text',
  className,
  containerClassName,
  ...props
}, ref) => {
  const inputId = props.id || props.name;

  return (
    <div className={clsx('input-group', containerClassName)}>
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        type={type}
        className={clsx('input', error && 'input-error', className)}
        {...props}
      />
      {helper && !error && (
        <span className="input-helper">{helper}</span>
      )}
      {error && (
        <span className="input-error-message">{error}</span>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
