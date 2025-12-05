import { useEffect, useRef } from 'react';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:5174';

/**
 * Hook to track app access. Sends a single tracking event when the app is mounted.
 * @param appId - The unique identifier for the app (e.g., 'vct-builder')
 * @param appName - The display name of the app (e.g., 'VCT Builder')
 */
export function useAppTracking(appId: string, appName: string) {
  const hasTracked = useRef(false);

  useEffect(() => {
    // Only track once per mount
    if (hasTracked.current) return;
    hasTracked.current = true;

    // Fire and forget - don't block on tracking
    fetch(`${API_BASE}/api/track-app-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ appId, appName }),
    }).catch((error) => {
      // Silently fail - tracking should not affect user experience
      console.error('Failed to track app access:', error);
    });
  }, [appId, appName]);
}
