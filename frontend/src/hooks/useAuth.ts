import { useState, useCallback } from 'react';
import { apiFetch } from '../lib/api/client';
import { ENDPOINTS } from '../lib/api/endpoints';
import { createMockClient } from '../lib/api/mock';
import type { RoverControl } from '../lib/api/types';

const IS_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const mockClient = IS_MOCK ? createMockClient() : null;

export interface UseAuthResult {
  isSubmitting: boolean;
  error: Error | null;
  unlock: (pin: string) => Promise<{ ok: boolean; control: RoverControl }>;
  lock: () => Promise<{ ok: boolean; control: RoverControl }>;
  clearError: () => void;
}

export function useAuth(): UseAuthResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const unlock = useCallback(async (pin: string) => {
    setIsSubmitting(true);
    setError(null);
    try {
      let res: { ok: boolean; control: RoverControl };
      if (IS_MOCK && mockClient) {
        res = await mockClient.unlock(pin);
      } else {
        res = await apiFetch<{ ok: boolean; control: RoverControl }>(ENDPOINTS.AUTH_UNLOCK, {
          method: 'POST',
          body: JSON.stringify({ pin }),
          timeoutMs: 4000,
        });
      }
      return res;
    } catch (err: unknown) {
      const parsedError = err instanceof Error ? err : new Error(String(err));
      setError(parsedError);
      throw parsedError;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const lock = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      let res: { ok: boolean; control: RoverControl };
      if (IS_MOCK && mockClient) {
        res = await mockClient.lock();
      } else {
        res = await apiFetch<{ ok: boolean; control: RoverControl }>(ENDPOINTS.AUTH_LOCK, {
          method: 'POST',
          timeoutMs: 4000,
        });
      }
      return res;
    } catch (err: unknown) {
      const parsedError = err instanceof Error ? err : new Error(String(err));
      setError(parsedError);
      throw parsedError;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isSubmitting,
    error,
    unlock,
    lock,
    clearError,
  };
}
