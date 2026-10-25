import React, { useState, useEffect } from 'react';
import { Camera, RefreshCw, Power, PowerOff, AlertCircle } from 'lucide-react';
import { validateCameraUrl } from '../../lib/validation';
import { apiFetch } from '../../lib/api/client';
import { ENDPOINTS } from '../../lib/api/endpoints';
import { createMockClient } from '../../lib/api/mock';
import type { CameraState, ComponentError, RoverControl } from '../../lib/api/types';

const IS_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const mockClient = IS_MOCK ? createMockClient() : null;
const STORAGE_KEY = 'agri_rover_last_camera_url';

export interface CameraConnectionFormProps {
  cameraState: CameraState;
  roverControl: RoverControl;
  fps: number | null;
  lastFrameAt: string | null;
  error: ComponentError | null;
  isOffline: boolean;
  onRefreshStatus?: () => void;
}

export function CameraConnectionForm({
  cameraState,
  roverControl,
  fps,
  error,
  isOffline,
  onRefreshStatus,
}: CameraConnectionFormProps) {
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
  const [connectingTimer, setConnectingTimer] = useState<number>(0);

  const isUnlocked = roverControl === 'ready';
  const isConnected = cameraState === 'connected' || cameraState === 'stale';
  const isConnecting = cameraState === 'connecting';

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isConnecting) {
      timer = setInterval(() => {
        setConnectingTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      clearInterval(timer);
    };
  }, [isConnecting]);

  const handleConnect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setActionError(null);

    const validation = validateCameraUrl(streamUrl);
    if (!validation.valid) {
      setValidationError(validation.error);
      return;
    }
    setValidationError(null);

    if (!isUnlocked) {
      setActionError('Controls locked. Enter PIN to unlock before managing camera.');
      return;
    }

    setInFlight(true);
    try {
      try {
        localStorage.setItem(STORAGE_KEY, streamUrl.trim());
      } catch {
        // Ignored
      }

      if (IS_MOCK && mockClient) {
        await mockClient.connectCamera(streamUrl.trim());
      } else {
        await apiFetch(ENDPOINTS.CAMERA_CONNECT, {
          method: 'POST',
          body: JSON.stringify({ stream_url: streamUrl.trim() }),
          timeoutMs: 8000,
        });
      }
      onRefreshStatus?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to connect to camera stream');
    } finally {
      setInFlight(false);
    }
  };

  const handleDisconnect = async () => {
    if (!isUnlocked) {
      setActionError('Controls locked. Enter PIN to unlock before managing camera.');
      return;
    }

    setInFlight(true);
    setActionError(null);
    try {
      if (IS_MOCK && mockClient) {
        await mockClient.disconnectCamera();
      } else {
        await apiFetch(ENDPOINTS.CAMERA_DISCONNECT, {
          method: 'POST',
          timeoutMs: 8000,
        });
      }
      onRefreshStatus?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to disconnect camera');
    } finally {
      setInFlight(false);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold uppercase font-mono tracking-wider text-slate-100">
            Camera Link Setup
          </h2>
        </div>
        <div className="text-[11px] font-mono text-emerald-400/90 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded">
          {fps !== null ? `${fps.toFixed(1)} FPS` : 'STANDBY'}
        </div>
      </div>

      <form onSubmit={handleConnect} className="space-y-3">
        <div>
          <label htmlFor="camera-stream-url" className="block text-xs font-mono text-slate-400 mb-1">
            IP Webcam stream URL
          </label>
          <input
            id="camera-stream-url"
            type="text"
            value={streamUrl}
            onChange={(e) => {
              setStreamUrl(e.target.value);
              setValidationError(null);
              setActionError(null);
            }}
            placeholder="http://<phone-ip>:<port>/video"
            disabled={inFlight || isOffline}
            className="w-full text-xs font-mono px-3.5 py-2.5 bg-[#0d131f] border rounded-xl border-slate-700 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 disabled:opacity-40"
          />
          {validationError && (
            <p role="alert" className="text-xs text-rose-400 mt-1.5 flex items-center gap-1 font-mono">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {validationError}
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="submit"
            disabled={inFlight || isOffline || !isUnlocked || isConnected}
            className="min-h-[44px] flex-1 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-mono font-bold tracking-wider rounded-xl transition shadow-md disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Power className="w-4 h-4" />
            Connect
          </button>

          <button
            type="button"
            onClick={handleDisconnect}
            disabled={inFlight || isOffline || !isUnlocked || (!isConnected && !isConnecting)}
            className="min-h-[44px] px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 text-xs font-mono font-medium rounded-xl transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <PowerOff className="w-4 h-4" />
            Disconnect
          </button>

          <button
            type="button"
            onClick={() => void handleConnect()}
            disabled={inFlight || isOffline || !isUnlocked || (!isConnected && !isConnecting)}
            className="min-h-[44px] px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 text-xs font-mono font-medium rounded-xl transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
            title="Reconnect stream"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${inFlight ? 'animate-spin' : ''}`} />
            Reconnect
          </button>
        </div>
      </form>

      {/* Lock warning */}
      {!isUnlocked && (
        <p className="text-xs text-amber-300/80 bg-amber-950/30 p-2.5 rounded-xl border border-amber-600/30 font-mono">
          Camera controls require authentication. Please enter security PIN to unlock.
        </p>
      )}

      {/* Action / Error messages */}
      {actionError && (
        <div role="alert" className="p-3 bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{actionError}</span>
        </div>
      )}

      {error && (
        <div role="alert" className="p-3 bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>Camera Error ({error.code}): {error.message}</span>
        </div>
      )}

      {/* Connecting hint if > 15 seconds */}
      {isConnecting && connectingTimer >= 15 && (
        <div role="alert" className="p-3 bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs rounded-xl space-y-1">
          <p className="font-semibold flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            Connecting taking longer than normal (15s+)
          </p>
          <ul className="list-disc list-inside text-amber-300/70 text-[11px] pl-1 space-y-0.5">
            <li>Ensure smartphone and Pi are connected to identical local Wi-Fi SSID.</li>
            <li>Double-check port and IP shown on smartphone screen.</li>
            <li>Confirm IP Webcam password is not set or permits LAN access.</li>
          </ul>
        </div>
      )}
    </div>
  );
}
