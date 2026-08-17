import { useState, useEffect } from 'react';

/**
 * Simple hook for transient feedback messages (success / info).
 * Auto-clears after `duration` ms. Keeps UI dependency-free.
 */
export default function useFlashMessage(defaultDuration = 3500) {
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!message) return undefined;
    const id = setTimeout(() => setMessage(null), defaultDuration);
    return () => clearTimeout(id);
  }, [message, defaultDuration]);

  return {
    message,
    show: (text) => setMessage(text),
    clear: () => setMessage(null),
  };
}
