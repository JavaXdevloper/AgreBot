import { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '../lib/api/client';
import { ENDPOINTS } from '../lib/api/endpoints';
import { createMockClient } from '../lib/api/mock';
import type { LatestDetection, CameraState } from '../lib/api/types';

const IS_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const mockClient = IS_MOCK ? createMockClient() : null;

export interface UseLatestDetectionResult {
  detection: LatestDetection | null;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Polls /api/detections/latest every 1.5s.
 * Pauses when camera is not connected or stale.
 * Maintains single-flight execution.
 */
export function useLatestDetection(
  cameraState: CameraState | undefined,
  intervalMs = 1500
): UseLatestDetectionResult {
  const [detection, setDetection] = useState<LatestDetection | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);

  const isCameraActive = cameraState === 'connected' || cameraState === 'stale';

  const fetchLatest = useCallback(async () => {
    if (!isCameraActive || inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      let data: { detection: LatestDetection | null };
      if (IS_MOCK && mockClient) {
        data = await mockClient.getLatestDetection();
      } else {
        data = await apiFetch<{ detection: LatestDetection | null }>(
          ENDPOINTS.DETECTIONS_LATEST,
          { timeoutMs: 3000 }
        );
      }

      if (!mountedRef.current) return;
      setDetection(data.detection);
      setError(null);
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      inFlightRef.current = false;
    }
  }, [isCameraActive]);

  useEffect(() => {
    let ignore = false;
    mountedRef.current = true;

    const run = async () => {
      if (!isCameraActive) {
        if (!ignore) {
          setDetection((prev) => (prev !== null ? null : prev));
        }
        return;
      }
      if (!ignore) {
        await fetchLatest();
      }
    };
    void run();

    const timer = setInterval(() => {
      if (!ignore && isCameraActive) {
        void fetchLatest();
      }
    }, intervalMs);

    return () => {
      ignore = true;
      mountedRef.current = false;
      clearInterval(timer);
    };
  }, [isCameraActive, fetchLatest, intervalMs]);

  return {
    detection,
    error,
    refresh: fetchLatest,
  };
}
