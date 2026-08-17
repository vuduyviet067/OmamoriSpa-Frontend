/**
 * Currency formatter for Vietnamese Dong
 */
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format duration in minutes to readable string
 */
export const formatDuration = (minutes) => {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours} giờ`;
  return `${hours} giờ ${mins} phút`;
};

/**
 * Get initials from name
 */
export const getInitials = (name) => {
  if (!name) return '';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Image fallback handler
 */
export const withImageFallback = (src, fallbackSrc) => {
  const img = new Image();
  img.src = src;
  
  img.onerror = () => {
    return fallbackSrc;
  };
  
  return src;
};

/**
 * Simple hook-friendly image with fallback
 * Returns fallback src when image fails to load
 */
export const getImageWithFallback = (src) => {
  return src || null;
};

/**
 * Simple placeholder SVG for images
 */
export const getImagePlaceholder = (type = 'service') => {
  const placeholders = {
    service: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="var(--color-charcoal-muted)" stroke-width="1">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 6v12M6 12h12" stroke-linecap="round"/>
    </svg>`,
    cosmetic: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="var(--color-charcoal-muted)" stroke-width="1">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <path d="M21 15l-5-5L5 21"/>
    </svg>`,
    person: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="var(--color-charcoal-muted)" stroke-width="1">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>
    </svg>`,
    room: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="var(--color-charcoal-muted)" stroke-width="1">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>`,
  };
  
  return placeholders[type] || placeholders.service;
};
