import { Bot, Wifi, WifiOff, PlayCircle, FlaskConical, Radio } from 'lucide-react';
import { formatTime } from '../../lib/formatters';

export type ModeBadge = 'LIVE' | 'REPLAY' | 'MOCK' | 'OFFLINE';

interface ModeBadgeConfig {
  colour: string;
  dotColor: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const MODE_BADGE_CONFIG: Record<ModeBadge, ModeBadgeConfig> = {
  LIVE: {
    colour: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
    dotColor: 'bg-emerald-400 animate-pulse',
    Icon: Wifi,
  },
  REPLAY: {
    colour: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
    dotColor: 'bg-amber-400 animate-pulse',
    Icon: PlayCircle,
  },
  MOCK: {
    colour: 'bg-rose-500/10 text-rose-400 border border-rose-500/30',
    dotColor: 'bg-rose-400',
    Icon: FlaskConical,
  },
  OFFLINE: {
    colour: 'bg-slate-700/30 text-slate-400 border border-slate-600/30',
    dotColor: 'bg-slate-500',
    Icon: WifiOff,
  },
};

interface AppHeaderProps {
  modeBadge: ModeBadge;
  lastUpdated: string | null;
  isMockActive: boolean;
}

export function AppHeader({ modeBadge, lastUpdated }: AppHeaderProps) {
  const { colour, dotColor, Icon } = MODE_BADGE_CONFIG[modeBadge];

  return (
    <header className="sticky top-0 z-30 bg-[#0d131f]/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
      {/* Left: Brand & Telemetry Ident */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-[1px] shadow-lg shadow-emerald-950/40">
          <div className="w-full h-full bg-[#0d131f] rounded-[11px] flex items-center justify-center">
            <Bot className="w-5 h-5 text-emerald-400" aria-hidden="true" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-black tracking-wider text-slate-100 uppercase font-mono">
              Agri Rover
            </h1>
            <span className="text-[10px] font-mono tracking-widest text-emerald-400/80 bg-emerald-950/60 border border-emerald-500/20 px-1.5 py-0.5 rounded">
              v1.0
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:flex items-center gap-1.5 font-medium">
            <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
            Autonomous Ground Inspection Unit
          </p>
        </div>
      </div>

      {/* Right: Mode Badge & Pulse Status */}
      <div className="flex items-center gap-4">
        {lastUpdated && (
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Telemetry Sync
            </span>
            <span className="text-xs font-mono font-bold text-slate-300">
              {formatTime(lastUpdated)}
            </span>
          </div>
        )}

        {/* Dynamic Mode Pill */}
        <div className={`px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-mono font-bold tracking-wider shadow-sm ${colour}`}>
          <span className={`w-2 h-2 rounded-full ${dotColor}`} />
          <Icon className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{modeBadge}</span>
        </div>
      </div>
    </header>
  );
}
