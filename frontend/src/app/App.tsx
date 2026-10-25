import { useState } from 'react';
import { AppHeader } from '../components/layout/AppHeader';
import { Banners } from '../components/layout/Banners';
import { NavigationSidebar, NavTab } from '../components/layout/NavigationSidebar';
import { DeviceStatusGrid } from '../components/status/DeviceStatusGrid';
import { CameraConnectionForm } from '../components/camera/CameraConnectionForm';
import { ProcessedVideoPanel } from '../components/camera/ProcessedVideoPanel';
import { LatestDetectionCard } from '../components/detections/LatestDetectionCard';
import { DetectionHistoryTable } from '../components/detections/DetectionHistoryTable';
import { SystemEventsPanel } from '../components/events/SystemEventsPanel';
import { PinUnlockDialog } from '../components/controls/PinUnlockDialog';
import { RoverControlPanel } from '../components/controls/RoverControlPanel';
import { ReplayControlPanel } from '../components/controls/ReplayControlPanel';
import { MockScenarioSelector } from '../components/dev/MockScenarioSelector';
import { useSystemStatus } from '../hooks/useSystemStatus';
import { useLatestDetection } from '../hooks/useLatestDetection';
import type { ModeBadge } from '../components/layout/AppHeader';

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
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const { status, isOffline, lastUpdated, error: statusError, refresh } = useSystemStatus();
  const { detection: latestDetection } = useLatestDetection(status?.camera?.state);

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
  const mode = status?.mode ?? 'live';
  const replayAvailable = status?.replay?.available ?? false;

  return (
    <div className="min-h-screen bg-[#070a10] text-slate-100 flex flex-col md:flex-row font-sans antialiased">
      {/* Navigation Sidebar */}
      <NavigationSidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        modeBadge={modeBadge}
        lastUpdated={lastUpdated}
        roverControl={roverControl}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Dev-only Mock Scenario Selector */}
        {IS_MOCK && (
          <MockScenarioSelector onScenarioChange={() => void refresh()} />
        )}

        {/* Global persistent banners */}
        <Banners
          isMockActive={IS_MOCK}
          isBackendOffline={isOffline}
          isReplayActive={isReplayActive}
          clockWarning={clockWarning}
          clockDiffMinutes={clockCheck.diffMinutes}
        />

        {/* Header */}
        <AppHeader
          modeBadge={modeBadge}
          lastUpdated={lastUpdated}
          isMockActive={IS_MOCK}
        />

        {/* Page Views based on Active Tab */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
          {statusError && !isOffline && (
            <div
              role="status"
              className="p-3 bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs rounded-xl flex items-center justify-between"
            >
              <span>Temporary status check failure: {statusError.message}</span>
              <button
                onClick={() => void refresh()}
                className="text-[11px] bg-amber-900/60 hover:bg-amber-900 px-2.5 py-1 rounded font-mono border border-amber-700 text-amber-200"
              >
                Retry
              </button>
            </div>
          )}

          {/* TAB 1: LIVE COCKPIT (Main Dashboard) */}
          {currentTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 2 Cols: Optical Video Stream */}
                <div className="lg:col-span-2 space-y-6">
                  <ProcessedVideoPanel
                    cameraState={cameraState}
                    mode={mode}
                    isOffline={isOffline}
                    lastFrameAt={lastFrameAt}
                  />
                </div>

                {/* 1 Col: Quick Auth & Realtime Detection Snapshot */}
                <div className="space-y-6">
                  <LatestDetectionCard
                    detection={latestDetection}
                    modelState={modelState}
                    modelError={modelError}
                  />

                  <PinUnlockDialog
                    roverControl={isOperatorUnlocked ? 'ready' : roverControl}
                    isOffline={isOffline}
                    onSuccess={() => void refresh()}
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
              </div>

              {/* System Diagnostics Grid */}
              <section aria-labelledby="status-heading">
                <DeviceStatusGrid status={status} isOffline={isOffline} />
              </section>
            </div>
          )}

          {/* TAB 2: ROVER DRIVE PAD & CONTROLS */}
          {currentTab === 'controls' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <RoverControlPanel
                  roverControl={roverControl}
                  roverReason={roverReason}
                  mode={mode}
                  isOffline={isOffline}
                  lastCommand={lastCommand}
                  lastCommandAt={lastCommandAt}
                  onCommandDispatched={() => void refresh()}
                />

                <div className="space-y-6">
                  <PinUnlockDialog
                    roverControl={roverControl}
                    isOffline={isOffline}
                    onSuccess={() => void refresh()}
                  />

                  <div className="glass-panel rounded-2xl p-5 shadow-2xl space-y-3">
                    <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-slate-300">
                      Drive Safety Rules (D-01)
                    </h3>
                    <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside">
                      <li>Hold-to-drive continuous heartbeat pulse (200 ms).</li>
                      <li>Releasing the button or losing focus sends emergency STOP.</li>
                      <li>Single active direction constraint: no simultaneous turning/reversing.</li>
                      <li>Emergency STOP button and Space/Esc keys bypass all locks.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DETECTION LOGS & HISTORY */}
          {currentTab === 'history' && (
            <div className="space-y-6">
              <DetectionHistoryTable />
            </div>
          )}

          {/* TAB 4: DIAGNOSTICS & REPLAY */}
          {currentTab === 'replay' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <ReplayControlPanel
                mode={mode}
                replayAvailable={replayAvailable}
                replayActive={isReplayActive}
                cameraState={cameraState}
                roverControl={roverControl}
                isOffline={isOffline}
                onRefreshStatus={() => void refresh()}
              />

              <DeviceStatusGrid status={status} isOffline={isOffline} />
            </div>
          )}

          {/* TAB 5: SYSTEM EVENTS */}
          {currentTab === 'events' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <SystemEventsPanel />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
