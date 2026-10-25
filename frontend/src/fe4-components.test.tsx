import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LatestDetectionCard } from '../src/components/detections/LatestDetectionCard';
import { DetectionHistoryTable } from '../src/components/detections/DetectionHistoryTable';
import { SystemEventsPanel } from '../src/components/events/SystemEventsPanel';
import type { LatestDetection } from '../src/lib/api/types';

describe('FE-4: LatestDetectionCard Component', () => {
  it('renders "No detection yet" when detection is null', () => {
    render(
      <LatestDetectionCard
        detection={null}
        modelState="ready"
        modelError={null}
      />
    );
    expect(screen.getByText('No detection yet')).toBeDefined();
  });

  it('renders model explanation when model is not ready', () => {
    render(
      <LatestDetectionCard
        detection={null}
        modelState="not_configured"
        modelError={null}
      />
    );
    expect(screen.getByText(/Inference disabled — no model weights configured/i)).toBeDefined();
  });

  it('displays detection label, formatted confidence, and cooldown indicator', () => {
    const mockDet: LatestDetection = {
      id: 'det-10',
      session_id: 'sess-10',
      detected_at: new Date().toISOString(),
      label: 'caterpillar',
      confidence: 0.934,
      class_id: 2,
      bbox: null,
      source_mode: 'live',
      persisted: false,
      age_seconds: 3.2,
    };

    render(
      <LatestDetectionCard
        detection={mockDet}
        modelState="ready"
        modelError={null}
      />
    );

    expect(screen.getByText('caterpillar')).toBeDefined();
    expect(screen.getByText('93.4%')).toBeDefined();
    expect(screen.getByText(/not saved: repeat within cooldown/i)).toBeDefined();
  });

  it('greys and marks older when age_seconds > 10', () => {
    const mockOlderDet: LatestDetection = {
      id: 'det-11',
      session_id: 'sess-10',
      detected_at: new Date(Date.now() - 15000).toISOString(),
      label: 'aphid',
      confidence: 0.88,
      class_id: 1,
      bbox: null,
      source_mode: 'live',
      persisted: true,
      age_seconds: 15.0,
    };

    render(
      <LatestDetectionCard
        detection={mockOlderDet}
        modelState="ready"
        modelError={null}
      />
    );

    expect(screen.getByText('older')).toBeDefined();
  });
});

describe('FE-4: DetectionHistoryTable Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders table headers and empty state when no detections returned', async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/labels')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ labels: ['aphid', 'rust'] }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ items: [], total: 0, limit: 25, offset: 0 }),
      } as Response);
    });

    render(<DetectionHistoryTable />);

    expect(screen.getByText('Detection History')).toBeDefined();
    await waitFor(() => {
      expect(screen.getByText('No detections recorded for these filters.')).toBeDefined();
    });
  });

  it('renders history rows when items are available', async () => {
    const mockRows = {
      items: [
        {
          id: 'row-1',
          session_id: 'sess-01',
          detected_at: new Date().toISOString(),
          label: 'blight',
          confidence: 0.912,
          class_id: null,
          bbox: null,
          source_mode: 'live',
        },
      ],
      total: 1,
      limit: 25,
      offset: 0,
    };

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/labels')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ labels: ['blight'] }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockRows,
      } as Response);
    });

    render(<DetectionHistoryTable />);

    await waitFor(() => {
      expect(screen.getByRole('cell', { name: 'blight' })).toBeDefined();
      expect(screen.getByText('91.2%')).toBeDefined();
    });
  });
});

describe('FE-4: SystemEventsPanel Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('toggles collapsible view and fetches events', async () => {
    const mockEvents = {
      items: [
        {
          id: 'evt-1',
          occurred_at: new Date().toISOString(),
          severity: 'warning',
          component: 'camera',
          message: 'Stream reconnect attempted',
        },
      ],
      total: 1,
      limit: 20,
      offset: 0,
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockEvents,
    } as Response);

    render(<SystemEventsPanel />);

    const toggleBtn = screen.getByRole('button', { name: /System Events Log/i });
    expect(screen.queryByText('Stream reconnect attempted')).toBeNull();

    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(screen.getByText('Stream reconnect attempted')).toBeDefined();
      expect(screen.getByText(/camera/i)).toBeDefined();
    });
  });
});
