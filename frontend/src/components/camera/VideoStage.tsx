import { useState, useRef } from 'react';
import { Camera, RefreshCw, Maximize2, Minimize2, VideoOff, WifiOff, AlertTriangle, Radio, Loader2 } from 'lucide-react';
import { ENDPOINTS } from '../../lib/api/endpoints';
import type { CameraState, Mode } from '../../lib/api/types';
import { STRINGS } from '../../lib/strings';

export interface VideoStageProps {
  cameraState: CameraState;
  mode: Mode;
  isOffline: boolean;
  fps: number | null;
  onConnectClick: () => void;
  onDisconnectClick?: () => void;
  onReloadClick?: () => void;
}

export function VideoStage({
  cameraState,
  mode,
  isOffline,
  fps,
  onConnectClick,
  onDisconnectClick,
  onReloadClick,
}: VideoStageProps) {
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isStale = cameraState === 'stale';
  const isConnecting = cameraState === 'connecting';
  const isError = cameraState === 'error';
  const isDisconnected = cameraState === 'disconnected';

  const handleManualReload = () => {
    setReloadKey((prev) => prev + 1);
    onReloadClick?.();
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
      // Fullscreen not supported or blocked
    }
  };

  const streamSrc = `${ENDPOINTS.VIDEO_STREAM}?t=${reloadKey}`;

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-card overflow-hidden bg-black border border-border aspect-video flex items-center justify-center select-none shadow-sm ${
        mode === 'replay' ? 'ring-2 ring-replay' : ''
      }`}
    >
      {/* ─── STATE 1: BACKEND OFFLINE ────────────────────────────────────────── */}
      {isOffline ? (
        <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 text-text-muted">
          <WifiOff className="w-10 h-10 text-danger stroke-[1.5]" />
          <div>
            <p className="text-sm font-semibold text-text">Can't reach the rover computer</p>
            <p className="text-xs text-text-muted mt-0.5">Check your connection to the rover Wi-Fi or LAN</p>
          </div>
        </div>
      ) : isConnecting ? (
        /* ─── STATE 2: CONNECTING ────────────────────────────────────────────── */
        <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
          <Loader2 className="w-10 h-10 text-brand animate-spin stroke-[1.5]" />
          <div>
            <p className="text-sm font-semibold text-text">{STRINGS.camera.connecting}</p>
            <p className="text-xs text-text-muted mt-0.5">Establishing video stream pipeline</p>
          </div>
          {onDisconnectClick && (
            <button
              onClick={onDisconnectClick}
              className="px-3.5 py-1.5 rounded-input bg-surface-2 hover:bg-surface-1 border border-border text-xs text-text-muted hover:text-text transition-colors mt-2"
            >
              Cancel
            </button>
          )}
        </div>
      ) : isError ? (
        /* ─── STATE 3: CAMERA ERROR ─────────────────────────────────────────── */
        <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 max-w-sm">
          <VideoOff className="w-10 h-10 text-danger stroke-[1.5]" />
          <div>
            <p className="text-sm font-semibold text-text">Failed to stream video</p>
            <p className="text-xs text-text-muted mt-1">
              Ensure your phone is on the same network or hotspot, and IP Webcam is running with no password.
            </p>
          </div>
          <button
            onClick={onConnectClick}
            className="px-4 py-2 bg-brand text-brand-foreground font-semibold text-xs rounded-input hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        </div>
      ) : isDisconnected ? (
        /* ─── STATE 4: NOT CONNECTED ────────────────────────────────────────── */
        <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
          <Camera className="w-10 h-10 text-text-muted stroke-[1.5]" />
          <div>
            <p className="text-sm font-semibold text-text">{STRINGS.camera.notConnected}</p>
            <p className="text-xs text-text-muted mt-0.5">Connect a smartphone or laptop camera to start inspecting</p>
          </div>
          <button
            onClick={onConnectClick}
            className="px-4 py-2 bg-brand text-brand-foreground font-semibold text-xs rounded-input hover:opacity-90 transition-opacity shadow-sm"
          >
            {STRINGS.camera.connectButton}
          </button>
        </div>
      ) : (
        /* ─── STATE 5 & 6: CONNECTED / STALE (LIVE MJPEG STREAM) ─────────────── */
        <>
          <img
            key={reloadKey}
            src={streamSrc}
            alt="Live camera view"
            className={`w-full h-full object-contain ${isStale ? 'opacity-40 filter grayscale-[50%]' : ''}`}
          />

          {/* Stale frame warning banner */}
          {isStale && (
            <div className="absolute inset-x-0 top-0 bg-warn/90 text-black px-4 py-2 flex items-center justify-center gap-2 text-xs font-semibold backdrop-blur-sm z-10 shadow-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>STALE STREAM — No new frames received</span>
            </div>
          )}

          {/* Overlay top bar: source tag, fps, controls */}
          <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none z-10">
            <div className="flex items-center gap-2 pointer-events-auto">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-black/60 backdrop-blur-md text-ok text-[11px] font-semibold border border-white/10">
                <span className="w-2 h-2 rounded-full bg-ok animate-pulse" />
                {mode === 'replay' ? 'REPLAY' : 'LIVE'}
              </span>

              {fps !== null && fps > 0 && (
                <span className="px-2 py-0.5 rounded-pill bg-black/60 backdrop-blur-md text-text-muted text-[10px] font-mono border border-white/10">
                  {STRINGS.camera.fpsLabel(fps)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 pointer-events-auto">
              <button
                onClick={handleManualReload}
                aria-label="Reload video feed"
                className="p-2 rounded-input bg-black/60 hover:bg-black/80 backdrop-blur-md text-text-muted hover:text-text border border-white/10 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <button
                onClick={handleToggleFullscreen}
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                className="p-2 rounded-input bg-black/60 hover:bg-black/80 backdrop-blur-md text-text-muted hover:text-text border border-white/10 transition-colors"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Replay ribbon */}
          {mode === 'replay' && (
            <div className="absolute bottom-3 left-3 bg-replay/90 text-white px-3 py-1 rounded-pill text-[11px] font-bold flex items-center gap-1.5 z-10 shadow-sm">
              <Radio className="w-3.5 h-3.5" />
              <span>REPLAY (Recorded video)</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
