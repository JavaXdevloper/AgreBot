import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReplayControlPanel } from '../src/components/controls/ReplayControlPanel';

describe('FE-6: ReplayControlPanel Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders start replay button when inactive and available', () => {
    render(
      <ReplayControlPanel
        mode="live"
        replayAvailable={true}
        replayActive={false}
        cameraState="disconnected"
        roverControl="ready"
        isOffline={false}
      />
    );

    expect(screen.getByRole('button', { name: /Start Prerecorded Replay/i })).toBeDefined();
    expect(screen.getByText('REPLAY INACTIVE')).toBeDefined();
  });

  it('renders stop replay button when replay is active', () => {
    render(
      <ReplayControlPanel
        mode="replay"
        replayAvailable={true}
        replayActive={true}
        cameraState="connected"
        roverControl="unavailable"
        isOffline={false}
      />
    );

    expect(screen.getByRole('button', { name: /Stop Replay Mode/i })).toBeDefined();
    expect(screen.getByText('REPLAY ACTIVE')).toBeDefined();
  });

  it('requires PIN unlock to start replay', () => {
    render(
      <ReplayControlPanel
        mode="live"
        replayAvailable={true}
        replayActive={false}
        cameraState="disconnected"
        roverControl="locked"
        isOffline={false}
      />
    );

    const startBtn = screen.getByRole('button', { name: /Start Prerecorded Replay/i });
    fireEvent.click(startBtn);

    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText(/Enter PIN to unlock/i)).toBeDefined();
  });

  it('shows confirmation dialog when live camera is currently active', async () => {
    render(
      <ReplayControlPanel
        mode="live"
        replayAvailable={true}
        replayActive={false}
        cameraState="connected"
        roverControl="ready"
        isOffline={false}
      />
    );

    const startBtn = screen.getByRole('button', { name: /Start Prerecorded Replay/i });
    fireEvent.click(startBtn);

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText(/Live Camera Disconnection Warning/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Confirm & Start Replay/i })).toBeDefined();
  });

  it('calls POST /api/replay/start on confirmed action', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ ok: true }),
    } as Response);
    globalThis.fetch = fetchMock;

    const onRefreshed = vi.fn();
    render(
      <ReplayControlPanel
        mode="live"
        replayAvailable={true}
        replayActive={false}
        cameraState="disconnected"
        roverControl="ready"
        isOffline={false}
        onRefreshStatus={onRefreshed}
      />
    );

    const startBtn = screen.getByRole('button', { name: /Start Prerecorded Replay/i });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/replay/start',
        expect.objectContaining({ method: 'POST' })
      );
      expect(onRefreshed).toHaveBeenCalled();
    });
  });
});
