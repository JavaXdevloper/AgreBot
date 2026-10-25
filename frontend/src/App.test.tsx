import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

// Ensure mock mode is disabled for this test (default)
beforeEach(() => {
  vi.stubEnv('VITE_USE_MOCK', 'false');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('App (FE shell, mock off)', () => {
  it('renders the Agri Rover title', async () => {
    const { App } = await import('./app/App');
    await act(async () => {
      render(<App />);
    });
    expect(screen.getByRole('heading', { level: 1 })).toBeDefined();
    expect(screen.getAllByText('Agri Rover').length).toBeGreaterThan(0);
  });
});
