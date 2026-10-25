export type Mode = 'live' | 'replay';
export type CameraState = 'disconnected' | 'connecting' | 'connected' | 'stale' | 'error';
export type ModelState = 'not_configured' | 'loading' | 'ready' | 'error' | 'disabled';
export type ArduinoState = 'disconnected' | 'connecting' | 'connected' | 'error';
export type RoverControl = 'unavailable' | 'locked' | 'ready';
export type RoverCommand = 'forward' | 'backward' | 'left' | 'right' | 'stop';

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}
export interface ComponentError {
  code: string;
  message: string;
}

export interface Bbox {
  x: number;
  y: number;
  width: number;
  height: number;
  unit: 'px';
}

export interface Detection {
  id: string;
  session_id: string | null;
  detected_at: string;
  label: string;
  confidence: number;
  class_id: number | null;
  bbox: Bbox | null;
  source_mode: Mode;
}

export interface LatestDetection extends Detection {
  persisted: boolean;
  age_seconds: number;
}

export interface SystemStatus {
  timestamp: string;
  contract_version: string;
  mode: Mode;
  backend: {
    state: 'starting' | 'ready' | 'error';
    uptime_seconds: number;
    version: string;
  };
  clock: {
    ntp_synchronized: boolean | null;
  };
  camera: {
    state: CameraState;
    source: 'none' | 'phone' | 'replay';
    last_frame_at: string | null;
    fps: number | null;
    error: ComponentError | null;
  };
  model: {
    state: ModelState;
    name: string | null;
    error: ComponentError | null;
  };
  arduino: {
    state: ArduinoState;
    port: string | null;
    last_seen_at: string | null;
    firmware_version: string | null;
    error: ComponentError | null;
  };
  rover: {
    control: RoverControl;
    reason: string | null;
    is_unlocked?: boolean;
    last_command: RoverCommand | null;
    last_command_at: string | null;
    command_timeout_ms: number;
  };
  replay: {
    available: boolean;
    active: boolean;
  };
  database: {
    state: 'ready' | 'error';
    error: ComponentError | null;
  };
  session: {
    id: string | null;
    started_at: string | null;
  };
  sensors: {
    available: boolean;
    items: unknown[];
  };
}

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface SystemEvent {
  id: string;
  occurred_at: string;
  severity: 'info' | 'warning' | 'error';
  component: string;
  message: string;
}
