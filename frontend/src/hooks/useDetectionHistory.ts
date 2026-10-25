import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../lib/api/client';
import { ENDPOINTS } from '../lib/api/endpoints';
import { createMockClient } from '../lib/api/mock';
import type { Detection, Page, Mode } from '../lib/api/types';

const IS_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const mockClient = IS_MOCK ? createMockClient() : null;

export interface DetectionFilters {
  startDate: string;
  endDate: string;
  label: string;
  mode: Mode | '';
  limit: number;
  offset: number;
}

export function useDetectionHistory(initialFilters?: Partial<DetectionFilters>) {
  const [filters, setFilters] = useState<DetectionFilters>({
    startDate: initialFilters?.startDate || '',
    endDate: initialFilters?.endDate || '',
    label: initialFilters?.label || '',
    mode: initialFilters?.mode || '',
    limit: initialFilters?.limit || 25,
    offset: initialFilters?.offset || 0,
  });

  const [data, setData] = useState<Page<Detection>>({
    items: [],
    total: 0,
    limit: 25,
    offset: 0,
  });
  const [labels, setLabels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch distinct labels for filter dropdown
  const fetchLabels = useCallback(async () => {
    try {
      let res: { labels: string[] };
      if (IS_MOCK && mockClient) {
        res = await mockClient.getDetectionLabels();
      } else {
        res = await apiFetch<{ labels: string[] }>(ENDPOINTS.DETECTIONS_LABELS, {
          timeoutMs: 4000,
        });
      }
      setLabels(res.labels);
    } catch {
      // Ignore background labels fetch failure
    }
  }, []);

  // Fetch filtered detections
  const fetchDetections = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    const queryParams: Record<string, string> = {
      limit: String(filters.limit),
      offset: String(filters.offset),
    };
    if (filters.startDate) queryParams.start = new Date(filters.startDate).toISOString();
    if (filters.endDate) queryParams.end = new Date(filters.endDate).toISOString();
    if (filters.label) queryParams.label = filters.label;
    if (filters.mode) queryParams.mode = filters.mode;

    try {
      let result: Page<Detection>;
      if (IS_MOCK && mockClient) {
        result = await mockClient.getDetections(queryParams);
      } else {
        const urlParams = new URLSearchParams(queryParams).toString();
        result = await apiFetch<Page<Detection>>(`${ENDPOINTS.DETECTIONS}?${urlParams}`, {
          signal: controller.signal,
          timeoutMs: 8000,
        });
      }
      setData(result);
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [filters]);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      if (!ignore) {
        await fetchLabels();
      }
    };
    void run();
    return () => {
      ignore = true;
    };
  }, [fetchLabels]);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      if (!ignore) {
        await fetchDetections();
      }
    };
    void run();
    return () => {
      ignore = true;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchDetections]);

  return {
    filters,
    setFilters,
    data,
    labels,
    loading,
    error,
    refresh: fetchDetections,
  };
}
