import { Camera, Cpu, Radio } from 'lucide-react';
import type { CameraState, ModelState, ArduinoState, RoverControl } from '../../lib/api/types';
import { STRINGS } from '../../lib/strings';

interface ConnectionChipsProps {
  cameraState: CameraState;
  modelState: ModelState;
  arduinoState: ArduinoState;
  roverControl: RoverControl;
  isUnlocked: boolean;
}

export function ConnectionChips({
  cameraState,
  modelState,
  arduinoState,
  roverControl,
  isUnlocked,
}: ConnectionChipsProps) {
  // 1. Camera chip
  let camLabel = STRINGS.chips.camera.disconnected;
  let camColor = 'text-text-muted border-border bg-surface-2';
  if (cameraState === 'connected') {
    camLabel = STRINGS.chips.camera.live;
    camColor = 'text-ok border-ok/30 bg-ok/10';
  } else if (cameraState === 'connecting') {
    camLabel = STRINGS.chips.camera.connecting;
    camColor = 'text-warn border-warn/30 bg-warn/10';
  } else if (cameraState === 'stale') {
    camLabel = STRINGS.chips.camera.stale;
    camColor = 'text-warn border-warn/30 bg-warn/10';
  } else if (cameraState === 'error') {
    camLabel = STRINGS.chips.camera.error;
    camColor = 'text-danger border-danger/30 bg-danger/10';
  }

  // 2. Model chip
  let modLabel = STRINGS.chips.model.notConfigured;
  let modColor = 'text-text-muted border-border bg-surface-2';
  if (modelState === 'ready') {
    modLabel = STRINGS.chips.model.ready;
    modColor = 'text-ok border-ok/30 bg-ok/10';
  } else if (modelState === 'loading') {
    modLabel = STRINGS.chips.model.loading;
    modColor = 'text-info border-info/30 bg-info/10';
  } else if (modelState === 'error') {
    modLabel = STRINGS.chips.model.error;
    modColor = 'text-danger border-danger/30 bg-danger/10';
  }

  // 3. Rover link chip
  let rovLabel = STRINGS.chips.rover.disconnected;
  let rovColor = 'text-text-muted border-border bg-surface-2';
  if (arduinoState === 'connected') {
    if (roverControl === 'ready' || isUnlocked) {
      rovLabel = STRINGS.chips.rover.ready;
      rovColor = 'text-ok border-ok/30 bg-ok/10';
    } else {
      rovLabel = STRINGS.chips.rover.locked;
      rovColor = 'text-warn border-warn/30 bg-warn/10';
    }
  } else if (arduinoState === 'connecting') {
    rovLabel = STRINGS.chips.rover.searching;
    rovColor = 'text-warn border-warn/30 bg-warn/10';
  }

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-medium">
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill border ${camColor}`}>
        <Camera className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden md:inline">{camLabel}</span>
      </span>

      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill border ${modColor}`}>
        <Cpu className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden md:inline">{modLabel}</span>
      </span>

      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill border ${rovColor}`}>
        <Radio className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden md:inline">{rovLabel}</span>
      </span>
    </div>
  );
}
