/**
 * Mock API client — only usable when VITE_USE_MOCK=true.
 *
 * All mock data is clearly labelled. No code here runs in production.
 */

import type {
  SystemStatus,
  LatestDetection,
  Detection,
  Page,
  SystemEvent,
  RoverControl,
  CameraState,
  Mode,
  RoverCommand,
} from '../types';
import { MOCK_SCENARIOS, buildStatus } from './scenarios';

// ─── Module-level state ────────────────────────────────────────────────────────

let currentScenario: string = 'default';
let mockUptimeSeconds: number = 120;

// ─── Scenario control ─────────────────────────────────────────────────────────

export function setMockScenario(name: string): void {
  currentScenario = name;
}

export function getMockScenario(): string {
  return currentScenario;
}

// ─── Mock client interface ────────────────────────────────────────────────────

export interface MockClient {
  getStatus(): Promise<SystemStatus>;
  getLatestDetection(): Promise<{ detection: LatestDetection | null }>;
  getDetections(params: Record<string, string>): Promise<Page<Detection>>;
  getDetectionLabels(): Promise<{ labels: string[] }>;
  getEvents(params: Record<string, string>): Promise<Page<SystemEvent>>;
  unlock(pin: string): Promise<{ ok: boolean; control: RoverControl }>;
  lock(): Promise<{ ok: boolean; control: RoverControl }>;
  connectCamera(url: string): Promise<{ ok: boolean; camera: { state: CameraState } }>;
  disconnectCamera(): Promise<{ ok: boolean; camera: { state: CameraState } }>;
  sendCommand(command: RoverCommand): Promise<{
    ok: boolean;
    command: RoverCommand;
    state: string;
    sent_at: string;
  }>;
  startReplay(): Promise<{ ok: boolean; camera: { state: CameraState }; mode: Mode }>;
  stopReplay(): Promise<{ ok: boolean; mode: Mode; camera: { state: CameraState } }>;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create a mock API client.
 *
 * @throws {Error} if called without VITE_USE_MOCK=true
 */
export function createMockClient(): MockClient {
  if (import.meta.env.VITE_USE_MOCK !== 'true') {
    throw new Error('Mock client is disabled (VITE_USE_MOCK is not true)');
  }

  return {
    async getStatus(): Promise<SystemStatus> {
      const scenarioValue = MOCK_SCENARIOS[currentScenario];

      // null sentinel → simulate network failure
      if (scenarioValue === null || currentScenario === 'backend_offline') {
        throw new Error('Mock: backend offline');
      }

      mockUptimeSeconds += 2.5;

      const status = buildStatus(scenarioValue ?? {});
      status.timestamp = new Date().toISOString();
      status.backend = {
        ...status.backend,
        uptime_seconds: Math.round(mockUptimeSeconds),
      };
      return status;
    },

    async getLatestDetection(): Promise<{ detection: LatestDetection | null }> {
      const scenarioValue = MOCK_SCENARIOS[currentScenario];
      if (scenarioValue === null) throw new Error('Mock: backend offline');

      const status = buildStatus(scenarioValue ?? {});
      const isConnected =
        status.camera.state === 'connected' || status.camera.state === 'stale';

      if (!isConnected) {
        return { detection: null };
      }

      const detection: LatestDetection = {
        id: 'mock-det-001',
        session_id: 'mock-session-001',
        detected_at: new Date(Date.now() - 2100).toISOString(),
        label: 'MOCK_PEST',
        confidence: 0.87,
        class_id: 0,
        bbox: { x: 120, y: 80, width: 60, height: 50, unit: 'px' },
        source_mode: status.mode,
        persisted: true,
        age_seconds: 2.1,
      };

      return { detection };
    },

    async getDetections(_params: Record<string, string>): Promise<Page<Detection>> {
      const now = new Date().toISOString();
      const items: Detection[] = [
        {
          id: 'mock-hist-001',
          session_id: 'mock-session-001',
          detected_at: now,
          label: 'MOCK_A',
          confidence: 0.91,
          class_id: 0,
          bbox: null,
          source_mode: 'live',
        },
        {
          id: 'mock-hist-002',
          session_id: 'mock-session-001',
          detected_at: now,
          label: 'MOCK_B',
          confidence: 0.75,
          class_id: 1,
          bbox: null,
          source_mode: 'live',
        },
        {
          id: 'mock-hist-003',
          session_id: 'mock-session-001',
          detected_at: now,
          label: 'MOCK_C',
          confidence: 0.62,
          class_id: 2,
          bbox: null,
          source_mode: 'live',
        },
      ];
      return { items, total: 3, limit: 25, offset: 0 };
    },

    async getDetectionLabels(): Promise<{ labels: string[] }> {
      return { labels: ['MOCK_A', 'MOCK_B', 'MOCK_C'] };
    },

    async getEvents(_params: Record<string, string>): Promise<Page<SystemEvent>> {
      const now = new Date().toISOString();
      const items: SystemEvent[] = [
        {
          id: 'mock-evt-001',
          occurred_at: now,
          severity: 'info',
          component: 'mock',
          message: 'MOCK EVENT — system started in mock mode',
        },
        {
          id: 'mock-evt-002',
          occurred_at: now,
          severity: 'info',
          component: 'mock',
          message: 'MOCK EVENT — scenario selector available in dev toolbar',
        },
      ];
      return { items, total: 2, limit: 20, offset: 0 };
    },

    async unlock(pin: string): Promise<{ ok: boolean; control: RoverControl }> {
      if (pin === '0000') {
        // Promote current scenario's rover control to ready
        return { ok: true, control: 'ready' };
      }
      const err = new Error('INVALID_PIN') as Error & { code: string };
      err.code = 'INVALID_PIN';
      throw err;
    },

    async lock(): Promise<{ ok: boolean; control: RoverControl }> {
      return { ok: true, control: 'locked' };
    },

    async connectCamera(_url: string): Promise<{ ok: boolean; camera: { state: CameraState } }> {
      return { ok: true, camera: { state: 'connecting' } };
    },

    async disconnectCamera(): Promise<{ ok: boolean; camera: { state: CameraState } }> {
      return { ok: true, camera: { state: 'disconnected' } };
    },

    async sendCommand(
      command: RoverCommand,
    ): Promise<{ ok: boolean; command: RoverCommand; state: string; sent_at: string }> {
      return {
        ok: true,
        command,
        state: 'accepted',
        sent_at: new Date().toISOString(),
      };
    },

    async startReplay(): Promise<{
      ok: boolean;
      camera: { state: CameraState };
      mode: Mode;
    }> {
      return { ok: true, camera: { state: 'connecting' }, mode: 'replay' };
    },

    async stopReplay(): Promise<{ ok: boolean; mode: Mode; camera: { state: CameraState } }> {
      return { ok: true, mode: 'live', camera: { state: 'disconnected' } };
    },
  };
}
