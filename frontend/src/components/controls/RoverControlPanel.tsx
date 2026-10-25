import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ShieldAlert, Keyboard, Navigation } from 'lucide-react';
import { StopButton } from './StopButton';
import { useHoldToDrive } from '../../hooks/useHoldToDrive';
import { formatTime } from '../../lib/formatters';
import type { RoverControl, Mode, RoverCommand } from '../../lib/api/types';

export interface RoverControlPanelProps {
  roverControl: RoverControl;
  roverReason: string | null;
  mode: Mode;
  isOffline: boolean;
  lastCommand: RoverCommand | null;
  lastCommandAt: string | null;
  onCommandDispatched?: (cmd: RoverCommand) => void;
}

export function RoverControlPanel({
  roverControl,
  roverReason,
  mode,
  isOffline,
  lastCommand,
  lastCommandAt,
  onCommandDispatched,
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
    clearError,
  } = useHoldToDrive({
    roverControl,
    mode,
    isOffline,
    onCommandSent: onCommandDispatched,
  });

  const getReasonText = () => {
    if (isOffline) return 'Backend link offline';
    if (mode === 'replay') return 'Movement locked out during prerecorded replay';
    if (roverControl === 'locked') return 'Controls locked — security PIN required';
    if (roverControl === 'unavailable') {
      if (roverReason === 'ARDUINO_DISCONNECTED') return 'Microcontroller USB serial disconnected';
      if (roverReason === 'PIN_NOT_CONFIGURED') return 'Security PIN not configured';
      return roverReason || 'Hardware link unavailable';
    }
    return null;
  };

  const reasonText = getReasonText();

  const handlePointerDown = (cmd: RoverCommand) => (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    startDriving(cmd, e.pointerId, e.currentTarget);
  };

  const handlePointerUp = () => {
    stopDriving();
  };

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold uppercase font-mono tracking-wider text-slate-100">
            Rover Drive Console
          </h2>
        </div>
        <span
          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
            roverControl === 'ready' && !isOffline && mode !== 'replay'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          }`}
        >
          {roverControl === 'ready' && !isOffline && mode !== 'replay' ? 'DRIVE READY' : 'INTERLOCKED'}
        </span>
      </div>

      {/* Safety Banner */}
      <div className="bg-amber-950/40 border border-amber-600/30 text-amber-300 p-3 rounded-xl text-xs flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
        <div>
          <p className="font-semibold font-mono tracking-wide">Test with wheels lifted first.</p>
          <p className="text-amber-200/70 text-[11px] mt-0.5">
            Hold button to drive (200ms pulse). Release or hit STOP immediately if unexpected movement occurs.
          </p>
        </div>
      </div>

      {/* Disabled Reason Notice */}
      {reasonText && (
        <div role="status" className="p-2.5 bg-slate-900/80 border border-slate-800 text-slate-300 text-xs rounded-xl flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span>{reasonText}</span>
        </div>
      )}

      {/* Command Error Alert */}
      {error && (
        <div role="alert" className="p-3 bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs rounded-xl flex items-center justify-between">
          <span>Command error: {error}</span>
          <button
            onClick={clearError}
            className="text-[11px] bg-rose-900/60 hover:bg-rose-900 px-2 py-0.5 rounded font-mono border border-rose-700 text-rose-200"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Drive Pad (Tactile D-Pad layout) */}
      <div className="flex flex-col items-center justify-center gap-2.5 py-2 select-none">
        {/* Forward */}
        <button
          type="button"
          disabled={isDrivingDisabled}
          onPointerDown={handlePointerDown('forward')}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          aria-label="Drive Forward"
          className={`w-20 h-14 rounded-xl flex items-center justify-center border transition-all duration-100 touch-none active:scale-95 ${
            activeDirection === 'forward'
              ? 'bg-emerald-500 text-black border-emerald-400 glow-emerald scale-95 shadow-inner'
              : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border-slate-700/80 shadow-md disabled:opacity-30 disabled:cursor-not-allowed'
          }`}
        >
          <ArrowUp className="w-6 h-6 stroke-[2.5]" />
        </button>

        {/* Left / Right */}
        <div className="flex items-center gap-8">
          <button
            type="button"
            disabled={isDrivingDisabled}
            onPointerDown={handlePointerDown('left')}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            aria-label="Turn Left"
            className={`w-20 h-14 rounded-xl flex items-center justify-center border transition-all duration-100 touch-none active:scale-95 ${
              activeDirection === 'left'
                ? 'bg-emerald-500 text-black border-emerald-400 glow-emerald scale-95 shadow-inner'
                : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border-slate-700/80 shadow-md disabled:opacity-30 disabled:cursor-not-allowed'
            }`}
          >
            <ArrowLeft className="w-6 h-6 stroke-[2.5]" />
          </button>

          <button
            type="button"
            disabled={isDrivingDisabled}
            onPointerDown={handlePointerDown('right')}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            aria-label="Turn Right"
            className={`w-20 h-14 rounded-xl flex items-center justify-center border transition-all duration-100 touch-none active:scale-95 ${
              activeDirection === 'right'
                ? 'bg-emerald-500 text-black border-emerald-400 glow-emerald scale-95 shadow-inner'
                : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border-slate-700/80 shadow-md disabled:opacity-30 disabled:cursor-not-allowed'
            }`}
          >
            <ArrowRight className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Backward */}
        <button
          type="button"
          disabled={isDrivingDisabled}
          onPointerDown={handlePointerDown('backward')}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          aria-label="Drive Backward"
          className={`w-20 h-14 rounded-xl flex items-center justify-center border transition-all duration-100 touch-none active:scale-95 ${
            activeDirection === 'backward'
              ? 'bg-emerald-500 text-black border-emerald-400 glow-emerald scale-95 shadow-inner'
              : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border-slate-700/80 shadow-md disabled:opacity-30 disabled:cursor-not-allowed'
          }`}
        >
          <ArrowDown className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>

      {/* High-Visibility Dominant Emergency STOP Button */}
      <div className="pt-2">
        <StopButton onStop={sendEmergencyStop} />
      </div>

      {/* Keyboard Control & Telemetry Footer */}
      <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
        <label className="flex items-center gap-2 cursor-pointer select-none hover:text-slate-200 transition">
          <input
            type="checkbox"
            checked={isKeyboardEnabled}
            onChange={(e) => setIsKeyboardEnabled(e.target.checked)}
            className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500"
          />
          <Keyboard className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[11px] font-mono">WASD / Arrow Controls</span>
        </label>

        <div className="font-mono text-[11px] text-right">
          {lastCommand ? (
            <span className="text-slate-300">
              Cmd: <span className="text-emerald-400 font-bold uppercase">{lastCommand}</span>{' '}
              {lastCommandAt ? `(${formatTime(lastCommandAt)})` : ''}
            </span>
          ) : (
            <span className="text-slate-500">Idle / No command</span>
          )}
        </div>
      </div>
    </div>
  );
}
