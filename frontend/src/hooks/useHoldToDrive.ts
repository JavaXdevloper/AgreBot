import { useState, useRef, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api/client';
import { ENDPOINTS } from '../lib/api/endpoints';
import { createMockClient } from '../lib/api/mock';
import type { RoverCommand, RoverControl, Mode } from '../lib/api/types';

export const HEARTBEAT_MS = 200;
const IS_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const mockClient = IS_MOCK ? createMockClient() : null;

export interface UseHoldToDriveOptions {
  roverControl: RoverControl;
  mode: Mode;
  isOffline: boolean;
  onCommandSent?: (cmd: RoverCommand) => void;
}

export interface UseHoldToDriveResult {
  activeDirection: RoverCommand | null;
  error: string | null;
  isDrivingDisabled: boolean;
  isKeyboardEnabled: boolean;
  setIsKeyboardEnabled: (enabled: boolean) => void;
  startDriving: (direction: RoverCommand, pointerId?: number, targetElement?: HTMLElement | null) => void;
  stopDriving: () => void;
  sendEmergencyStop: () => Promise<void>;
  clearError: () => void;
}

export function useHoldToDrive({
  roverControl,
  mode,
  isOffline,
  onCommandSent,
}: UseHoldToDriveOptions): UseHoldToDriveResult {
  const [activeDirection, setActiveDirection] = useState<RoverCommand | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isKeyboardEnabled, setIsKeyboardEnabled] = useState(false);

  const activeDirectionRef = useRef<RoverCommand | null>(null);
  const inFlightRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const capturedPointerRef = useRef<{ pointerId: number; element: HTMLElement } | null>(null);

  const isDrivingDisabled =
    isOffline || roverControl !== 'ready' || mode === 'replay' || Boolean(error);

  const sendCommandDirect = useCallback(async (command: RoverCommand): Promise<boolean> => {
    try {
      if (IS_MOCK && mockClient) {
        await mockClient.sendCommand(command);
      } else {
        await apiFetch(ENDPOINTS.ROVER_COMMAND, {
          method: 'POST',
          body: JSON.stringify({ command }),
          timeoutMs: 1000,
        });
      }
      onCommandSent?.(command);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Command rejected';
      setError(msg);
      return false;
    }
  }, [onCommandSent]);

  const sendEmergencyStop = useCallback(async () => {
    // Clear any active driving timers immediately
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    activeDirectionRef.current = null;
    setActiveDirection(null);

    // Release pointer capture if held
    if (capturedPointerRef.current) {
      try {
        const { pointerId, element } = capturedPointerRef.current;
        if (element.hasPointerCapture(pointerId)) {
          element.releasePointerCapture(pointerId);
        }
      } catch {
        // Ignored
      }
      capturedPointerRef.current = null;
    }

    // STOP bypasses in-flight checks; retry up to 2 additional times if failed
    let attempts = 0;
    let succeeded = false;

    while (attempts < 3 && !succeeded) {
      attempts++;
      try {
        if (IS_MOCK && mockClient) {
          await mockClient.sendCommand('stop');
        } else {
          await apiFetch(ENDPOINTS.ROVER_COMMAND, {
            method: 'POST',
            body: JSON.stringify({ command: 'stop' }),
            timeoutMs: 1000,
          });
        }
        succeeded = true;
        onCommandSent?.('stop');
      } catch {
        if (attempts < 3) {
          await new Promise((res) => setTimeout(res, 100));
        }
      }
    }

    if (!succeeded) {
      setError('STOP may not have reached the rover');
    }
  }, [onCommandSent]);

  const stopDriving = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (capturedPointerRef.current) {
      try {
        const { pointerId, element } = capturedPointerRef.current;
        if (element.hasPointerCapture(pointerId)) {
          element.releasePointerCapture(pointerId);
        }
      } catch {
        // Ignored
      }
      capturedPointerRef.current = null;
    }

    const hadDirection = activeDirectionRef.current !== null;
    activeDirectionRef.current = null;
    setActiveDirection(null);

    if (hadDirection) {
      void sendEmergencyStop();
    }
  }, [sendEmergencyStop]);

  const startDriving = useCallback(
    (direction: RoverCommand, pointerId?: number, targetElement?: HTMLElement | null) => {
      if (isDrivingDisabled || direction === 'stop') return;

      // Single active direction constraint: stop any prior direction first
      if (activeDirectionRef.current && activeDirectionRef.current !== direction) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        void sendCommandDirect('stop');
      }

      if (pointerId !== undefined && targetElement) {
        try {
          targetElement.setPointerCapture(pointerId);
          capturedPointerRef.current = { pointerId, element: targetElement };
        } catch {
          // Ignored
        }
      }

      activeDirectionRef.current = direction;
      setActiveDirection(direction);

      // Send initial tick immediately
      if (!inFlightRef.current) {
        inFlightRef.current = true;
        void sendCommandDirect(direction).then((ok) => {
          inFlightRef.current = false;
          if (!ok) {
            stopDriving();
          }
        });
      }

      // Heartbeat pulse every HEARTBEAT_MS
      intervalRef.current = setInterval(() => {
        if (activeDirectionRef.current !== direction) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return;
        }

        // Single-flight: skip tick if prior command is still pending
        if (inFlightRef.current) {
          return;
        }

        inFlightRef.current = true;
        void sendCommandDirect(direction).then((ok) => {
          inFlightRef.current = false;
          if (!ok) {
            stopDriving();
          }
        });
      }, HEARTBEAT_MS);
    },
    [isDrivingDisabled, sendCommandDirect, stopDriving]
  );

  // Environmental guards: stop on window blur, tab hidden, beforeunload, or unmount
  useEffect(() => {
    const onBlur = () => stopDriving();
    const onVisibilityChange = () => {
      if (document.hidden) stopDriving();
    };
    const onBeforeUnload = () => {
      void sendEmergencyStop();
    };

    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('beforeunload', onBeforeUnload);
      stopDriving();
    };
  }, [stopDriving, sendEmergencyStop]);

  // Safety trigger if system shifts to disabled state while driving
  useEffect(() => {
    if (isDrivingDisabled && activeDirectionRef.current !== null) {
      stopDriving();
    }
  }, [isDrivingDisabled, stopDriving]);

  // Global key bindings: Space and Escape for STOP, optional WASD/Arrows
  useEffect(() => {
    const keyMap: Record<string, RoverCommand> = {
      ArrowUp: 'forward',
      KeyW: 'forward',
      ArrowDown: 'backward',
      KeyS: 'backward',
      ArrowLeft: 'left',
      KeyA: 'left',
      ArrowRight: 'right',
      KeyD: 'right',
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Escape') {
        e.preventDefault();
        void sendEmergencyStop();
        return;
      }

      if (!isKeyboardEnabled || e.repeat) return;

      const cmd = keyMap[e.code];
      if (cmd) {
        e.preventDefault();
        startDriving(cmd);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (!isKeyboardEnabled) return;
      const cmd = keyMap[e.code];
      if (cmd && activeDirectionRef.current === cmd) {
        e.preventDefault();
        stopDriving();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [isKeyboardEnabled, startDriving, stopDriving, sendEmergencyStop]);

  return {
    activeDirection,
    error,
    isDrivingDisabled,
    isKeyboardEnabled,
    setIsKeyboardEnabled,
    startDriving,
    stopDriving,
    sendEmergencyStop,
    clearError: () => setError(null),
  };
}
