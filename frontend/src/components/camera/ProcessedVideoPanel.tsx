import { useState, useRef } from 'react';
import { RefreshCw, VideoOff, WifiOff, AlertTriangle, Radio, Maximize2, Minimize2 } from 'lucide-react';
import { ENDPOINTS } from '../../lib/api/endpoints';
import type { CameraState, Mode } from '../../lib/api/types';
import { STRINGS } from '../../lib/strings';

export interface ProcessedVideoPanelProps {
  cameraState: CameraState;
  mode: Mode;
  isOffline: boolean;
  lastFrameAt: string | null;
  fps?: number | null;
  onOpenConnectSheet?: () => void;
}

export function ProcessedVideoPanel({
  cameraState,
  mode,
  isOffline,
  fps,
  onOpenConnectSheet,
}: ProcessedVideoPanelProps) {
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isConnected = cameraState === 'connected';
  const isStale = cameraState === 'stale';
  const shouldMountStream = (isConnected || isStale) && !isOffline;

  const handleReload = () => {
    setReloadKey((k) => k + 1);
  };

  const handleToggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // Fullscreen not supported
    }
  };

  const streamSrc = `${ENDPOINTS.VIDEO_STREAM}?t=${reloadKey}`;

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-card overflow-hidden bg-surface-1 border border-border shadow-sm flex flex-col ${
        mode === 'replay' ? 'ring-2 ring-replay' : ''
      }`}
    >
      {/* Panel Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-1 select-none">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-ok animate-pulse' : isStale ? 'bg-warn' : 'bg-text-muted'}`} />
          <h2 className="text-sm font-bold tracking-tight text-text">
            {STRINGS.drive.title} — Camera Feed
          </h2>
          {mode === 'replay' && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-pill bg-replay/20 text-replay border border-replay/30">
              REPLAY STREAM
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {fps !== null && fps !== undefined && fps > 0 && (
            <span className="text-xs font-mono text-text-muted hidden sm:inline">
              {STRINGS.camera.fpsLabel(fps)}
            </span>
          )}
          <button
            onClick={handleReload}
            aria-label="Refresh Feed"
            title="Reload video stream"
            disabled={!shouldMountStream}
            className="p-1.5 rounded-input bg-surface-2 hover:bg-surface-1 border border-border text-text-muted hover:text-text transition-colors disabled:opacity-40"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleToggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            title="Toggle fullscreen"
            className="p-1.5 rounded-input bg-surface-2 hover:bg-surface-1 border border-border text-text-muted hover:text-text transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 16:9 Video Canvas */}
      <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
        {isOffline ? (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-2 text-text-muted">
            <WifiOff className="w-10 h-10 text-danger stroke-[1.5]" />
            <p className="text-sm font-semibold text-text">Rover Offline</p>
            <p className="text-xs text-text-muted">Waiting for rover computer reconnection</p>
          </div>
        ) : !shouldMountStream ? (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 text-text-muted">
            <VideoOff className="w-10 h-10 text-text-muted stroke-[1.5]" />
            <div>
              <p className="text-sm font-semibold text-text">Camera Not Connected</p>
              <p className="text-xs text-text-muted mt-0.5">Connect your smartphone or USB webcam to stream</p>
            </div>
            {onOpenConnectSheet && (
              <button
                onClick={onOpenConnectSheet}
                className="px-4 py-2 bg-brand text-brand-foreground font-semibold text-xs rounded-input hover:opacity-90 transition-opacity shadow-sm"
              >
                {STRINGS.camera.connectButton}
              </button>
            )}
          </div>
        ) : (
          <>
            <img
              key={reloadKey}
              src={streamSrc}
              alt="Live camera view"
              className={`w-full h-full object-contain ${isStale ? 'opacity-40 filter grayscale-[50%]' : ''}`}
            />

            {/* STALE STREAM Alert Overlay */}
            {isStale && (
              <div
                role="alert"
                className="absolute inset-x-0 top-0 bg-warn/95 text-black px-4 py-2 flex items-center justify-center gap-2 text-xs font-bold shadow-md z-10"
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>STALE STREAM — No new frames received</span>
              </div>
            )}

            {/* Replay active badge */}
            {mode === 'replay' && (
              <div className="absolute bottom-3 left-3 bg-replay/90 text-white px-3 py-1 rounded-pill text-[11px] font-bold flex items-center gap-1.5 z-10 shadow-sm">
                <Radio className="w-3.5 h-3.5" />
                <span>REPLAY</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
