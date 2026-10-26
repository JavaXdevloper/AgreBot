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
    <div className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Replay (recorded video)
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Video loop for demonstrations and offline algorithm testing
            </p>
          </div>
        </div>
        <span
          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
            replayActive
              ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
              : 'bg-[var(--surface-2)] text-[var(--text-muted)] border-[var(--border-subtle)]'
          }`}
        >
          {replayActive ? 'REPLAY ACTIVE' : 'REPLAY INACTIVE'}
        </span>
      </div>

      <p className="text-xs text-[var(--text-muted)] leading-relaxed">
        Plays a saved video through the same detection model. Used for demos when no live camera is available. The rover cannot drive in replay.
      </p>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div role="dialog" aria-modal="true" aria-labelledby="confirm-replay-heading" className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl space-y-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <h4 id="confirm-replay-heading" className="text-xs font-bold text-[var(--text-primary)]">
                Live Camera Disconnection Warning
              </h4>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                A live camera stream is active. Starting replay will disconnect the live camera. Are you sure you want to proceed?
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              className="px-3.5 py-1.5 text-xs bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--border-subtle)] rounded-lg font-medium text-[var(--text-primary)] min-h-[36px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void executeStartReplay()}
              className="px-3.5 py-1.5 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium shadow-sm min-h-[36px]"
              aria-label="Confirm & Start Replay"
            >
              Confirm & Start Replay
            </button>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div role="alert" className="p-3 bg-red-500/10 border border-[var(--danger-border)] text-[var(--danger-text)] text-xs rounded-xl">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        {replayActive ? (
          <button
            type="button"
            onClick={handleStopReplay}
            disabled={inFlight || isOffline}
            className="min-h-[44px] px-4 py-2 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-semibold rounded-xl transition disabled:opacity-40 flex items-center gap-2"
            aria-label="Stop Replay Mode"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            Stop Replay Mode
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStartClick}
            disabled={inFlight || isOffline || (!replayAvailable && !IS_MOCK)}
            className="min-h-[44px] px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl transition shadow-sm disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
            aria-label="Start Prerecorded Replay"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Start Prerecorded Replay
          </button>
        )}

        {!replayAvailable && !IS_MOCK && (
          <span className="text-xs text-[var(--text-muted)]">
            (No replay file configured on backend)
          </span>
        )}
      </div>
    </div>
  );
}
