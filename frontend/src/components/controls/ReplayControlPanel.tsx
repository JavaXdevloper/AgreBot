import { useState } from 'react';
import { Play, Square, Film, AlertTriangle } from 'lucide-react';
import { apiFetch } from '../../lib/api/client';
import { ENDPOINTS } from '../../lib/api/endpoints';
import { createMockClient } from '../../lib/api/mock';
import type { CameraState, RoverControl, Mode } from '../../lib/api/types';

const IS_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const mockClient = IS_MOCK ? createMockClient() : null;

export interface ReplayControlPanelProps {
  mode: Mode;
  replayAvailable: boolean;
  replayActive: boolean;
  cameraState: CameraState;
  roverControl: RoverControl;
  isOffline: boolean;
  onRefreshStatus?: () => void;
}

export function ReplayControlPanel({
  mode,
  replayAvailable,
  replayActive,
  cameraState,
  roverControl,
  isOffline,
  onRefreshStatus,
}: ReplayControlPanelProps) {
  const [inFlight, setInFlight] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isUnlocked = roverControl === 'ready';
  const isLiveCameraConnected = mode === 'live' && (cameraState === 'connected' || cameraState === 'stale');

  const executeStartReplay = async () => {
    setInFlight(true);
    setError(null);
    setShowConfirm(false);

    try {
      if (IS_MOCK && mockClient) {
        await mockClient.startReplay();
      } else {
        await apiFetch(ENDPOINTS.REPLAY_START, {
          method: 'POST',
          timeoutMs: 4000,
        });
      }
      onRefreshStatus?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start replay');
    } finally {
      setInFlight(false);
    }
  };

  const handleStartClick = () => {
    if (!isUnlocked) {
      setError('Controls locked. Enter PIN to unlock before starting replay.');
      return;
    }

    if (isLiveCameraConnected) {
      setShowConfirm(true);
      return;
    }

    void executeStartReplay();
  };

  const handleStopReplay = async () => {
    setInFlight(true);
    setError(null);

    try {
      if (IS_MOCK && mockClient) {
        await mockClient.stopReplay();
      } else {
        await apiFetch(ENDPOINTS.REPLAY_STOP, {
          method: 'POST',
          timeoutMs: 4000,
        });
      }
      onRefreshStatus?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to stop replay');
    } finally {
      setInFlight(false);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-bold uppercase font-mono tracking-wider text-slate-100">
            Replay & Diagnostic Simulation
          </h2>
        </div>
        <span
          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
            replayActive
              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}
        >
          {replayActive ? 'REPLAY ACTIVE' : 'REPLAY INACTIVE'}
        </span>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        Prerecorded video simulation loop for lab verification. When active, motor driving is locked out for safety.
      </p>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div role="dialog" aria-modal="true" aria-labelledby="confirm-replay-heading" className="p-3.5 bg-amber-950/50 border border-amber-500/40 rounded-xl space-y-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 id="confirm-replay-heading" className="text-xs font-bold text-amber-200 font-mono">
                Live Camera Disconnection Warning
              </h4>
              <p className="text-xs text-amber-300/80 mt-1">
                A live camera stream is active. Starting replay will disconnect the live camera. Are you sure you want to proceed?
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg font-medium text-slate-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void executeStartReplay()}
              className="px-3 py-1.5 text-xs bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium shadow-md"
            >
              Confirm & Start Replay
            </button>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div role="alert" className="p-3 bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs rounded-xl">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        {replayActive ? (
          <button
            type="button"
            onClick={handleStopReplay}
            disabled={inFlight || isOffline}
            className="min-h-[44px] px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-mono font-semibold rounded-xl transition disabled:opacity-40 flex items-center gap-2"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            Stop Replay Mode
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStartClick}
            disabled={inFlight || isOffline || (!replayAvailable && !IS_MOCK)}
            className="min-h-[44px] px-4 py-2 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white text-xs font-mono font-bold tracking-wider rounded-xl transition shadow-md disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Start Prerecorded Replay
          </button>
        )}

        {!replayAvailable && !IS_MOCK && (
          <span className="text-[11px] text-slate-500 font-mono">
            (No replay file configured on backend)
          </span>
        )}
      </div>
    </div>
  );
}
