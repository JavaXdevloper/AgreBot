import { useState } from 'react';
import { Play, Square, Film, AlertTriangle } from 'lucide-react';
import { apiFetch } from '../../lib/api/client';
import { ENDPOINTS } from '../../lib/api/endpoints';
import { createMockClient } from '../../lib/api/mock';
import type { CameraState, RoverControl, Mode } from '../../lib/api/types';
import { STRINGS } from '../../lib/strings';

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
    <div
      className={`bg-surface-1 rounded-card p-4 sm:p-5 shadow-sm space-y-4 border ${
        replayActive ? 'border-replay/60 ring-2 ring-replay/30' : 'border-border'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-replay/10 text-replay border border-replay/20 flex items-center justify-center">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-text">
              {STRINGS.system.replayTitle}
            </h2>
            <p className="text-xs text-text-muted">
              Video loop for demonstrations and offline algorithm testing
            </p>
          </div>
        </div>
        <span
          className={`text-xs font-semibold px-2.5 py-0.5 rounded-pill border ${
            replayActive
              ? 'bg-replay/15 text-replay border-replay/30'
              : 'bg-surface-2 text-text-muted border-border'
          }`}
        >
          {replayActive ? 'REPLAY ACTIVE' : 'REPLAY INACTIVE'}
        </span>
      </div>

      <p className="text-xs text-text-muted leading-relaxed">
        Plays a saved video through the same detection model. Used for demos when no live camera is available. The rover cannot drive in replay.
      </p>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-replay-heading"
          className="p-4 bg-replay/10 border border-replay/30 rounded-card space-y-3"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-replay shrink-0 mt-0.5" />
            <div>
              <h4 id="confirm-replay-heading" className="text-xs font-bold text-text">
                Live Camera Disconnection Warning
              </h4>
              <p className="text-xs text-text-muted mt-1">
                A live camera stream is active. Starting replay will disconnect the live camera. Are you sure you want to proceed?
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              className="px-3.5 py-1.5 text-xs bg-surface-2 hover:bg-surface-1 border border-border rounded-input font-medium text-text min-h-[36px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void executeStartReplay()}
              className="px-3.5 py-1.5 text-xs bg-replay hover:opacity-90 text-white rounded-input font-medium shadow-sm min-h-[36px]"
              aria-label="Confirm & Start Replay"
            >
              Confirm & Start Replay
            </button>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div role="alert" className="p-3 bg-danger/10 border border-danger/30 text-danger text-xs rounded-card">
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
            className="min-h-[44px] px-4 py-2 bg-surface-2 hover:bg-surface-1 border border-border text-text text-xs font-semibold rounded-input transition disabled:opacity-40 flex items-center gap-2"
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
            className="min-h-[44px] px-4 py-2 bg-replay hover:opacity-90 text-white text-xs font-semibold rounded-input transition shadow-sm disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
            aria-label="Start Prerecorded Replay"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Start Prerecorded Replay
          </button>
        )}

        {!replayAvailable && !IS_MOCK && (
          <span className="text-xs text-text-muted">
            ({STRINGS.system.noReplayVideo})
          </span>
        )}
      </div>
    </div>
  );
}
