/**
 * useAutoSave Hook
 *
 * Provides auto-save functionality for form editing.
 * Debounces changes and saves after a delay of inactivity.
 */

import { useEffect, useRef, useCallback, useState } from 'react';

interface UseAutoSaveOptions {
  /** Data to monitor for changes */
  data: unknown;
  /** Save function to call when auto-saving */
  onSave: () => Promise<void>;
  /** Delay in ms before auto-saving (default: 2000) */
  delay?: number;
  /** Whether auto-save is enabled (default: true) */
  enabled?: boolean;
  /** Whether there are unsaved changes */
  hasChanges: boolean;
}

interface UseAutoSaveReturn {
  /** Whether auto-save is currently in progress */
  isSaving: boolean;
  /** Last auto-save timestamp */
  lastSaved: Date | null;
  /** Error from last save attempt */
  error: string | null;
  /** Manually trigger a save */
  saveNow: () => Promise<void>;
}

export function useAutoSave({
  data,
  onSave,
  delay = 2000,
  enabled = true,
  hasChanges,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const lastDataRef = useRef<string>('');

  // Serialize data for comparison
  const dataString = JSON.stringify(data);

  // Save function
  const performSave = useCallback(async () => {
    if (!isMountedRef.current || isSaving) return;

    setIsSaving(true);
    setError(null);

    try {
      await onSave();
      if (isMountedRef.current) {
        setLastSaved(new Date());
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to save');
      }
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [onSave, isSaving]);

  // Handle data changes
  useEffect(() => {
    if (!enabled || !hasChanges) return;

    // Check if data actually changed
    if (dataString === lastDataRef.current) return;
    lastDataRef.current = dataString;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for auto-save
    timeoutRef.current = setTimeout(() => {
      performSave();
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [dataString, enabled, hasChanges, delay, performSave]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Manual save function
  const saveNow = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    await performSave();
  }, [performSave]);

  return {
    isSaving,
    lastSaved,
    error,
    saveNow,
  };
}
