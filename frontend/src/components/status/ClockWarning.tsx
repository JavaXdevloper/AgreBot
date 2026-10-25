import { AlertTriangle, Info } from 'lucide-react';

interface ClockWarningProps {
  level: 'soft' | 'strong';
  diffMinutes?: number;
}

export function ClockWarning({ level, diffMinutes }: ClockWarningProps) {
  if (level === 'soft') {
    return (
      <div
        role="status"
        className="flex items-start gap-2 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-2 text-yellow-800 text-sm"
      >
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
        <span>Pi clock may not be NTP-synced — detection times may be approximate.</span>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-orange-400 bg-orange-50 px-4 py-2 text-orange-800 text-sm"
    >
      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
      <span>
        Pi clock is ~{diffMinutes ?? '?'} min off — detection times may be wrong.
      </span>
    </div>
  );
}

export default ClockWarning;
