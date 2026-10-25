import { Octagon } from 'lucide-react';

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
      title="EMERGENCY STOP (Space or Esc)"
      aria-label="Emergency Stop Rover"
      className="w-full min-h-[56px] py-3.5 px-6 bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 active:scale-[0.98] text-white font-black text-lg tracking-widest font-mono rounded-xl shadow-xl glow-red border border-red-400/40 transition-all duration-150 flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed touch-none select-none"
    >
      <Octagon className="w-6 h-6 fill-white text-rose-600 shrink-0" />
      <span>EMERGENCY STOP</span>
    </button>
  );
}
