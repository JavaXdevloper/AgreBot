import { ShieldAlert, Clock, Sparkles, Activity } from 'lucide-react';
import { formatConfidence, formatAge, formatTime } from '../../lib/formatters';
import type { LatestDetection, ModelState, ComponentError } from '../../lib/api/types';

export interface LatestDetectionCardProps {
  detection: LatestDetection | null;
  modelState: ModelState;
  modelError: ComponentError | null;
}

export function LatestDetectionCard({
  detection,
  modelState,
  modelError,
}: LatestDetectionCardProps) {
  const isModelReady = modelState === 'ready';
  const isOlder = detection ? detection.age_seconds > 10 : false;

  let modelNote: string | null = null;
  if (modelState === 'not_configured') {
    modelNote = 'Inference disabled — no model weights configured on backend.';
  } else if (modelState === 'loading') {
    modelNote = 'Model is currently loading weights...';
  } else if (modelState === 'error') {
    modelNote = `Model failure: ${modelError?.message || 'Error running inference'}`;
  } else if (modelState === 'disabled') {
    modelNote = 'Model inference is disabled.';
  }

  return (
    <div
      className={`glass-panel rounded-2xl p-4 sm:p-5 shadow-2xl transition-all duration-200 space-y-4 ${
        isOlder ? 'opacity-70 border-slate-700/60' : 'border-slate-800'
      }`}
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles
            className={`w-4 h-4 ${isModelReady ? 'text-emerald-400' : 'text-slate-500'}`}
          />
          <h2 className="text-sm font-bold tracking-wide uppercase font-mono text-slate-100">
            Realtime AI Inference
          </h2>
        </div>
        {detection && (
          <div className="flex items-center gap-2">
            {isOlder && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                older
              </span>
            )}
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                detection.source_mode === 'replay'
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              }`}
            >
              {detection.source_mode.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {modelNote && (
        <div
          role="status"
          className="p-3 bg-slate-900/80 border border-slate-800 text-slate-300 text-xs rounded-xl flex items-center gap-2"
        >
          <ShieldAlert className="w-4 h-4 shrink-0 text-slate-400" />
          <span>{modelNote}</span>
        </div>
      )}

      {detection ? (
        <div className="space-y-4">
          <div className="flex items-baseline justify-between bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
                Target Detected
              </span>
              <span className="text-xl font-black font-mono tracking-tight text-white capitalize">
                {detection.label}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
                Probability
              </span>
              <span className="text-2xl font-mono font-black text-emerald-400">
                {formatConfidence(detection.confidence)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              {formatTime(detection.detected_at)} ({formatAge(detection.age_seconds)})
            </span>

            {!detection.persisted && (
              <span
                title="Suppressed by persistence cooldown policy"
                className="text-[10px] bg-amber-950/40 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30"
              >
                not saved: repeat within cooldown
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="py-6 flex flex-col items-center justify-center text-center text-slate-500 text-xs font-mono space-y-1">
          <Activity className="w-5 h-5 text-slate-600 mb-1 animate-pulse" />
          <span>No detection yet</span>
          <span className="text-[10px] text-slate-600">Awaiting target classifications</span>
        </div>
      )}
    </div>
  );
}
