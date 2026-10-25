import React, { useState } from 'react';
import { Lock, Unlock, KeyRound, AlertCircle, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import type { RoverControl } from '../../lib/api/types';

export interface PinUnlockDialogProps {
  roverControl: RoverControl;
  isOffline: boolean;
  onSuccess?: () => void;
}

export function PinUnlockDialog({ roverControl, isOffline, onSuccess }: PinUnlockDialogProps) {
  const [pin, setPin] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const { isSubmitting, error, unlock, lock, clearError } = useAuth();

  const isUnlocked = roverControl === 'ready';

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    clearError();

    if (!pin.trim()) {
      setValidationError('PIN is required.');
      return;
    }

    try {
      await unlock(pin.trim());
      setPin('');
      onSuccess?.();
    } catch {
      // Error handled by hook and displayed below
    }
  };

  const handleLock = async () => {
    try {
      await lock();
      onSuccess?.();
    } catch {
      // Error handled by hook
    }
  };

  let errorMessage: string | null = null;
  if (validationError) {
    errorMessage = validationError;
  } else if (error) {
    const code = 'code' in error ? String((error as { code: unknown }).code) : '';
    if (code === 'INVALID_PIN') {
      errorMessage = 'Incorrect PIN entered. Please try again.';
    } else if (code === 'TOO_MANY_ATTEMPTS') {
      errorMessage = 'Too many failed attempts. Please wait 1 minute before trying again.';
    } else if (code === 'PIN_NOT_CONFIGURED') {
      errorMessage = 'No PIN has been configured on the backend server.';
    } else {
      errorMessage = error.message || 'Authentication failed.';
    }
  }

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold uppercase font-mono tracking-wider text-slate-100">
            Operator Access Control
          </h2>
        </div>
        <span
          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${
            isUnlocked
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          }`}
        >
          {isUnlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
          {isUnlocked ? 'AUTHORIZED' : 'RESTRICTED'}
        </span>
      </div>

      {isUnlocked ? (
        <div className="space-y-3">
          <p className="text-xs text-slate-400 leading-relaxed">
            Rover movement and camera configuration unlocked. Remember to lock the console before leaving the station.
          </p>
          <button
            type="button"
            onClick={handleLock}
            disabled={isSubmitting || isOffline}
            className="min-h-[44px] w-full px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-mono font-semibold rounded-xl transition disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4 text-amber-400" />
            Lock Controls Now
          </button>
        </div>
      ) : (
        <form onSubmit={handleUnlock} className="space-y-3">
          <div>
            <label htmlFor="rover-pin-input" className="block text-xs font-mono text-slate-400 mb-1">
              Security PIN Code
            </label>
            <input
              id="rover-pin-input"
              type="password"
              inputMode="numeric"
              maxLength={16}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setValidationError(null);
                clearError();
              }}
              placeholder="Enter PIN (e.g. 1234)"
              disabled={isSubmitting || isOffline}
              className="w-full text-sm font-mono px-3.5 py-2.5 bg-[#0d131f] border rounded-xl border-slate-700 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 disabled:opacity-40"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isOffline}
            className="min-h-[44px] w-full px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-mono font-bold tracking-wider rounded-xl transition shadow-lg glow-emerald disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Unlock className="w-4 h-4" />
            {isSubmitting ? 'Verifying...' : 'Unlock Rover Controls'}
          </button>
        </form>
      )}

      {errorMessage && (
        <div role="alert" className="p-3 bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
          {errorMessage.includes('Too many') ? (
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
