import { ApiError } from './errors';
import type { ApiErrorBody } from './types';

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
}

/**
 * Robust fetch wrapper handling timeouts, credentials, signal merging, and API error envelope parsing.
 */
export async function apiFetch<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { timeoutMs = 8000, signal, ...customConfig } = options;

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | null = null;

  if (timeoutMs > 0) {
    timer = setTimeout(() => {
      controller.abort(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  }

  // Handle external abort signal
  const onExternalAbort = () => {
    controller.abort(signal?.reason);
  };

  if (signal) {
    if (signal.aborted) {
      if (timer) clearTimeout(timer);
      throw signal.reason || new Error('Request aborted');
    }
    signal.addEventListener('abort', onExternalAbort);
  }

  try {
    const config: RequestInit = {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(customConfig.body ? { 'Content-Type': 'application/json' } : {}),
        ...customConfig.headers,
      },
      ...customConfig,
      signal: controller.signal,
    };

    let response: Response;
    try {
      response = await fetch(url, config);
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        if (signal?.aborted) {
          throw signal.reason || new Error('Request aborted');
        }
        throw new ApiError(0, { code: 'TIMEOUT', message: `Request timed out after ${timeoutMs}ms` });
      }
      const message = err instanceof Error ? err.message : 'Network error';
      throw new ApiError(0, { code: 'NETWORK_ERROR', message });
    }

    // Try parsing JSON response
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    let bodyData: unknown = null;
    if (isJson) {
      try {
        bodyData = await response.json();
      } catch {
        throw new ApiError(response.status, {
          code: 'INVALID_JSON',
          message: 'Received invalid JSON from server',
        });
      }
    } else {
      const text = await response.text();
      bodyData = text;
    }

    if (!response.ok) {
      if (bodyData && typeof bodyData === 'object' && 'error' in bodyData) {
        const errPayload = bodyData as ApiErrorBody;
        throw new ApiError(response.status, errPayload.error);
      }
      throw new ApiError(response.status, {
        code: `HTTP_${response.status}`,
        message: typeof bodyData === 'string' && bodyData ? bodyData : response.statusText,
      });
    }

    return bodyData as T;
  } finally {
    if (timer) clearTimeout(timer);
    if (signal) {
      signal.removeEventListener('abort', onExternalAbort);
    }
  }
}
