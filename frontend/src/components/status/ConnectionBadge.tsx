import {
  Wifi,
  WifiOff,
  Loader2,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Settings2,
  MinusCircle,
  HelpCircle,
} from 'lucide-react';
import { clsx } from 'clsx';

interface BadgeConfig {
  colour: string;
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  animate?: boolean;
}

const STATE_MAP: Record<string, BadgeConfig> = {
  connected: {
    colour: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    Icon: Wifi,
    label: 'Connected',
  },
  disconnected: {
    colour: 'text-slate-500 bg-slate-50 border-slate-200',
    Icon: WifiOff,
    label: 'Disconnected',
  },
  connecting: {
    colour: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    Icon: Loader2,
    label: 'Connecting',
    animate: true,
  },
  stale: {
    colour: 'text-orange-700 bg-orange-50 border-orange-200',
    Icon: AlertTriangle,
    label: 'Stale',
  },
  error: {
    colour: 'text-red-700 bg-red-50 border-red-200',
    Icon: XCircle,
    label: 'Error',
  },
  starting: {
    colour: 'text-blue-700 bg-blue-50 border-blue-200',
    Icon: Loader2,
    label: 'Starting',
    animate: true,
  },
  ready: {
    colour: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    Icon: CheckCircle2,
    label: 'Ready',
  },
  not_configured: {
    colour: 'text-slate-500 bg-slate-50 border-slate-200',
    Icon: Settings2,
    label: 'Not configured',
  },
  loading: {
    colour: 'text-blue-700 bg-blue-50 border-blue-200',
    Icon: Loader2,
    label: 'Loading',
    animate: true,
  },
  disabled: {
    colour: 'text-slate-400 bg-slate-50 border-slate-200',
    Icon: MinusCircle,
    label: 'Disabled',
  },
};

interface ConnectionBadgeProps {
  state: string;
  label?: string;
}

export function ConnectionBadge({ state, label }: ConnectionBadgeProps) {
  const config: BadgeConfig = STATE_MAP[state] ?? {
    colour: 'text-slate-500 bg-slate-50 border-slate-200',
    Icon: HelpCircle,
    label: state,
  };

  const { colour, Icon, label: defaultLabel, animate } = config;
  const displayLabel = label ?? defaultLabel;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
        colour,
      )}
    >
      <Icon
        className={clsx('w-3.5 h-3.5 flex-shrink-0', animate && 'animate-spin')}
        aria-hidden="true"
      />
      <span>{displayLabel}</span>
    </span>
  );
}

export default ConnectionBadge;
