import { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '../lib/api/client';
import { ENDPOINTS } from '../lib/api/endpoints';
import { createMockClient } from '../lib/api/mock';
import type { SystemStatus } from '../lib/api/types';

const IS_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const mockClient = IS_MOCK ? createMockClient() : null;

export interface UseSystemStatusResult {
  status: SystemStatus | null;
  isOffline: boolean;
  lastUpdated: string | null;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Polls /api/status every 2.5s.
 * Maintains single-flight constraint: skips tick if previous is still in flight.
 * Tracks consecutive failures: on 3 consecutive failures -> isOffline = true, while keeping last known status.
 */
export function useSystemStatus(intervalMs = 2500): UseSystemStatusResult {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const inFlightRef = useRef(false);
  const failureCountRef = useRef(0);
  const mountedRef = useRef(true);

  const fetchStatus = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      let data: SystemStatus;
      if (IS_MOCK && mockClient) {
        data = await mockClient.getStatus();
      } else {
        data = await apiFetch<SystemStatus>(ENDPOINTS.STATUS, { timeoutMs: 4000 });
      }

      if (!mountedRef.current) return;
      failureCountRef.current = 0;
      setStatus(data);
      setIsOffline(false);
      setLastUpdated(new Date().toISOString());
      setError(null);
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      failureCountRef.current += 1;
      const parsedError = err instanceof Error ? err : new Error(String(err));
      setError(parsedError);

      if (failureCountRef.current >= 3) {
        setIsOffline(true);
      }
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    mountedRef.current = true;

    const run = async () => {
      if (!ignore) {
        await fetchStatus();
      }
    };
    void run();

    const timer = setInterval(() => {
      if (!ignore) {
        void fetchStatus();
      }
    }, intervalMs);

    return () => {
      ignore = true;
      mountedRef.current = false;
      clearInterval(timer);
    };
  }, [fetchStatus, intervalMs]);

  return {
    status,
    isOffline,
    lastUpdated,
    error,
    refresh: fetchStatus,
  };
}
