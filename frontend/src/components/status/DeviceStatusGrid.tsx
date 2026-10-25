import { AlertCircle, Camera, Cpu, Cable, Database, Sliders, Activity } from 'lucide-react';
import type { SystemStatus } from '../../lib/api/types';
import { formatTime, formatUptime } from '../../lib/formatters';

export interface DeviceStatusGridProps {
  status: SystemStatus | null;
  isOffline: boolean;
}

export function DeviceStatusGrid({ status, isOffline }: DeviceStatusGridProps) {
  if (isOffline || !status) {
    return (
      <div className="glass-panel border-amber-500/30 rounded-2xl p-6 text-center shadow-2xl">
        <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-2.5 animate-pulse" />
        <h3 className="text-base font-bold text-slate-100 font-mono tracking-wide">
          TELEMETRY DISCONNECTED
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          The dashboard is currently unable to communicate with the local rover backend. Controls are locked out for safety.
        </p>
      </div>
    );
  }

  const items = [
    {
      title: 'Backend Host',
      icon: Cpu,
      state: status.backend.state,
      isOk: status.backend.state === 'ready',
      desc: `Uptime: ${formatUptime(status.backend.uptime_seconds)}`,
      detail: `v${status.backend.version}`,
    },
    {
      title: 'Camera Pipeline',
      icon: Camera,
      state: status.camera.state,
      isOk: status.camera.state === 'connected',
      desc: status.camera.fps !== null ? `${status.camera.fps.toFixed(1)} FPS` : 'No active stream',
      detail: status.camera.last_frame_at ? formatTime(status.camera.last_frame_at) : 'No frames',
    },
    {
      title: 'Inference Engine',
      icon: Activity,
      state: status.model.state,
      isOk: status.model.state === 'ready',
      desc: status.model.name || 'Not configured',
      detail: status.model.state === 'not_configured' ? 'Awaiting weights' : status.model.state,
    },
    {
      title: 'Arduino Link',
      icon: Cable,
      state: status.arduino.state,
      isOk: status.arduino.state === 'connected',
      desc: status.arduino.port || 'Auto-scan',
      detail: status.arduino.firmware_version || 'Not connected',
    },
    {
      title: 'SQLite Database',
      icon: Database,
      state: status.database.state,
      isOk: status.database.state === 'ready',
      desc: 'WAL Mode Active',
      detail: status.database.error ? 'Error' : 'Normal',
    },
    {
      title: 'Active Mode',
      icon: Sliders,
      state: status.mode,
      isOk: status.mode === 'live',
      desc: status.mode.toUpperCase(),
      detail: status.replay.active ? 'Replay Active' : 'Live Field Inspection',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-emerald-400" />
        <h2 className="text-xs font-bold uppercase font-mono tracking-wider text-slate-400">
          Subsystem Diagnostics Grid
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {items.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="glass-panel glass-panel-hover rounded-xl p-3.5 space-y-2 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <Icon className={`w-4 h-4 ${item.isOk ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span
                  className={`w-2 h-2 rounded-full ${
                    item.isOk ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-slate-600'
                  }`}
                />
              </div>

              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 truncate">
                  {item.title}
                </p>
                <p className="text-xs font-bold font-mono text-slate-200 mt-0.5 truncate">
                  {item.desc}
                </p>
              </div>

              <div className="text-[10px] font-mono text-slate-500 border-t border-slate-800/80 pt-1.5 truncate">
                {item.detail}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
