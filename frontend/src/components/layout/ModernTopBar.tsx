import { Sun, Moon, Lock, Unlock, Bot } from 'lucide-react';
import type { ModeBadge } from './AppHeader';
import { ConnectionChips } from './ConnectionChips';
import type { CameraState, ModelState, ArduinoState, RoverControl } from '../../lib/api/types';
import { STRINGS } from '../../lib/strings';

interface ModernTopBarProps {
  modeBadge: ModeBadge;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  isUnlocked: boolean;
  onToggleLock: () => void;
  cameraState: CameraState;
  modelState: ModelState;
  arduinoState: ArduinoState;
  roverControl: RoverControl;
}

export function ModernTopBar({
  modeBadge,
  theme,
  onToggleTheme,
  isUnlocked,
  onToggleLock,
  cameraState,
  modelState,
  arduinoState,
  roverControl,
}: ModernTopBarProps) {
  // Mode badge styling
  let badgeColor = 'bg-ok/15 text-ok border-ok/30';
  let badgeLabel = STRINGS.modes.live;
  if (modeBadge === 'REPLAY') {
    badgeColor = 'bg-replay/15 text-replay border-replay/30';
    badgeLabel = STRINGS.modes.replay;
  } else if (modeBadge === 'MOCK') {
    badgeColor = 'bg-mock/15 text-mock border-mock/30';
    badgeLabel = STRINGS.modes.mock;
  } else if (modeBadge === 'OFFLINE') {
    badgeColor = 'bg-danger/15 text-danger border-danger/30';
    badgeLabel = STRINGS.modes.offline;
  }

  return (
    <header className="sticky top-0 z-30 bg-surface-1 border-b border-border px-4 py-2.5 flex items-center justify-between gap-3 shadow-sm select-none">
      {/* Brand & Mode chip */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-input bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-text block leading-none">
              {STRINGS.app.title}
            </h1>
          </div>
        </div>

        {/* Mode Badge - never clipped, full text */}
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-pill text-[10px] font-bold tracking-wider uppercase border shrink-0 ${badgeColor}`}
        >
          {badgeLabel}
        </span>
      </div>

      {/* Centre: Compact connection chips */}
      <div className="hidden sm:flex items-center">
        <ConnectionChips
          cameraState={cameraState}
          modelState={modelState}
          arduinoState={arduinoState}
          roverControl={roverControl}
          isUnlocked={isUnlocked}
        />
      </div>

      {/* Right: Quick actions (Lock toggle + Theme switcher) */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleLock}
          aria-label={isUnlocked ? 'Lock rover controls' : 'Unlock rover controls'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-input text-xs font-semibold border transition-colors ${
            isUnlocked
              ? 'bg-ok/10 text-ok border-ok/30 hover:bg-ok/20'
              : 'bg-surface-2 text-text-muted border-border hover:bg-surface-1 hover:text-text'
          }`}
        >
          {isUnlocked ? <Unlock className="w-3.5 h-3.5 text-ok" /> : <Lock className="w-3.5 h-3.5" />}
          <span>{isUnlocked ? STRINGS.auth.unlocked : STRINGS.auth.locked}</span>
        </button>

        <button
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          className="p-1.5 rounded-input bg-surface-2 hover:bg-surface-1 border border-border text-text-muted hover:text-text transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-warn" /> : <Moon className="w-4 h-4 text-info" />}
        </button>
      </div>
    </header>
  );
}
