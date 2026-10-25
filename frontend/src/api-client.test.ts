import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { apiFetch } from '../src/lib/api/client';
import { ApiError } from '../src/lib/api/errors';
import { useSystemStatus } from '../src/hooks/useSystemStatus';
import { useLatestDetection } from '../src/hooks/useLatestDetection';
import { useAuth } from '../src/hooks/useAuth';

describe('FE-2: apiFetch client wrapper', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('successfully parses json payload on 200 OK', async () => {
    const mockData = { status: 'ok' };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockData,
    } as Response);

    const res = await apiFetch('/api/health');
    expect(res).toEqual(mockData);
  });

  it('parses error envelope on non-2xx', async () => {
    const errorEnvelope = {
      error: {
        code: 'CAMERA_NOT_CONNECTED',
        message: 'No camera stream is connected.',
        details: null,
      },
    };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => errorEnvelope,
    } as Response);

    await expect(apiFetch('/api/video/stream')).rejects.toThrow(ApiError);
    try {
      await apiFetch('/api/video/stream');
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.code).toBe('CAMERA_NOT_CONNECTED');
      expect(apiErr.status).toBe(503);
      expect(apiErr.message).toBe('No camera stream is connected.');
    }
  });

  it('handles malformed JSON responses on 200 OK gracefully', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => {
        throw new Error('Unexpected token');
      },
    } as unknown as Response);

    await expect(apiFetch('/api/malformed')).rejects.toThrow('Received invalid JSON from server');
  });

  it('handles network error (fetch failure)', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(apiFetch('/api/status')).rejects.toThrow(ApiError);
    try {
      await apiFetch('/api/status');
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.code).toBe('NETWORK_ERROR');
    }
  });

  it('handles abort signal properly', async () => {
    const controller = new AbortController();
    globalThis.fetch = vi.fn().mockImplementation((_url, config) => {
      return new Promise((_, reject) => {
        config.signal?.addEventListener('abort', () => {
          reject(new DOMException('The user aborted a request.', 'AbortError'));
        });
      });
    });

    const promise = apiFetch('/api/status', { signal: controller.signal });
    controller.abort(new Error('User cancelled'));
    await expect(promise).rejects.toThrow();
  });

  it('times out when request exceeds timeoutMs', async () => {
    globalThis.fetch = vi.fn().mockImplementation((_url, config) => {
      return new Promise((_, reject) => {
        config.signal?.addEventListener('abort', () => {
          reject(new DOMException('The user aborted a request.', 'AbortError'));
        });
      });
    });

    await expect(apiFetch('/api/status', { timeoutMs: 50 })).rejects.toThrow(/timed out/i);
  });
});

describe('FE-2: useSystemStatus hook resilience', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv('VITE_USE_MOCK', 'false');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('transitions to isOffline = true after 3 consecutive failures', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Failed to reach server'));

    const { result } = renderHook(() => useSystemStatus(100));

    // Initially not offline
    expect(result.current.isOffline).toBe(false);

    // Trigger sequential refreshes to accumulate 3 failures
    await act(async () => {
      await result.current.refresh();
    });
    await act(async () => {
      await result.current.refresh();
    });
    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.isOffline).toBe(true);
    });
  });
});

describe('FE-2: useLatestDetection hook', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv('VITE_USE_MOCK', 'false');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('pauses polling when camera is disconnected', async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    const { result } = renderHook(() => useLatestDetection('disconnected', 100));

    expect(result.current.detection).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('polls when camera is connected', async () => {
    const mockDet = {
      detection: {
        id: 'det-1',
        session_id: null,
        detected_at: new Date().toISOString(),
        label: 'aphid',
        confidence: 0.94,
        class_id: 1,
        bbox: null,
        source_mode: 'live',
        persisted: true,
        age_seconds: 1.0,
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockDet,
    } as Response);

    const { result } = renderHook(() => useLatestDetection('connected', 500));

    await waitFor(() => {
      expect(result.current.detection?.label).toBe('aphid');
    });
  });
});

describe('FE-2: useAuth hook', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv('VITE_USE_MOCK', 'false');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('handles successful unlock and sets control ready', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ ok: true, control: 'ready' }),
    } as Response);

    const { result } = renderHook(() => useAuth());

    let unlockRes;
    await act(async () => {
      unlockRes = await result.current.unlock('1234');
    });

    expect(unlockRes).toEqual({ ok: true, control: 'ready' });
    expect(result.current.error).toBeNull();
  });

  it('captures unlock error on 401 INVALID_PIN', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ error: { code: 'INVALID_PIN', message: 'Incorrect PIN entered.' } }),
    } as Response);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      try {
        await result.current.unlock('wrong');
      } catch {
        // caught by test
      }
    });

    expect(result.current.error).toBeDefined();
    expect((result.current.error as ApiError).code).toBe('INVALID_PIN');
  });
});
