import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useHoldToDrive, HEARTBEAT_MS } from '../src/hooks/useHoldToDrive';
import { RoverControlPanel } from '../src/components/controls/RoverControlPanel';
import { StopButton } from '../src/components/controls/StopButton';

describe('FE-5: useHoldToDrive Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends command immediately and pulses every HEARTBEAT_MS while held', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ ok: true, state: 'accepted' }),
    } as Response);
    globalThis.fetch = fetchMock;

    const { result } = renderHook(() =>
      useHoldToDrive({
        roverControl: 'ready',
        mode: 'live',
        isOffline: false,
      })
    );

    await act(async () => {
      result.current.startDriving('forward');
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/rover/command',
      expect.objectContaining({ body: JSON.stringify({ command: 'forward' }) })
    );

    // Advance 1 heartbeat pulse
    await act(async () => {
      vi.advanceTimersByTime(HEARTBEAT_MS);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Advance 2nd heartbeat pulse
    await act(async () => {
      vi.advanceTimersByTime(HEARTBEAT_MS);
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);

    // Release driving -> sends stop
    await act(async () => {
      result.current.stopDriving();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/rover/command',
      expect.objectContaining({ body: JSON.stringify({ command: 'stop' }) })
    );
  });

  it('enforces single active direction constraint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ ok: true }),
    } as Response);
    globalThis.fetch = fetchMock;

    const { result } = renderHook(() =>
      useHoldToDrive({
        roverControl: 'ready',
        mode: 'live',
        isOffline: false,
      })
    );

    await act(async () => {
      result.current.startDriving('forward');
    });

    // Pressing 'left' while 'forward' is active sends 'stop' first then starts 'left'
    await act(async () => {
      result.current.startDriving('left');
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/rover/command',
      expect.objectContaining({ body: JSON.stringify({ command: 'stop' }) })
    );
    expect(result.current.activeDirection).toBe('left');
  });

  it('disables driving controls in blocked states (offline, locked, replay)', () => {
    const { result: offlineRes } = renderHook(() =>
      useHoldToDrive({ roverControl: 'ready', mode: 'live', isOffline: true })
    );
    expect(offlineRes.current.isDrivingDisabled).toBe(true);

    const { result: lockedRes } = renderHook(() =>
      useHoldToDrive({ roverControl: 'locked', mode: 'live', isOffline: false })
    );
    expect(lockedRes.current.isDrivingDisabled).toBe(true);

    const { result: replayRes } = renderHook(() =>
      useHoldToDrive({ roverControl: 'ready', mode: 'replay', isOffline: false })
    );
    expect(replayRes.current.isDrivingDisabled).toBe(true);
  });

  it('sends emergency stop on window blur', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ ok: true }),
    } as Response);
    globalThis.fetch = fetchMock;

    const { result } = renderHook(() =>
      useHoldToDrive({ roverControl: 'ready', mode: 'live', isOffline: false })
    );

    await act(async () => {
      result.current.startDriving('forward');
    });

    await act(async () => {
      window.dispatchEvent(new Event('blur'));
    });

    expect(result.current.activeDirection).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/rover/command',
      expect.objectContaining({ body: JSON.stringify({ command: 'stop' }) })
    );
  });
});

describe('FE-5: StopButton Component', () => {
  it('triggers onStop callback when clicked', () => {
    const onStop = vi.fn();
    render(<StopButton onStop={onStop} />);

    const btn = screen.getByRole('button', { name: /Emergency Stop Rover/i });
    expect(btn).toBeDefined();
    fireEvent.click(btn);
    expect(onStop).toHaveBeenCalledTimes(1);
  });
});

describe('FE-5: RoverControlPanel Component', () => {
  it('renders all 4 directional buttons and STOP button', () => {
    render(
      <RoverControlPanel
        roverControl="ready"
        roverReason={null}
        mode="live"
        isOffline={false}
        lastCommand="stop"
        lastCommandAt={new Date().toISOString()}
      />
    );

    expect(screen.getByRole('button', { name: /Drive Forward/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Turn Left/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Turn Right/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Drive Backward/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Emergency Stop Rover/i })).toBeDefined();
  });

  it('displays safety guidance note', () => {
    render(
      <RoverControlPanel
        roverControl="ready"
        roverReason={null}
        mode="live"
        isOffline={false}
        lastCommand={null}
        lastCommandAt={null}
      />
    );

    expect(screen.getByText(/Test with wheels lifted first/i)).toBeDefined();
  });

  it('triggers STOP on Space or Escape keydown', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ ok: true }),
    } as Response);
    globalThis.fetch = fetchMock;

    render(
      <RoverControlPanel
        roverControl="ready"
        roverReason={null}
        mode="live"
        isOffline={false}
        lastCommand={null}
        lastCommandAt={null}
      />
    );

    fireEvent.keyDown(window, { code: 'Space' });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/rover/command',
        expect.objectContaining({ body: JSON.stringify({ command: 'stop' }) })
      );
    });
  });
});
