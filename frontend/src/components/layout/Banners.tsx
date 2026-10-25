import { AlertTriangle, WifiOff, Clock, FlaskConical, PlayCircle } from 'lucide-react';

export interface BannersProps {
  isMockActive: boolean;
  isBackendOffline: boolean;
  isReplayActive: boolean;
  clockWarning: null | 'soft' | 'strong';
  clockDiffMinutes?: number;
}

export function Banners({
  isMockActive,
  isBackendOffline,
  isReplayActive,
  clockWarning,
  clockDiffMinutes,
}: BannersProps) {
  return (
    <div className="flex flex-col gap-1.5 px-4 sm:px-8 pt-3">
      {/* 1. MOCK DATA BANNER */}
      {isMockActive && (
        <div
          role="alert"
          aria-label="Warning: mock data active"
          className="bg-rose-950/70 border border-rose-500/50 text-rose-200 px-4 py-2.5 rounded-xl shadow-lg flex items-center justify-between text-xs font-mono font-bold tracking-wider uppercase backdrop-blur-md"
        >
          <div className="flex items-center gap-2.5">
            <FlaskConical className="w-4 h-4 text-rose-400 shrink-0" />
            <span>MOCK DATA ACTIVE — NOT LIVE HARDWARE</span>
          </div>
          <span className="text-[10px] bg-rose-900/60 text-rose-300 px-2 py-0.5 rounded border border-rose-700">
            TEST MODE
          </span>
        </div>
      )}

      {/* 2. REPLAY ACTIVE BANNER */}
      {isReplayActive && (
        <div
          role="alert"
          className="bg-amber-950/70 border border-amber-500/50 text-amber-200 px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2.5 text-xs font-mono font-bold tracking-wider uppercase backdrop-blur-md"
        >
          <PlayCircle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
          <span>REPLAY / PRERECORDED SOURCE — NOT A LIVE CAMERA</span>
        </div>
      )}

      {/* 3. BACKEND OFFLINE BANNER */}
      {isBackendOffline && (
        <div
          role="alert"
          className="bg-red-950/80 border border-red-500/60 text-red-200 px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2.5 text-xs font-mono font-bold tracking-wider uppercase backdrop-blur-md"
        >
          <WifiOff className="w-4 h-4 text-red-400 shrink-0 animate-bounce" />
          <span>BACKEND UNREACHABLE — DATA STALE, DRIVE CONTROLS INTERLOCKED</span>
        </div>
      )}

      {/* 4. CLOCK WARNING BANNER */}
      {clockWarning && (
        <div
          role="alert"
          className={`px-4 py-2 rounded-xl text-xs font-mono flex items-center gap-2.5 shadow-md backdrop-blur-md border ${
            clockWarning === 'strong'
              ? 'bg-amber-950/70 border-amber-500/50 text-amber-200'
              : 'bg-slate-900/70 border-slate-700/50 text-slate-300'
          }`}
        >
          {clockWarning === 'strong' ? (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          ) : (
            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
          )}
          <span>
            {clockWarning === 'strong'
              ? `PI CLOCK DESYNC: ~${clockDiffMinutes ?? 'N'} MIN DRIFT DETECTED. TIME-STAMPS MAY BE INACCURATE.`
              : 'NTP synchronization pending. Field detection timestamps are approximate.'}
          </span>
        </div>
      )}
    </div>
  );
}
