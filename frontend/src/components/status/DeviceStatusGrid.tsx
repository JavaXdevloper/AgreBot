import { useState } from 'react';
import { 
  Server, 
  Camera, 
  Cpu, 
  Cable, 
  Database, 
  Clock, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ChevronRight,
  HelpCircle
} from 'lucide-react';
import type { SystemStatus } from '../../lib/api/types';
import { formatTime, formatUptime } from '../../lib/formatters';

export interface DeviceStatusGridProps {
  status: SystemStatus | null;
  isOffline: boolean;
}

interface StatusItem {
  key: string;
  title: string;
  icon: typeof Server;
  stateLabel: string;
  stateType: 'ok' | 'warn' | 'error' | 'neutral';
  explanation: string;
  footerNote: string;
  detailPayload?: Record<string, unknown> | null;
}

export function DeviceStatusGrid({ status, isOffline }: DeviceStatusGridProps) {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  if (isOffline || !status) {
    return (
      <div className="bg-[var(--surface-1)] border border-[var(--danger-border)] rounded-2xl p-6 text-center shadow-sm">
        <XCircle className="w-10 h-10 text-[var(--danger-text)] mx-auto mb-2.5 animate-pulse" />
        <h3 className="text-base font-semibold text-[var(--text-primary)]">
          Rover computer unreachable
        </h3>
        <p className="text-xs text-[var(--text-muted)] mt-1 max-w-md mx-auto">
          The dashboard is currently unable to communicate with the rover backend. Check the local Wi-Fi or hotspot connection.
        </p>
      </div>
    );
  }

  // Derive cards per Section 6.10 & Section 8
  const items: StatusItem[] = [
    // 1. Rover computer (backend)
    {
      key: 'backend',
      title: 'Rover computer',
      icon: Server,
      stateLabel: status.backend.state === 'ready' ? 'Ready' : status.backend.state,
      stateType: status.backend.state === 'ready' ? 'ok' : 'error',
      explanation: `Uptime: ${formatUptime(status.backend.uptime_seconds)}`,
      footerNote: `Backend v${status.backend.version}`,
      detailPayload: {
        uptime_seconds: status.backend.uptime_seconds,
        version: status.backend.version,
        state: status.backend.state,
      },
    },
    // 2. Camera
    {
      key: 'camera',
      title: 'Camera',
      icon: Camera,
      stateLabel: status.camera.state === 'connected' ? 'Live' : status.camera.state === 'connecting' ? 'Connecting…' : status.camera.state === 'stale' ? 'Stale' : 'Not connected',
      stateType: status.camera.state === 'connected' ? 'ok' : status.camera.state === 'connecting' || status.camera.state === 'stale' ? 'warn' : 'error',
      explanation: status.camera.fps !== null ? `${status.camera.fps.toFixed(1)} frames per second` : 'No active stream',
      footerNote: status.camera.last_frame_at ? `Last frame: ${formatTime(status.camera.last_frame_at)}` : 'No frames received',
      detailPayload: {
        source: status.camera.source,
        fps: status.camera.fps,
        error: status.camera.error?.message ?? null,
      },
    },
    // 3. Detection model
    {
      key: 'model',
      title: 'Detection model',
      icon: Cpu,
      stateLabel: status.model.state === 'ready' ? 'Ready' : status.model.state === 'loading' ? 'Loading…' : status.model.state === 'not_configured' ? 'Not set up' : 'Error',
      stateType: status.model.state === 'ready' ? 'ok' : status.model.state === 'loading' ? 'warn' : 'neutral',
      explanation: status.model.name || 'ResNet-18 Crop Disease',
      footerNote: status.model.state === 'ready' ? 'Inference active' : (status.model.error?.message || 'Awaiting weights'),
      detailPayload: {
        model_name: status.model.name,
        state: status.model.state,
        error: status.model.error?.message ?? null,
      },
    },
    // 4. Rover link (Arduino)
    {
      key: 'arduino',
      title: 'Rover link',
      icon: Cable,
      stateLabel: status.arduino.state === 'connected' ? 'Ready' : status.arduino.state === 'connecting' ? 'Searching…' : 'Not connected',
      stateType: status.arduino.state === 'connected' ? 'ok' : 'neutral',
      explanation: status.arduino.state === 'connected' ? `Connected on ${status.arduino.port}` : 'Rover not connected — check USB cable',
      footerNote: status.arduino.firmware_version ? `Firmware: ${status.arduino.firmware_version}` : 'Auto-scanning USB',
      detailPayload: {
        port: status.arduino.port,
        last_seen_at: status.arduino.last_seen_at,
        firmware: status.arduino.firmware_version,
        error: status.arduino.error?.message ?? null,
      },
    },
    // 5. Saved data (SQLite)
    {
      key: 'database',
      title: 'Saved data',
      icon: Database,
      stateLabel: status.database.state === 'ready' ? 'OK' : 'Error',
      stateType: status.database.state === 'ready' ? 'ok' : 'error',
      explanation: 'Detections are being saved',
      footerNote: status.database.error ? 'SQLite error' : 'WAL mode active',
      detailPayload: {
        state: status.database.state,
        error: status.database.error?.message ?? null,
      },
    },
    // 6. Clock sync
    {
      key: 'clock',
      title: 'System clock',
      icon: Clock,
      stateLabel: status.clock?.ntp_synchronized ? 'Synced' : 'Local time',
      stateType: status.clock?.ntp_synchronized ? 'ok' : 'warn',
      explanation: status.clock?.ntp_synchronized ? 'NTP time synchronized' : 'RTC / local rover clock',
      footerNote: formatTime(status.timestamp),
      detailPayload: {
        rover_timestamp: status.timestamp,
        ntp_synchronized: status.clock?.ntp_synchronized,
      },
    },
    // 7. Active mode
    {
      key: 'mode',
      title: 'Operating mode',
      icon: Sliders,
      stateLabel: status.mode === 'live' ? 'Live camera' : status.mode === 'replay' ? 'Replay video' : String(status.mode).toUpperCase(),
      stateType: status.mode === 'live' ? 'ok' : status.mode === 'replay' ? 'warn' : 'neutral',
      explanation: status.replay?.active ? 'Playing recorded video' : 'Normal inspection workflow',
      footerNote: status.mode === 'live' ? 'Motors enabled' : 'Motors disabled in replay',
      detailPayload: {
        mode: status.mode,
        replay_active: status.replay?.active,
      },
    },
  ];

  const getColorClasses = (type: StatusItem['stateType']) => {
    switch (type) {
      case 'ok':
        return {
          text: 'text-[var(--success-solid)]',
          badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          icon: 'text-[var(--success-solid)]',
        };
      case 'warn':
        return {
          text: 'text-amber-400',
          badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
          icon: 'text-amber-400',
        };
      case 'error':
        return {
          text: 'text-[var(--danger-text)]',
          badge: 'bg-red-500/10 text-red-400 border-red-500/30',
          icon: 'text-[var(--danger-text)]',
        };
      default:
        return {
          text: 'text-[var(--text-muted)]',
          badge: 'bg-[var(--surface-3)] text-[var(--text-muted)] border-[var(--border-subtle)]',
          icon: 'text-[var(--text-muted)]',
        };
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Subsystem Status
        </h3>
        <span className="text-xs text-[var(--text-muted)]">
          Click any card for technical details
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {items.map((item) => {
          const Icon = item.icon;
          const colors = getColorClasses(item.stateType);
          const isExpanded = expandedCard === item.key;

          return (
            <div
              key={item.key}
              onClick={() => setExpandedCard(isExpanded ? null : item.key)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setExpandedCard(isExpanded ? null : item.key);
                }
              }}
              className={`bg-[var(--surface-1)] border transition-all rounded-2xl p-4 cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] select-none flex flex-col justify-between ${
                isExpanded
                  ? 'border-[var(--brand-primary)] ring-1 ring-[var(--brand-primary)]'
                  : 'border-[var(--border-subtle)] hover:border-[var(--text-muted)]'
              }`}
            >
              {/* Top Row: Icon (24) + Title (14 muted) */}
              <div>
                <div className="flex items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[var(--surface-2)] flex items-center justify-center">
                      <Icon className={`w-4 h-4 ${colors.icon}`} />
                    </div>
                    <span className="text-xs font-medium text-[var(--text-muted)]">
                      {item.title}
                    </span>
                  </div>
                  <ChevronRight
                    className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                </div>

                {/* Big State Word (20, coloured) */}
                <div className="mt-1">
                  <span className={`text-xl font-bold tracking-tight ${colors.text}`}>
                    {item.stateLabel}
                  </span>
                </div>

                {/* One Muted Explanation Line */}
                <p className="text-xs text-[var(--text-primary)] mt-1 line-clamp-1">
                  {item.explanation}
                </p>
              </div>

              {/* Bottom Row: Last-seen time / small detail */}
              <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                <span className="truncate">{item.footerNote}</span>
                {item.stateType === 'ok' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success-solid)] shrink-0" />
                ) : item.stateType === 'warn' ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                ) : item.stateType === 'error' ? (
                  <XCircle className="w-3.5 h-3.5 text-[var(--danger-text)] shrink-0" />
                ) : (
                  <HelpCircle className="w-3.5 h-3.5 opacity-40 shrink-0" />
                )}
              </div>

              {/* Expandable Technical Details Area */}
              {isExpanded && item.detailPayload && (
                <div
                  className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] text-[10px] font-mono text-[var(--text-muted)] bg-[var(--surface-2)] p-2.5 rounded-lg overflow-x-auto space-y-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-primary)] mb-1">
                    Telemetry Parameters
                  </div>
                  {Object.entries(item.detailPayload).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2">
                      <span className="text-[var(--text-muted)]">{k}:</span>
                      <span className="text-[var(--text-primary)] font-semibold truncate max-w-[150px]">
                        {v !== null && v !== undefined ? String(v) : 'null'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
