import type { SystemStatus } from '../types';

const NOW = new Date().toISOString();

/** Base status — everything in a nominal but minimal state */
const BASE_STATUS: SystemStatus = {
  timestamp: NOW,
  contract_version: '1.0',
  mode: 'live',
  backend: {
    state: 'ready',
    uptime_seconds: 0,
    version: 'mock-1.0.0',
  },
  clock: {
    ntp_synchronized: true,
  },
  camera: {
    state: 'disconnected',
    source: 'none',
    last_frame_at: null,
    fps: null,
    error: null,
  },
  model: {
    state: 'not_configured',
    name: null,
    error: null,
  },
  arduino: {
    state: 'disconnected',
    port: null,
    last_seen_at: null,
    firmware_version: null,
    error: null,
  },
  rover: {
    control: 'unavailable',
    reason: 'ARDUINO_DISCONNECTED',
    last_command: null,
    last_command_at: null,
    command_timeout_ms: 500,
  },
  replay: {
    available: false,
    active: false,
  },
  database: {
    state: 'ready',
    error: null,
  },
  session: {
    id: null,
    started_at: null,
  },
  sensors: {
    available: false,
    items: [],
  },
};

type Scenario = Partial<SystemStatus> | null;

export const MOCK_SCENARIOS: Record<string, Scenario> = {
  /** Everything nominal */
  default: {},

  /** Camera is attempting to connect */
  camera_connecting: {
    camera: {
      state: 'connecting',
      source: 'phone',
      last_frame_at: null,
      fps: null,
      error: null,
    },
  },

  /** Camera connected and streaming */
  camera_connected: {
    camera: {
      state: 'connected',
      source: 'phone',
      last_frame_at: new Date().toISOString(),
      fps: 15,
      error: null,
    },
  },

  /** Camera was connected but frames stopped arriving */
  camera_stale: {
    camera: {
      state: 'stale',
      source: 'phone',
      last_frame_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      fps: null,
      error: null,
    },
  },

  /** Camera encountered an error */
  camera_error: {
    camera: {
      state: 'error',
      source: 'phone',
      last_frame_at: null,
      fps: null,
      error: { code: 'CAMERA_UNREACHABLE', message: 'Could not reach the camera stream URL.' },
    },
  },

  /** Model is loaded and ready for inference */
  model_ready: {
    model: {
      state: 'ready',
      name: 'mock-model',
      error: null,
    },
  },

  /** Model is currently loading */
  model_loading: {
    model: {
      state: 'loading',
      name: null,
      error: null,
    },
  },

  /** Model encountered an error */
  model_error: {
    model: {
      state: 'error',
      name: null,
      error: { code: 'MODEL_LOAD_FAILED', message: 'Failed to load model weights from disk.' },
    },
  },

  /** Arduino connected but controls locked */
  arduino_connected: {
    arduino: {
      state: 'connected',
      port: '/dev/ttyUSB0',
      last_seen_at: new Date().toISOString(),
      firmware_version: 'mock-fw-1.0',
      error: null,
    },
    rover: {
      control: 'locked',
      reason: null,
      last_command: null,
      last_command_at: null,
      command_timeout_ms: 500,
    },
  },

  /** Arduino connected, controls unlocked and ready */
  rover_ready: {
    arduino: {
      state: 'connected',
      port: '/dev/ttyUSB0',
      last_seen_at: new Date().toISOString(),
      firmware_version: 'mock-fw-1.0',
      error: null,
    },
    rover: {
      control: 'ready',
      reason: null,
      last_command: 'stop',
      last_command_at: new Date().toISOString(),
      command_timeout_ms: 500,
    },
  },

  /** Rover controls unavailable because Arduino is disconnected */
  rover_unavailable: {
    rover: {
      control: 'unavailable',
      reason: 'ARDUINO_DISCONNECTED',
      last_command: null,
      last_command_at: null,
      command_timeout_ms: 500,
    },
  },

  /** System is replaying a prerecorded video */
  replay_active: {
    mode: 'replay',
    camera: {
      state: 'connected',
      source: 'replay',
      last_frame_at: new Date().toISOString(),
      fps: 10,
      error: null,
    },
    replay: {
      available: true,
      active: true,
    },
  },

  /**
   * Special sentinel — signals the mock client to throw a network error.
   * Set to null so the client can detect it.
   */
  backend_offline: null,

  /** Pi clock is not NTP-synced and its timestamp is 5 minutes in the past */
  clock_desync: {
    clock: { ntp_synchronized: false },
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },

  /** Database is in an error state */
  db_error: {
    database: {
      state: 'error',
      error: { code: 'DB_WRITE_FAILED', message: 'SQLite database is not writable.' },
    },
  },
};

/** Helper — merge a scenario's partial fields over the base status. */
export function buildStatus(scenario: Partial<SystemStatus>): SystemStatus {
  // Deep-merge top-level objects only (sufficient for the flat shape of SystemStatus)
  return Object.keys(BASE_STATUS).reduce<SystemStatus>((acc, key) => {
    const k = key as keyof SystemStatus;
    const base = BASE_STATUS[k];
    const override = scenario[k];
    if (override !== undefined && typeof base === 'object' && base !== null && !Array.isArray(base)) {
      // @ts-expect-error – dynamic merge
      acc[k] = { ...base, ...(override as object) };
    } else if (override !== undefined) {
      // @ts-expect-error – dynamic assignment
      acc[k] = override;
    } else {
      // @ts-expect-error – dynamic assignment
      acc[k] = base;
    }
    return acc;
  }, {} as SystemStatus);
}
