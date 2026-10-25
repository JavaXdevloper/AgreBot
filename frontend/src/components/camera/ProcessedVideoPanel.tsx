import { useState } from 'react';
import { RefreshCw, VideoOff, WifiOff, AlertTriangle, Film, Radio } from 'lucide-react';
import { ENDPOINTS } from '../../lib/api/endpoints';
import type { CameraState, Mode } from '../../lib/api/types';

export interface ProcessedVideoPanelProps {
  cameraState: CameraState;
  mode: Mode;
  isOffline: boolean;
  lastFrameAt: string | null;
}

export function ProcessedVideoPanel({
  cameraState,
  mode,
  isOffline,
  lastFrameAt,
}: ProcessedVideoPanelProps) {
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [imgError, setImgError] = useState(false);

  const isConnected = cameraState === 'connected';
  const isStale = cameraState === 'stale';
  const shouldMountStream = (isConnected || isStale) && !isOffline;

  const handleReload = () => {
    setImgError(false);
    setReloadKey((k) => k + 1);
  };

  const streamSrc = `${ENDPOINTS.VIDEO_STREAM}?t=${reloadKey}`;

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden group">
      {/* Panel Top HUD */}
      <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <h2 className="text-sm font-bold tracking-wide text-slate-100 uppercase font-mono flex items-center gap-2">
            Primary Optical Feed
          </h2>
          {mode === 'replay' && (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              REPLAY STREAM
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReload}
            disabled={!shouldMountStream}
            className="px-3 py-1.5 text-xs bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white font-medium rounded-lg border border-slate-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            title="Reload video stream"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh Feed</span>
          </button>
        </div>
      </div>

      {/* Main Stream Screen */}
      <div className="relative w-full aspect-video bg-[#070a10] rounded-xl overflow-hidden flex items-center justify-center border border-slate-800 shadow-inner">
        {shouldMountStream && !imgError ? (
          <>
            <img
              src={streamSrc}
              alt="Processed rover camera stream"
              className="w-full h-full object-contain"
              onError={() => setImgError(true)}
            />

            {/* Subtle Crosshair Grid & HUD Overlay */}
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 text-[11px] font-mono text-emerald-400/70 select-none">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded border border-white/5">
                  <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                  LIVE ANNOTATED MJPEG
                </span>
                <span className="bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded border border-white/5">
                  FOV: CENTERED
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded">
                  MODEL OVERLAY: ACTIVE
                </span>
                <span className="bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded">
                  TARGET: 640x480
                </span>
              </div>
            </div>

            {/* STALE Banner Overlay */}
            {isStale && (
              <div
                role="alert"
                className="absolute inset-0 bg-black/75 backdrop-blur-[3px] flex flex-col items-center justify-center p-4 text-center text-amber-300"
              >
                <AlertTriangle className="w-12 h-12 mb-2 text-amber-400 animate-bounce" />
                <p className="font-mono font-bold text-lg tracking-wider">STALE STREAM</p>
                <p className="text-xs text-amber-200/80 mt-1">
                  {lastFrameAt ? 'Frames delayed — STALE' : 'No new frames received — STALE'}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-3">
            {isOffline ? (
              <>
                <WifiOff className="w-12 h-12 text-slate-600 animate-pulse" />
                <div>
                  <p className="font-semibold text-slate-300 text-sm">Telemetry Disconnected</p>
                  <p className="text-xs text-slate-500 mt-0.5">Awaiting local backend communication link</p>
                </div>
              </>
            ) : mode === 'replay' && cameraState === 'disconnected' ? (
              <>
                <Film className="w-12 h-12 text-amber-500/80" />
                <div>
                  <p className="font-semibold text-slate-300 text-sm">Diagnostic Replay Ready</p>
                  <p className="text-xs text-slate-500 mt-0.5">Select 'Start Prerecorded Replay' to simulate camera feed</p>
                </div>
              </>
            ) : cameraState === 'connecting' ? (
              <>
                <RefreshCw className="w-12 h-12 text-emerald-500 animate-spin" />
                <div>
                  <p className="font-semibold text-slate-300 text-sm">Locking Camera Stream...</p>
                  <p className="text-xs text-slate-500 mt-0.5">Negotiating RTSP / HTTP connection handshake</p>
                </div>
              </>
            ) : imgError ? (
              <>
                <VideoOff className="w-12 h-12 text-rose-500/80" />
                <div>
                  <p className="font-semibold text-slate-300 text-sm">Stream Render Failed</p>
                  <p className="text-xs text-slate-500 mt-0.5">Could not process multipart video frames</p>
                </div>
                <button
                  onClick={handleReload}
                  className="mt-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-1.5 rounded-lg border border-slate-700 transition"
                >
                  Retry Stream
                </button>
              </>
            ) : (
              <>
                <VideoOff className="w-12 h-12 text-slate-700" />
                <div>
                  <p className="font-semibold text-slate-300 text-sm">Camera Not Connected</p>
                  <p className="text-xs text-slate-500 mt-0.5">Enter IP Webcam stream URL and click Connect</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Feed Metadata Footer */}
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-3 px-1">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Annotation Pipeline: Server Bound (D-02)
        </span>
        <span className="text-slate-500">Auto-scaled aspect ratio</span>
      </div>
    </div>
  );
}
