import { forwardRef } from 'react';
import clsx from 'clsx';

const Select = forwardRef(({
  label,
  error,
  helper,
  options = [],
  placeholder = 'Chọn...',
  className,
  containerClassName,
  ...props
}, ref) => {
  const selectId = props.id || props.name;

  return (
    <div className={clsx('input-group', containerClassName)}>
      {label && (
        <label htmlFor={selectId} className="input-label">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={clsx('input', 'select', error && 'input-error', className)}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helper && !error && (
        <span className="input-helper">{helper}</span>
      )}
      {error && (
        <span className="input-error-message">{error}</span>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
