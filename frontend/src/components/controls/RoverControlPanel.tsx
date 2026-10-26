import React, { useState } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Square, Keyboard, Lock, AlertCircle, Check } from 'lucide-react';
import { StopButton } from './StopButton';
import { useHoldToDrive } from '../../hooks/useHoldToDrive';
import { formatTime } from '../../lib/formatters';
import type { RoverControl, Mode, RoverCommand } from '../../lib/api/types';
import { STRINGS } from '../../lib/strings';

export interface RoverControlPanelProps {
  roverControl: RoverControl;
  roverReason: string | null;
  mode: Mode;
  isOffline: boolean;
  lastCommand: RoverCommand | null;
  lastCommandAt: string | null;
  onCommandDispatched?: (cmd: RoverCommand) => void;
  onUnlockClick?: () => void;
}

export function RoverControlPanel({
  roverControl,
  roverReason,
  mode,
  isOffline,
  lastCommand,
  lastCommandAt,
  onCommandDispatched,
  onUnlockClick,
}: RoverControlPanelProps) {
  const {
    activeDirection,
    error,
    isDrivingDisabled,
    isKeyboardEnabled,
    setIsKeyboardEnabled,
    startDriving,
    stopDriving,
    sendEmergencyStop,
  } = useHoldToDrive({
    roverControl,
    mode,
    isOffline,
    onCommandSent: onCommandDispatched,
  });

  const [dismissSafetyNote, setDismissSafetyNote] = useState(false);

  // Status captions per Section 6.5
  let statusCaption = STRINGS.drive.readyToDrive;
  let statusColor = 'text-ok';

  if (isOffline) {
    statusCaption = 'Rover computer unreachable';
    statusColor = 'text-danger';
  } else if (mode === 'replay') {
    statusCaption = 'Movement disabled in replay';
    statusColor = 'text-replay';
  } else if (roverControl === 'locked') {
    statusCaption = STRINGS.drive.unlockToDrive;
    statusColor = 'text-warn';
  } else if (roverControl === 'unavailable') {
    if (roverReason === 'ARDUINO_DISCONNECTED') {
      statusCaption = STRINGS.drive.roverNotConnected;
    } else {
      statusCaption = 'Motor control unavailable';
    }
    statusColor = 'text-text-muted';
  } else if (activeDirection) {
    statusCaption = STRINGS.drive.sending(activeDirection.toUpperCase());
    statusColor = 'text-brand';
  }

  const handlePointerDown = (cmd: 'forward' | 'backward' | 'left' | 'right', e: React.PointerEvent) => {
    e.preventDefault();
    if (isDrivingDisabled) {
      if (roverControl === 'locked') {
        onUnlockClick?.();
      }
      return;
    }
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    startDriving(cmd);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    stopDriving();
  };

  return (
    <div className="bg-surface-1 border border-border rounded-card p-4 sm:p-5 shadow-sm space-y-5 select-none">
      {/* Header bar: Drive Title & Keyboard Switch */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-text">{STRINGS.drive.title}</h2>
          <span className="text-xs text-text-muted hidden sm:inline">•</span>
          <span className={`text-xs font-medium ${statusColor}`}>
            {statusCaption}
          </span>
        </div>

        {/* Keyboard Toggle */}
        <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-text-muted hover:text-text">
          <input
            type="checkbox"
            checked={isKeyboardEnabled}
            onChange={(e) => setIsKeyboardEnabled(e.target.checked)}
            className="w-4 h-4 rounded border-border text-brand focus:ring-brand"
          />
          <Keyboard className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{STRINGS.drive.keyboardDrive}</span>
        </label>
      </div>

      {/* Safety Notice per Section 7 item 4 */}
      {!dismissSafetyNote && (
        <div className="p-3 bg-surface-2 border border-border rounded-input text-xs text-text-muted flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <Check className="w-4 h-4 text-brand shrink-0 mt-0.5" />
            <span>{STRINGS.drive.safetyNote}</span>
          </div>
          <button
            onClick={() => setDismissSafetyNote(true)}
            className="text-text-muted hover:text-text font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* D-Pad Container (3x3 Grid, 12px gaps, 72-96px buttons) */}
      <div className="flex flex-col items-center justify-center py-2">
        <div className="grid grid-cols-3 gap-3 w-64 sm:w-72">
          {/* Row 1 */}
          <div />
          <button
            type="button"
            aria-label="Drive Forward"
            disabled={isDrivingDisabled}
            onPointerDown={(e) => handlePointerDown('forward', e)}
            onPointerUp={handlePointerUp}
            className={`h-20 sm:h-24 rounded-drive border-2 flex items-center justify-center touch-none transition-all active:scale-95 ${
              activeDirection === 'forward'
                ? 'bg-brand text-brand-foreground border-brand scale-95 shadow-sm'
                : isDrivingDisabled
                ? 'bg-surface-2 text-text-muted/40 border-border opacity-60'
                : 'bg-surface-2 hover:bg-surface-1 text-text border-border'
            }`}
          >
            <ArrowUp className="w-8 h-8" />
          </button>
          <div />

          {/* Row 2 */}
          <button
            type="button"
            aria-label="Turn Left"
            disabled={isDrivingDisabled}
            onPointerDown={(e) => handlePointerDown('left', e)}
            onPointerUp={handlePointerUp}
            className={`h-20 sm:h-24 rounded-drive border-2 flex items-center justify-center touch-none transition-all active:scale-95 ${
              activeDirection === 'left'
                ? 'bg-brand text-brand-foreground border-brand scale-95 shadow-sm'
                : isDrivingDisabled
                ? 'bg-surface-2 text-text-muted/40 border-border opacity-60'
                : 'bg-surface-2 hover:bg-surface-1 text-text border-border'
            }`}
          >
            <ArrowLeft className="w-8 h-8" />
          </button>

          {/* Center Stop Square */}
          <button
            type="button"
            aria-label="Stop in Center"
            onClick={() => void sendEmergencyStop()}
            className="h-20 sm:h-24 rounded-drive bg-danger-solid hover:bg-danger text-white border-2 border-danger/40 flex items-center justify-center touch-none transition-transform active:scale-95 shadow-sm"
          >
            {roverControl === 'locked' ? (
              <Lock className="w-7 h-7" />
            ) : (
              <Square className="w-7 h-7 fill-current" />
            )}
          </button>

          <button
            type="button"
            aria-label="Turn Right"
            disabled={isDrivingDisabled}
            onPointerDown={(e) => handlePointerDown('right', e)}
            onPointerUp={handlePointerUp}
            className={`h-20 sm:h-24 rounded-drive border-2 flex items-center justify-center touch-none transition-all active:scale-95 ${
              activeDirection === 'right'
                ? 'bg-brand text-brand-foreground border-brand scale-95 shadow-sm'
                : isDrivingDisabled
                ? 'bg-surface-2 text-text-muted/40 border-border opacity-60'
                : 'bg-surface-2 hover:bg-surface-1 text-text border-border'
            }`}
          >
            <ArrowRight className="w-8 h-8" />
          </button>

          {/* Row 3 */}
          <div />
          <button
            type="button"
            aria-label="Drive Backward"
            disabled={isDrivingDisabled}
            onPointerDown={(e) => handlePointerDown('backward', e)}
            onPointerUp={handlePointerUp}
            className={`h-20 sm:h-24 rounded-drive border-2 flex items-center justify-center touch-none transition-all active:scale-95 ${
              activeDirection === 'backward'
                ? 'bg-brand text-brand-foreground border-brand scale-95 shadow-sm'
                : isDrivingDisabled
                ? 'bg-surface-2 text-text-muted/40 border-border opacity-60'
                : 'bg-surface-2 hover:bg-surface-1 text-text border-border'
            }`}
          >
            <ArrowDown className="w-8 h-8" />
          </button>
          <div />
        </div>
      </div>

      {/* Prominent Emergency STOP Button (Always visible) */}
      <StopButton onStop={sendEmergencyStop} />

      {/* Error alert if command failed */}
      {error && (
        <div className="p-3 bg-danger/10 border border-danger/30 text-danger text-xs rounded-input flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{typeof error === 'string' ? error : (error as { message?: string })?.message || String(error)}</span>
        </div>
      )}

      {/* Telemetry info: Last Command Sent */}
      <div className="flex items-center justify-between text-xs text-text-muted border-t border-border pt-3">
        <span>{lastCommand ? `Last sent: ${lastCommand.toUpperCase()}` : 'No commands sent'}</span>
        {lastCommandAt && <span>{formatTime(lastCommandAt)}</span>}
      </div>
    </div>
  );
}
