/**
 * strings.ts - Central plain-English UI copy dictionary according to 09_UI_REDESIGN_SPEC.md.
 * 
 * Rules:
 * - Plain words, friendly tone, no jargon or internal IDs (BE-x, D-01, etc.).
 * - Keep all user-facing text here to simplify future localisation.
 */

export const STRINGS = {
  app: {
    title: 'Agri Rover',
    tagline: 'Field Inspection Rover',
  },
  nav: {
    drive: 'Drive',
    history: 'History',
    system: 'System',
    uiKit: 'UI Kit',
  },
  modes: {
    live: 'LIVE',
    replay: 'REPLAY',
    mock: 'MOCK',
    offline: 'OFFLINE',
    liveTooltip: 'Live camera view',
    replayTooltip: 'Playing recorded video',
    mockTooltip: 'Using mock test data',
    offlineTooltip: 'Rover computer unreachable',
  },
  banners: {
    mock: 'MOCK TEST DATA ACTIVE — This is simulated test data, not a live rover.',
    replay: 'REPLAY ACTIVE — Showing recorded test video. Live rover motor control is disabled.',
    offline: 'ROVER COMPUTER UNREACHABLE — Check your Wi-Fi or network connection to the rover.',
    clockSoft: (diffMin: number) =>
      `Warning: Browser clock differs from rover clock by ~${diffMin} minutes. Detection timestamps may look offset.`,
    clockStrong: (diffMin: number) =>
      `Caution: Rover clock is unsynchronized (~${diffMin} min difference). Timestamps and session recordings may be inaccurate.`,
  },
  chips: {
    camera: {
      live: 'Camera · Live',
      connecting: 'Camera · Connecting…',
      stale: 'Camera · Stale',
      disconnected: 'Camera · Off',
      error: 'Camera · Error',
    },
    model: {
      ready: 'Model · Ready',
      loading: 'Model · Loading…',
      notConfigured: 'Model · Not set up',
      error: 'Model · Error',
      disabled: 'Model · Off',
    },
    rover: {
      ready: 'Rover · Ready',
      locked: 'Rover · Locked',
      searching: 'Rover · Searching…',
      disconnected: 'Rover · Not connected',
      error: 'Rover · Error',
    },
  },
  auth: {
    locked: 'Locked',
    unlocked: 'Unlocked',
    unlockTitle: 'Unlock controls',
    controlPin: 'Control PIN',
    enterPin: 'Enter PIN to unlock',
    unlockButton: 'Unlock',
    lockButton: 'Lock',
    wrongPin: 'Wrong PIN. Please try again.',
    tooManyAttempts: 'Too many tries — please wait 1 minute.',
    pinNotConfigured: 'No PIN is set up on the rover — ask the team.',
    pinRequired: 'Please enter your PIN.',
  },
  drive: {
    title: 'Drive',
    safetyNote: 'Test with wheels lifted first. Press STOP if anything unexpected happens.',
    pressAndHold: 'Press and hold to drive. Let go to stop.',
    stopAlwaysWorks: 'STOP always works.',
    awayStopsRover: 'Switching tabs or leaving the screen stops the rover.',
    stop: 'STOP',
    stopSent: 'Stop sent',
    stopFailed: 'STOP may not have reached the rover',
    sending: (dir: string) => `Sending: ${dir}`,
    roverNotConnected: 'Rover not connected — check the USB cable between the Pi and the Arduino.',
    unlockToDrive: 'Unlock to drive',
    readyToDrive: 'Ready — press and hold to drive',
    keyboardDrive: 'Keyboard drive',
    keyboardHelp: 'WASD or Arrow keys to steer, Space or Esc for STOP',
  },
  camera: {
    notConnected: 'No camera connected',
    connectButton: 'Connect camera',
    connecting: 'Connecting to the camera… (up to 15 s)',
    stale: (sec: number) => `No new frames for ${sec}s`,
    reconnect: 'Reconnect',
    disconnect: 'Disconnect',
    liveStream: 'Live camera view',
    fpsLabel: (fps: number) => `${fps.toFixed(1)} fps`,
  },
  history: {
    title: 'History',
    emptyTitle: 'No detections saved yet',
    emptyFiltered: 'No detections saved for these filters.',
    clearFilters: 'Clear filters',
    recordsCount: (count: number) => `${count} detection${count === 1 ? '' : 's'}`,
    savedTag: 'Saved',
    notSavedTag: 'Repeat (not saved)',
  },
  system: {
    title: 'System',
    healthySummary: 'Everything is working normally.',
    attentionSummary: (count: number) => `${count} item${count === 1 ? '' : 's'} need${count === 1 ? 's' : ''} attention.`,
    backend: 'Rover computer',
    database: 'Saved data',
    databaseOk: 'Detections are being saved',
    events: 'Recent events',
    noEvents: 'No events logged yet.',
    replayTitle: 'Replay (recorded video)',
    noReplayVideo: 'No replay video is set up yet',
  },
};
