import { AlertCircle, AlertTriangle, Radio, FlaskConical } from 'lucide-react';
import { STRINGS } from '../../lib/strings';

interface ModernBannersProps {
  isMockActive: boolean;
  isBackendOffline: boolean;
  isReplayActive: boolean;
  clockWarning: null | 'soft' | 'strong';
  clockDiffMinutes: number;
}

export function ModernBanners({
  isMockActive,
  isBackendOffline,
  isReplayActive,
  clockWarning,
  clockDiffMinutes,
}: ModernBannersProps) {
  return (
    <div className="w-full flex flex-col space-y-0.5 text-xs font-medium select-none" role="region" aria-label="System status alerts">
      {/* 1. MOCK BANNER */}
      {isMockActive && (
        <div className="w-full bg-mock/20 border-b border-mock/40 text-mock px-4 py-2 flex items-center justify-center gap-2 text-center">
          <FlaskConical className="w-4 h-4 shrink-0" />
          <span>{STRINGS.banners.mock}</span>
        </div>
      )}

      {/* 2. REPLAY BANNER */}
      {isReplayActive && (
        <div className="w-full bg-replay/20 border-b border-replay/40 text-replay px-4 py-2 flex items-center justify-center gap-2 text-center">
          <Radio className="w-4 h-4 shrink-0" />
          <span>{STRINGS.banners.replay}</span>
        </div>
      )}

      {/* 3. BACKEND OFFLINE BANNER */}
      {isBackendOffline && (
        <div className="w-full bg-danger/20 border-b border-danger/40 text-danger px-4 py-2 flex items-center justify-center gap-2 text-center">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{STRINGS.banners.offline}</span>
        </div>
      )}

      {/* 4. CLOCK WARNING BANNER */}
      {clockWarning && (
        <div className="w-full bg-warn/20 border-b border-warn/40 text-warn px-4 py-2 flex items-center justify-center gap-2 text-center">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            {clockWarning === 'strong'
              ? STRINGS.banners.clockStrong(clockDiffMinutes)
              : STRINGS.banners.clockSoft(clockDiffMinutes)}
          </span>
        </div>
      )}
    </div>
  );
}
