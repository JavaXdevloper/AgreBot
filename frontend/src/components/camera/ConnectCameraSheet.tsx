import React, { useState } from 'react';
import { Camera, X, AlertCircle, Check, Loader2 } from 'lucide-react';
import { validateCameraUrl } from '../../lib/validation';
import { apiFetch } from '../../lib/api/client';
import { ENDPOINTS } from '../../lib/api/endpoints';
import { createMockClient } from '../../lib/api/mock';
import type { CameraState, ComponentError, RoverControl } from '../../lib/api/types';
import { STRINGS } from '../../lib/strings';

const IS_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const mockClient = IS_MOCK ? createMockClient() : null;
const STORAGE_KEY = 'agri_rover_last_camera_url';

export interface ConnectCameraSheetProps {
  isOpen: boolean;
  onClose: () => void;
  cameraState: CameraState;
  roverControl: RoverControl;
  isUnlocked: boolean;
  onUnlockRequest: () => void;
  onSuccess?: () => void;
  error?: ComponentError | null;
}

export function ConnectCameraSheet({
  isOpen,
  onClose,
  cameraState,
  isUnlocked,
  onUnlockRequest,
  onSuccess,
  error,
}: ConnectCameraSheetProps) {
  const [streamUrl, setStreamUrl] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  const [validationError, setValidationError] = useState<string | null>(null);
  const [inFlight, setInFlight] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isConnecting = cameraState === 'connecting';

  const handleConnect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setValidationError(null);
    setActionError(null);

    const trimmedUrl = streamUrl.trim();
    const val = validateCameraUrl(trimmedUrl);
    if (!val.valid) {
      setValidationError(val.error);
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, trimmedUrl);
    } catch {
      // Ignore storage errors
    }

    setInFlight(true);
    try {
      if (IS_MOCK && mockClient) {
        await mockClient.connectCamera(trimmedUrl);
      } else {
        await apiFetch<{ ok: boolean }>(ENDPOINTS.CAMERA_CONNECT, {
          method: 'POST',
          body: JSON.stringify({ stream_url: trimmedUrl }),
          timeoutMs: 8000,
        });
      }
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setInFlight(false);
    }
  };

  const handleUseSample = (url: string) => {
    setStreamUrl(url);
    setValidationError(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-surface-1 border border-border rounded-card p-6 shadow-modal space-y-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-input bg-brand/10 border border-brand/20 text-brand">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text">{STRINGS.camera.connectButton}</h2>
              <p className="text-xs text-text-muted">Connect your smartphone or USB webcam</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-input text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Locked gate */}
        {!isUnlocked ? (
          <div className="p-5 rounded-input bg-surface-2 border border-border text-center space-y-3">
            <AlertCircle className="w-6 h-6 text-warn mx-auto" />
            <div>
              <h3 className="text-sm font-semibold text-text">{STRINGS.auth.unlockTitle}</h3>
              <p className="text-xs text-text-muted mt-1">
                You must unlock controls before connecting or changing the camera stream.
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                onUnlockRequest();
              }}
              className="px-4 py-2 bg-brand text-brand-foreground font-semibold text-xs rounded-input hover:opacity-90 transition-opacity"
            >
              {STRINGS.auth.unlockButton}
            </button>
          </div>
        ) : (
          <form onSubmit={handleConnect} className="space-y-5">
            {/* Steps list */}
            <div className="p-4 rounded-input bg-surface-2 border border-border space-y-2 text-xs text-text-muted">
              <span className="font-semibold text-text block">How to connect with a phone:</span>
              <ol className="list-decimal list-inside space-y-1">
                <li>Install the free <strong>IP Webcam</strong> app on Android.</li>
                <li>Tap <strong>Start server</strong> at the bottom of the app.</li>
                <li>Type the address it displays below (e.g. <code>http://192.168.1.45:8080/video</code>).</li>
              </ol>
            </div>

            {/* URL Input */}
            <div className="space-y-1.5">
              <label htmlFor="stream-url-input" className="block text-xs font-semibold text-text">
                Camera Stream URL or Device Index
              </label>
              <input
                id="stream-url-input"
                type="text"
                value={streamUrl}
                onChange={(e) => {
                  setStreamUrl(e.target.value);
                  setValidationError(null);
                  setActionError(null);
                }}
                placeholder="http://192.168.1.45:8080/video (or '0' for laptop camera)"
                className="w-full px-3.5 h-11 bg-surface-2 border border-border rounded-input text-sm text-text placeholder-text-muted focus:border-brand focus:ring-1 focus:ring-brand outline-none"
              />
              {validationError && (
                <p className="text-xs text-danger flex items-center gap-1.5 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{validationError}</span>
                </p>
              )}
              {actionError && (
                <p className="text-xs text-danger flex items-center gap-1.5 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{actionError}</span>
                </p>
              )}
              {error && (
                <p className="text-xs text-danger flex items-center gap-1.5 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{error.message}</span>
                </p>
              )}
            </div>

            {/* Quick shortcuts */}
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="text-text-muted self-center">Quick inputs:</span>
              <button
                type="button"
                onClick={() => handleUseSample('0')}
                className="px-2.5 py-1 rounded-pill bg-surface-2 hover:bg-surface-1 border border-border text-text transition-colors"
              >
                0 (Laptop webcam)
              </button>
              <button
                type="button"
                onClick={() => handleUseSample('http://192.168.43.1:8080/video')}
                className="px-2.5 py-1 rounded-pill bg-surface-2 hover:bg-surface-1 border border-border text-text transition-colors"
              >
                Hotspot sample
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-input bg-surface-2 hover:bg-surface-1 border border-border text-xs font-semibold text-text transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={inFlight || isConnecting}
                className="px-5 py-2.5 rounded-input bg-brand text-brand-foreground hover:opacity-90 font-semibold text-xs transition-opacity disabled:opacity-50 flex items-center gap-2 shadow-sm"
              >
                {inFlight || isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connecting…</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Connect</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
