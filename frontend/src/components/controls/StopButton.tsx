import { Octagon } from 'lucide-react';
import { STRINGS } from '../../lib/strings';

export interface StopButtonProps {
  onStop: () => void | Promise<void>;
  disabled?: boolean;
}

export function StopButton({ onStop, disabled }: StopButtonProps) {
  return (
    <button
      type="button"
      onClick={() => void onStop()}
      disabled={disabled}
      title="STOP (Space or Esc)"
      aria-label="Emergency Stop Rover"
      className="w-full h-14 sm:h-16 py-3.5 px-6 bg-danger-solid hover:bg-danger active:scale-[0.98] text-white font-bold text-base sm:text-lg tracking-wider rounded-input shadow-md border border-danger/40 transition-all duration-150 flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed touch-none select-none"
    >
      <Octagon className="w-6 h-6 fill-white text-danger-solid shrink-0" />
      <span>{STRINGS.drive.stop}</span>
    </button>
  );
}
