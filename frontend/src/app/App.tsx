import { useState, useEffect } from 'react';
import { ModernTopBar } from '../components/layout/ModernTopBar';
import { ModernLeftRail, ModernBottomTabs, MainNavPage } from '../components/layout/ModernNavigation';
import { ModernBanners } from '../components/layout/ModernBanners';
import { DeviceStatusGrid } from '../components/status/DeviceStatusGrid';
import { CameraConnectionForm } from '../components/camera/CameraConnectionForm';
import { ProcessedVideoPanel } from '../components/camera/ProcessedVideoPanel';
import { ConnectCameraSheet } from '../components/camera/ConnectCameraSheet';
import { LatestDetectionCard } from '../components/detections/LatestDetectionCard';
import { DetectionHistoryTable } from '../components/detections/DetectionHistoryTable';
import { SystemEventsPanel } from '../components/events/SystemEventsPanel';
import { PinUnlockDialog } from '../components/controls/PinUnlockDialog';
import { RoverControlPanel } from '../components/controls/RoverControlPanel';
import { ReplayControlPanel } from '../components/controls/ReplayControlPanel';
import { MockScenarioSelector } from '../components/dev/MockScenarioSelector';
import { UiKit } from '../components/dev/UiKit';
import { useSystemStatus } from '../hooks/useSystemStatus';
import { useLatestDetection } from '../hooks/useLatestDetection';
import { useAuth } from '../hooks/useAuth';
import type { ModeBadge } from '../components/layout/AppHeader';
import { STRINGS } from '../lib/strings';

const IS_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// ─── Clock difference helper ──────────────────────────────────────────────────
function getClockDiff(statusTimestamp: string | null): {
  warning: null | 'soft' | 'strong';
  diffMinutes: number;
} {
  if (!statusTimestamp) return { warning: null, diffMinutes: 0 };
  const diff = Math.abs(Date.now() - new Date(statusTimestamp).getTime()) / 1000 / 60;
  if (diff > 2) return { warning: 'strong', diffMinutes: Math.round(diff) };
  return { warning: null, diffMinutes: 0 };
}

