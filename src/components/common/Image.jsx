import { useState } from 'react';
import { getImagePlaceholder } from '@/utils/formatters';

/**
 * Image component with automatic fallback on error
 */
function Image({ src, alt, type = 'service', className, style, ...props }) {
  const [hasError, setHasError] = useState(false);
  
  const handleError = () => {
    setHasError(true);
  };
  
  if (hasError || !src) {
    return (
      <div
        className={className}
        style={{
          backgroundColor: 'var(--color-green-pale)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style,
        }}
        dangerouslySetInnerHTML={{ __html: getImagePlaceholder(type) }}
        role="img"
        aria-label={alt || 'Placeholder'}
        {...props}
      />
    );
  }
  
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={handleError}
      {...props}
    />
  );
}

export default Image;
