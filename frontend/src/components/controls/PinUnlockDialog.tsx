import React, { useState } from 'react';
import { Lock, Unlock, AlertCircle, Loader2, Delete } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import type { RoverControl } from '../../lib/api/types';
import { STRINGS } from '../../lib/strings';

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

  const handleUnlock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setValidationError(null);
    clearError();

    if (!pin.trim()) {
      setValidationError(STRINGS.auth.pinRequired);
      return;
    }

    try {
      await unlock(pin.trim());
      setPin('');
      onSuccess?.();
    } catch {
      // Error handled by hook
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

  const handleKeypadPress = (val: string) => {
    if (pin.length < 8) {
      setPin((prev) => prev + val);
      setValidationError(null);
      clearError();
    }
  };

  const handleKeypadBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  let errorMessage: string | null = null;
  if (validationError) {
    errorMessage = validationError;
  } else if (error) {
    const msg = error.message;
    if (msg.includes('INVALID_PIN')) errorMessage = STRINGS.auth.wrongPin;
    else if (msg.includes('TOO_MANY_ATTEMPTS')) errorMessage = STRINGS.auth.tooManyAttempts;
    else if (msg.includes('PIN_NOT_CONFIGURED')) errorMessage = STRINGS.auth.pinNotConfigured;
    else errorMessage = msg;
  }

  return (
    <div className="bg-surface-1 border border-border rounded-card p-5 shadow-sm space-y-5 select-none">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-input bg-surface-2 text-text">
            {isUnlocked ? <Unlock className="w-4 h-4 text-ok" /> : <Lock className="w-4 h-4" />}
          </div>
          <div>
            <h2 className="text-sm font-bold text-text">{STRINGS.auth.unlockTitle}</h2>
            <p className="text-xs text-text-muted">
              {isUnlocked ? 'Operator session verified' : 'PIN required to control rover'}
            </p>
          </div>
        </div>

        <span
          className={`px-2 py-0.5 rounded-pill text-[10px] font-bold uppercase tracking-wider border ${
            isUnlocked ? 'bg-ok/10 text-ok border-ok/30' : 'bg-surface-2 text-text-muted border-border'
          }`}
        >
          {isUnlocked ? STRINGS.auth.unlocked : STRINGS.auth.locked}
        </span>
      </div>

      {isUnlocked ? (
        <div className="space-y-4">
          <p className="text-xs text-text-muted">
            Controls are unlocked. You can steer the rover or connect the camera stream.
          </p>
          <button
            type="button"
            onClick={() => void handleLock()}
            disabled={isSubmitting}
            aria-label="Lock Controls Now"
            className="w-full h-11 bg-surface-2 hover:bg-surface-1 border border-border text-text font-semibold text-xs rounded-input transition-colors flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" />
            <span>Lock Controls Now</span>
          </button>
        </div>
      ) : (
        <form onSubmit={handleUnlock} className="space-y-4">
          {/* Masked PIN Display / Input */}
          <div className="space-y-1.5">
            <label htmlFor="pin-input" className="block text-xs font-semibold text-text">
              Security PIN Code
            </label>
            <input
              id="pin-input"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setValidationError(null);
                clearError();
              }}
              placeholder="••••"
              disabled={isOffline || isSubmitting}
              className="w-full h-12 px-4 text-center tracking-[0.5em] text-lg font-mono bg-surface-2 border border-border rounded-input text-text placeholder-text-muted focus:border-brand focus:ring-1 focus:ring-brand outline-none"
            />
          </div>

          {/* Numeric keypad (Phone & Touch Friendly per Section 6.7) */}
          <div className="grid grid-cols-3 gap-2 pt-1 max-w-[260px] mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeypadPress(digit)}
                className="h-12 bg-surface-2 hover:bg-surface-1 active:bg-surface-2 border border-border rounded-input text-base font-semibold text-text transition-colors"
              >
                {digit}
              </button>
            ))}
            <div />
            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              className="h-12 bg-surface-2 hover:bg-surface-1 active:bg-surface-2 border border-border rounded-input text-base font-semibold text-text transition-colors"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleKeypadBackspace}
              aria-label="Backspace"
              className="h-12 bg-surface-2 hover:bg-surface-1 active:bg-surface-2 border border-border rounded-input flex items-center justify-center text-text transition-colors"
            >
              <Delete className="w-5 h-5 text-text-muted" />
            </button>
          </div>

          {errorMessage && (
            <p className="text-xs text-danger flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </p>
          )}

          <button
            type="submit"
            aria-label="Unlock Rover Controls"
            disabled={isOffline || isSubmitting || !pin.trim()}
            className="w-full h-12 bg-brand text-brand-foreground hover:opacity-90 font-semibold text-xs rounded-input transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
            <span>{STRINGS.auth.unlockButton}</span>
          </button>
        </form>
      )}
    </div>
  );
}
