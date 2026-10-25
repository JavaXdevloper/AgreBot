import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { validateCameraUrl } from '../src/lib/validation';
import { CameraConnectionForm } from '../src/components/camera/CameraConnectionForm';
import { ProcessedVideoPanel } from '../src/components/camera/ProcessedVideoPanel';
import { PinUnlockDialog } from '../src/components/controls/PinUnlockDialog';

describe('FE-3: validateCameraUrl', () => {
  it('rejects empty and whitespace URLs', () => {
    expect(validateCameraUrl('').valid).toBe(false);
    expect(validateCameraUrl('   ').valid).toBe(false);
  });

  it('rejects URLs longer than 512 characters', () => {
    const longUrl = 'http://example.com/' + 'a'.repeat(510);
    expect(validateCameraUrl(longUrl).valid).toBe(false);
  });

  it('rejects credentials in stream URLs per Decision D-16', () => {
    const credUrl = 'http://admin:secret@192.168.1.50:8080/video';
    const res = validateCameraUrl(credUrl);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/credentials/i);
  });

  it('rejects non-http/https protocols', () => {
    expect(validateCameraUrl('ftp://192.168.1.50:8080/video').valid).toBe(false);
    expect(validateCameraUrl('rtsp://192.168.1.50:554/live').valid).toBe(false);
  });

  it('accepts valid http and https URLs', () => {
    expect(validateCameraUrl('http://192.168.1.50:8080/video').valid).toBe(true);
    expect(validateCameraUrl('https://mycamera.local/stream').valid).toBe(true);
  });
});

describe('FE-3: CameraConnectionForm Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders input with placeholder and buttons', () => {
    render(
      <CameraConnectionForm
        cameraState="disconnected"
        roverControl="locked"
        fps={null}
        lastFrameAt={null}
        error={null}
        isOffline={false}
      />
    );

    expect(screen.getByLabelText(/IP Webcam stream URL/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /^Connect$/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /^Disconnect$/i })).toBeDefined();
  });

  it('shows validation error for invalid URL without firing network requests', async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    render(
      <CameraConnectionForm
        cameraState="disconnected"
        roverControl="ready"
        fps={null}
        lastFrameAt={null}
        error={null}
        isOffline={false}
      />
    );

    const input = screen.getByLabelText(/IP Webcam stream URL/i);
    fireEvent.change(input, { target: { value: 'not-a-url' } });

    const connectBtn = screen.getByRole('button', { name: /^Connect$/i });
    fireEvent.click(connectBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText(/Invalid URL format/i)).toBeDefined();
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('FE-3: ProcessedVideoPanel Component', () => {
  it('does NOT mount img tag when camera is disconnected', () => {
    render(
      <ProcessedVideoPanel
        cameraState="disconnected"
        mode="live"
        isOffline={false}
        lastFrameAt={null}
      />
    );

    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText(/Camera Not Connected/i)).toBeDefined();
  });

  it('mounts img tag with /api/video/stream only when connected or stale', () => {
    render(
      <ProcessedVideoPanel
        cameraState="connected"
        mode="live"
        isOffline={false}
        lastFrameAt={new Date().toISOString()}
      />
    );

    const img = screen.getByRole('img');
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toContain('/api/video/stream');
  });

  it('displays STALE overlay when camera state is stale', () => {
    render(
      <ProcessedVideoPanel
        cameraState="stale"
        mode="live"
        isOffline={false}
        lastFrameAt={new Date(Date.now() - 10000).toISOString()}
      />
    );

    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText(/STALE STREAM/i)).toBeDefined();
    expect(screen.getByRole('img')).toBeDefined();
  });
});

describe('FE-3: PinUnlockDialog Component', () => {
  it('renders locked state and calls unlock handler with PIN', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ ok: true, control: 'ready' }),
    } as Response);

    const onUnlocked = vi.fn();
    render(
      <PinUnlockDialog
        roverControl="locked"
        isOffline={false}
        onSuccess={onUnlocked}
      />
    );

    expect(screen.getByLabelText(/Security PIN/i)).toBeDefined();
    const pinInput = screen.getByLabelText(/Security PIN/i);
    fireEvent.change(pinInput, { target: { value: '1234' } });

    const unlockBtn = screen.getByRole('button', { name: /Unlock Rover Controls/i });
    fireEvent.click(unlockBtn);

    await waitFor(() => {
      expect(onUnlocked).toHaveBeenCalled();
    });
  });

  it('renders lock button when already unlocked', () => {
    render(
      <PinUnlockDialog
        roverControl="ready"
        isOffline={false}
      />
    );

    expect(screen.getByRole('button', { name: /Lock Controls Now/i })).toBeDefined();
  });
});
