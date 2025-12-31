/**
 * Tab Visibility Polling Hook
 *
 * Automatically pauses polling when tab becomes inactive and resumes when active.
 * Reduces unnecessary API calls and server load.
 *
 * Usage:
 *   useTabVisibilityPolling(async () => {
 *     await loadData();
 *   }, 30000, [dependencies]);
 */

import { useEffect, useRef } from 'react';

export interface TabVisibilityPollingOptions {
  /**
   * Enable/disable polling (useful for conditional polling)
   */
  enabled?: boolean;

  /**
   * Run immediately on mount (before first interval)
   */
  immediate?: boolean;

  /**
   * Run when tab becomes visible again
   */
  runOnVisible?: boolean;
}

/**
 * Hook that polls a function at regular intervals, pausing when tab is inactive
 *
 * @param pollFunction - Async function to call on each interval
 * @param intervalMs - Interval in milliseconds
 * @param dependencies - Dependencies array (like useEffect)
 * @param options - Additional options
 */
export function useTabVisibilityPolling(
  pollFunction: () => Promise<void> | void,
  intervalMs: number,
  dependencies: any[] = [],
  options: TabVisibilityPollingOptions = {}
) {
  const {
    enabled = true,
    immediate = false,
    runOnVisible = true
  } = options;

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      // Clear interval if disabled
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Run immediately if requested
    if (immediate) {
      pollFunction();
    }

    // Set up polling interval
    const startPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      intervalRef.current = setInterval(() => {
        // Only poll if tab is visible
        if (document.visibilityState === 'visible') {
          pollFunction();
        } else {
          console.log('[TabVisibilityPolling] Skipping poll - tab inactive');
        }
      }, intervalMs);

      isPollingRef.current = true;
    };

    // Handle visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[TabVisibilityPolling] Tab became active');

        // Run poll function immediately when tab becomes visible
        if (runOnVisible && isPollingRef.current) {
          pollFunction();
        }
      } else {
        console.log('[TabVisibilityPolling] Tab became inactive - polling paused');
      }
    };

    // Start polling
    startPolling();

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      isPollingRef.current = false;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, enabled, immediate, runOnVisible, ...dependencies]);
}

/**
 * Get current tab visibility state
 */
export function useTabVisibility() {
  const [isVisible, setIsVisible] = React.useState(
    typeof document !== 'undefined' ? document.visibilityState === 'visible' : true
  );

  React.useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
}

// Fix import for React
import * as React from 'react';