// ─── App ──────────────────────────────────────────────────────────────────────
export function App() {
  const isUiKit = window.location.hash === '#/ui-kit';
  
  // Theme state synced with data-theme attribute
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const stored = localStorage.getItem('agri_rover_theme');
      if (stored === 'light' || stored === 'dark') return stored;
    } catch {
      // Fallback
    }
    return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('agri_rover_theme', theme);
    } catch {
      // Ignore storage errors
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // 3-page navigation: drive, history, system
  const [currentPage, setCurrentPage] = useState<MainNavPage>(() => {
    const hash = window.location.hash;
    if (hash === '#/history') return 'history';
    if (hash === '#/system') return 'system';
    return 'drive';
  });

  const handlePageChange = (page: MainNavPage) => {
    setCurrentPage(page);
    window.location.hash = `#/${page}`;
  };

  const { status, isOffline, error: statusError, refresh } = useSystemStatus();
  const { detection: latestDetection } = useLatestDetection(status?.camera?.state);
  const { lock } = useAuth();
  const [showPinModal, setShowPinModal] = useState(false);
  const [showCameraSheet, setShowCameraSheet] = useState(false);

  if (isUiKit) {
    return <UiKit />;
  }

  // ─── Derived state ──────────────────────────────────────────────────────────
  const isReplayActive =
    status?.mode === 'replay' || status?.replay?.active === true;

  const clockCheck = getClockDiff(status?.timestamp ?? null);
  const clockWarning: null | 'soft' | 'strong' =
    status?.clock?.ntp_synchronized === false
      ? clockCheck.warning === 'strong'
        ? 'strong'
        : 'soft'
      : clockCheck.warning;

  // Mode badge logic
  let modeBadge: ModeBadge = 'OFFLINE';
  if (IS_MOCK) {
    modeBadge = isOffline ? 'OFFLINE' : 'MOCK';
  } else if (isOffline || !status) {
    modeBadge = 'OFFLINE';
  } else if (isReplayActive) {
    modeBadge = 'REPLAY';
  } else {
    modeBadge = 'LIVE';
  }

  const cameraState = status?.camera?.state ?? 'disconnected';
  const roverControl = status?.rover?.control ?? 'unavailable';
  const isOperatorUnlocked = status?.rover?.is_unlocked ?? (roverControl === 'ready');
  const roverReason = status?.rover?.reason ?? null;
  const lastCommand = status?.rover?.last_command ?? null;
  const lastCommandAt = status?.rover?.last_command_at ?? null;
  const fps = status?.camera?.fps ?? null;
  const lastFrameAt = status?.camera?.last_frame_at ?? null;
  const cameraError = status?.camera?.error ?? null;
  const modelState = status?.model?.state ?? 'not_configured';
  const modelError = status?.model?.error ?? null;
  const arduinoState = status?.arduino?.state ?? 'disconnected';
  const mode = status?.mode ?? 'live';
  const replayAvailable = status?.replay?.available ?? false;

  const handleToggleLock = async () => {
    if (isOperatorUnlocked) {
      try {
        await lock();
        void refresh();
      } catch {
        // error handled
      }
    } else {
      setShowPinModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col font-sans antialiased pb-16 md:pb-0">
      {/* Dev-only Mock Scenario Selector */}
      {IS_MOCK && (
        <MockScenarioSelector onScenarioChange={() => void refresh()} />
      )}

      {/* Global persistent status banners */}
      <ModernBanners
        isMockActive={IS_MOCK}
        isBackendOffline={isOffline}
        isReplayActive={isReplayActive}
        clockWarning={clockWarning}
        clockDiffMinutes={clockCheck.diffMinutes}
      />

      {/* Persistent modern top bar */}
      <ModernTopBar
        modeBadge={modeBadge}
        theme={theme}
        onToggleTheme={toggleTheme}
        isUnlocked={isOperatorUnlocked}
        onToggleLock={handleToggleLock}
        cameraState={cameraState}
        modelState={modelState}
        arduinoState={arduinoState}
        roverControl={roverControl}
      />

      {/* Main App Body with Rail (Desktop) & Bottom Navigation (Mobile) */}
      <div className="flex-1 flex min-w-0">
        <ModernLeftRail currentPage={currentPage} onPageChange={handlePageChange} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
          {statusError && !isOffline && (
            <div
              role="status"
              className="p-3 bg-warn/10 border border-warn/30 text-warn text-xs rounded-input flex items-center justify-between"
            >
              <span>Temporary status check failure: {statusError.message}</span>
              <button
                onClick={() => void refresh()}
                className="text-xs bg-warn/20 hover:bg-warn/30 px-2.5 py-1 rounded-input font-medium border border-warn/40 text-warn"
              >
                Retry
              </button>
            </div>
          )}

          {/* PAGE 1: DRIVE (Video + Controls Combined) */}
          {currentPage === 'drive' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left (7 cols): Primary Video Stage & Camera Form */}
                <div className="lg:col-span-7 space-y-6">
                  <ProcessedVideoPanel
                    cameraState={cameraState}
                    mode={mode}
                    isOffline={isOffline}
                    lastFrameAt={lastFrameAt}
                    fps={fps}
                    onOpenConnectSheet={() => setShowCameraSheet(true)}
                  />

                  <CameraConnectionForm
                    cameraState={cameraState}
                    roverControl={isOperatorUnlocked ? 'ready' : roverControl}
                    fps={fps}
                    lastFrameAt={lastFrameAt}
                    error={cameraError}
                    isOffline={isOffline}
                    onRefreshStatus={() => void refresh()}
                  />
                </div>

                {/* Right (5 cols): Drive Pad, STOP, and Latest Detection */}
                <div className="lg:col-span-5 space-y-6">
                  <RoverControlPanel
                    roverControl={roverControl}
                    roverReason={roverReason}
                    mode={mode}
                    isOffline={isOffline}
                    lastCommand={lastCommand}
                    lastCommandAt={lastCommandAt}
                    onCommandDispatched={() => void refresh()}
                  />

                  <LatestDetectionCard
                    detection={latestDetection}
                    modelState={modelState}
                    modelError={modelError}
                  />
                </div>
              </div>
            </div>
          )}

          {/* PAGE 2: HISTORY (Detections database, filters & pagination) */}
          {currentPage === 'history' && (
            <div className="max-w-6xl mx-auto space-y-6">
              <DetectionHistoryTable />
            </div>
          )}

          {/* PAGE 3: SYSTEM (Diagnostics, Replay & Events) */}
          {currentPage === 'system' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="p-4 rounded-card bg-surface-1 border border-border flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-text">{STRINGS.system.title}</h2>
                  <p className="text-xs text-text-muted mt-0.5">
                    {cameraState === 'error' || arduinoState === 'error' || modelState === 'error'
                      ? STRINGS.system.attentionSummary(1)
                      : STRINGS.system.healthySummary}
                  </p>
                </div>
              </div>

              {/* Hardware diagnostics grid */}
              <DeviceStatusGrid status={status} isOffline={isOffline} />

              {/* Replay control */}
              <ReplayControlPanel
                mode={mode}
                replayAvailable={replayAvailable}
                replayActive={isReplayActive}
                cameraState={cameraState}
                roverControl={roverControl}
                isOffline={isOffline}
                onRefreshStatus={() => void refresh()}
              />

              {/* System Events log */}
              <SystemEventsPanel />
            </div>
          )}
        </main>
      </div>

      {/* Floating PIN Unlock Modal when operator clicks Locked button */}
      {showPinModal && !isOperatorUnlocked && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm">
            <PinUnlockDialog
              roverControl={roverControl}
              isOffline={isOffline}
              onSuccess={() => {
                setShowPinModal(false);
                void refresh();
              }}
            />
            <div className="text-center mt-3">
              <button
                onClick={() => setShowPinModal(false)}
                className="text-xs text-text-muted hover:text-text underline"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connect Camera Sheet Modal */}
      <ConnectCameraSheet
        isOpen={showCameraSheet}
        onClose={() => setShowCameraSheet(false)}
        cameraState={cameraState}
        roverControl={roverControl}
        isUnlocked={isOperatorUnlocked}
        onUnlockRequest={() => setShowPinModal(true)}
        onSuccess={() => void refresh()}
        error={cameraError}
      />

      {/* Mobile Bottom Navigation Bar */}
      <ModernBottomTabs currentPage={currentPage} onPageChange={handlePageChange} />
    </div>
  );
}

export default App;
