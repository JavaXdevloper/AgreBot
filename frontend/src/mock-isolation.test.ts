import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMockClient, setMockScenario, getMockScenario } from '../src/lib/api/mock/index';
import { MOCK_SCENARIOS } from '../src/lib/api/mock/scenarios';

describe('Mock Client Isolation and Behaviour', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    setMockScenario('default');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('createMockClient() throws when VITE_USE_MOCK is not "true"', () => {
    vi.stubEnv('VITE_USE_MOCK', 'false');
    expect(() => createMockClient()).toThrow(
      'Mock client is disabled (VITE_USE_MOCK is not true)'
    );
  });

  it('createMockClient() throws when VITE_USE_MOCK is undefined', () => {
    vi.stubEnv('VITE_USE_MOCK', undefined as unknown as string);
    expect(() => createMockClient()).toThrow(
      'Mock client is disabled (VITE_USE_MOCK is not true)'
    );
  });

  it('createMockClient() succeeds when VITE_USE_MOCK is "true"', () => {
    vi.stubEnv('VITE_USE_MOCK', 'true');
    expect(() => createMockClient()).not.toThrow();
  });

  it('setMockScenario / getMockScenario roundtrip', () => {
    setMockScenario('camera_connected');
    expect(getMockScenario()).toBe('camera_connected');
  });

  it('getStatus() throws for backend_offline scenario', async () => {
    vi.stubEnv('VITE_USE_MOCK', 'true');
    const client = createMockClient();
    setMockScenario('backend_offline');
    await expect(client.getStatus()).rejects.toThrow('Mock: backend offline');
  });

  it('getStatus() returns SystemStatus for default scenario', async () => {
    vi.stubEnv('VITE_USE_MOCK', 'true');
    const client = createMockClient();
    setMockScenario('default');
    const status = await client.getStatus();
    expect(status).toBeDefined();
    expect(status.contract_version).toBe('1.0');
    expect(status.mode).toBe('live');
    expect(status.backend.state).toBe('ready');
  });

  it('MOCK_SCENARIOS contains all required scenario keys', () => {
    const requiredKeys = [
      'default',
      'camera_connecting',
      'camera_connected',
      'camera_stale',
      'camera_error',
      'model_ready',
      'model_loading',
      'model_error',
      'arduino_connected',
      'rover_ready',
      'rover_unavailable',
      'replay_active',
      'backend_offline',
      'clock_desync',
      'db_error',
    ];
    for (const key of requiredKeys) {
      expect(key in MOCK_SCENARIOS).toBe(true);
    }
  });
});
