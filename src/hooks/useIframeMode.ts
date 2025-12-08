import { useState, useEffect } from 'react';

/**
 * Hook to detect if the app is running inside an iframe.
 * Useful for adjusting UI when embedded in external websites.
 *
 * @returns {boolean} true if running in an iframe, false otherwise
 */
export function useIframeMode(): boolean {
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    // Check if window is inside an iframe
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      // If we can't access window.top due to cross-origin restrictions,
      // we're definitely in an iframe
      setIsInIframe(true);
    }
  }, []);

  return isInIframe;
}

/**
 * Check if running in iframe (non-hook version for use outside components)
 */
export function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}
