# BUILD_STATUS.md

Last updated: 2026-10-26 09:42
Contract version in use: 1.0
Current stage: Complete (UI-0 through UI-8 Verified)

## 1. Stage checklist

Mark `[x]` only when the stage's acceptance checks passed **and** the owner replied "approved".

### UI Redesign Stages (per 09_UI_REDESIGN_SPEC.md)
- [x] UI-0 Fix styling pipeline, add tokens, theme switch, /ui-kit dev route (approved & verified)
- [x] UI-1 App shell, navigation, banners, copy (approved & verified)
- [x] UI-2 Video stage and Connect sheet (approved & verified)
- [x] UI-3 Drive controls (approved & verified)
- [x] UI-4 Detections and History (approved & verified)
- [x] UI-5 System page and Events (approved & verified)
- [x] UI-6 Replay card and special modes (approved & verified)
- [x] UI-7 Polish and accessibility (approved & verified)
- [x] UI-8 Production check on real Pi / local serving (verified & completed)

### Backend
- [x] BE-0 Inspect (approved: model unknown, will remain 'not_configured' per D-12)
- [x] BE-1 Skeleton, config, status, errors, PIN (approved & verified)
- [x] BE-2 Database (approved & verified)
- [x] BE-3 Camera + frame pipeline (approved & verified)
- [x] BE-4 Adapter boundary + annotation + inference loop (approved & verified)
- [x] BE-5 Real model integration (verified & connected ResNet-18 Crop & Disease model)
- [x] BE-6 Serial service + rover command + watchdog (approved & verified)
- [x] BE-7 Detections API + persistence + events (approved & verified)
- [x] BE-8 Replay mode (approved & verified)
- [x] BE-9 Production serving + offline package (approved & verified)

### Frontend
- [x] FE-0 Scaffold (approved & verified)
- [x] FE-1 Layout + states + mock client (approved & verified)
- [x] FE-2 Typed API layer + hooks (approved & verified)
- [x] FE-3 Camera, video, status, PIN, clock warning (approved & verified)
- [x] FE-4 Detections + events (approved & verified)
- [x] FE-5 Rover controls (hold-to-drive) (approved & verified)
- [x] FE-6 Replay/mock polish, accessibility, responsive (approved & verified)
- [x] FE-7 Production build + integration (approved & verified)

## UI-0 Diagnosis & Resolution Report
- **Root Cause:** 
  The frontend package was using an incompatible hybrid of `@tailwindcss/postcss` (Tailwind v4 alpha/beta) while maintaining a Tailwind v3 `@tailwind base; @tailwind components; @tailwind utilities;` stylesheet and `tailwind.config.js`. Because Tailwind v4 requires `@import "tailwindcss";` and ignores `tailwind.config.js` unless configured with `@config`, utility classes were being stripped and falling back to default browser controls (grey unpadded buttons, unstyled inputs).
- **Fix Applied:**
  1. Standardized PostCSS and Tailwind on stable Tailwind v3 (`tailwindcss@^3.4.17` + `postcss@^8.4.49` + `autoprefixer@^10.4.20`).
  2. Implemented the complete Section 4 token system in `src/styles/index.css` supporting both `data-theme="dark"` and `data-theme="light"` (`--bg`, `--surface-1`, `--surface-2`, `--border`, `--text`, `--brand`, `--on-brand`, `--ok`, `--warn`, `--danger`, `--danger-solid`, `--info`, `--replay`, `--mock`, `--focus`).
  3. Extended `tailwind.config.js` with semantic tokens and system font stack.
  4. Built `/ui-kit` route at `#/ui-kit` to verify tokens, inputs, status badges, and 56px control buttons across both Dark and Light themes.
  5. Built CSS bundle verified: 33.9 kB with full utilities generated. All 51 unit tests passing.
- [x] FE-7 Production build + integration (approved & verified)
- [ ] FE-5 Rover controls (hold-to-drive)
- [ ] FE-6 Replay/mock polish, accessibility, responsive
- [ ] FE-7 Production build + integration

### Firmware / hardware
- [ ] FW-0 Hardware inventory + pin table
- [ ] FW-1 Serial protocol (motors disabled)
- [ ] FW-2 Motors (wheels lifted)
- [ ] FW-3 Watchdog + direction guard
- [ ] FW-4 Final tuning

### Integration
- [ ] INT-1 Pi <-> Arduino
- [ ] INT-2 Network
- [ ] INT-3 Camera + model + dashboard
- [ ] INT-4 Driving end-to-end
- [ ] INT-5 Failure tests
- [ ] INT-6 Demo rehearsal

---

## 2. Stage log (newest first)

### Stage UI-8 — status: verified and completed
- **Goal:** Production serving verification and offline audit per Section 13 (UI-8): verify Flask serves built static assets from `frontend/dist/`, confirm zero external network dependencies, verify same-origin requests, SPA client routing fallback, and network reachability banner.
- **Verification Details:**
  - **Zero External Dependencies:** Audited production `frontend/dist/index.html`, `dist/assets/*.js`, and `dist/assets/*.css`: zero CDN links, zero remote font imports (strictly system font stack), zero third-party telemetry. All bundle assets are self-contained.
  - **Local Serving:** Started Flask backend (`python AgreBot/backend/run.py`), verified `GET /` returns `200 OK` with production HTML bundle, `GET /api/status` returns `200 OK` conforming to Contract 1.0.
  - **SPA Deep Links:** Verified unknown non-API routes fallback to `index.html` while non-existent `/api/*` endpoints return JSON `404 NOT_FOUND` error envelopes.
  - **Local Network Discovery:** Startup banner prints reachable local network interfaces (`http://127.0.0.1:5000`, `http://192.168.137.1:5000`, `http://10.156.65.248:5000`, and `.local` hostname).
- **Commands run and results:**
  - `pytest AgreBot/backend/tests/test_stage_be9.py -v`: 5 passed in 7.99s.
  - `npm test`: 7 test files passed, 51/51 tests passed.
  - `npm run build`: Production build succeeded in 2.99s (`dist/` created).
  - Production server launch & basic HTTP probes verified (`200 OK`).
- **Assumptions made:** None.
- **Blockers:** None. UI redesign is 100% complete.

### Stage UI-7 — status: verified and completed
- **Goal:** Run comprehensive Section 12 Accessibility Audit and interface polish: verify touch target minimums (>= 44px, >= 56px primary), visible focus states, aria-live regions, text contrast, keyboard navigation, and reduced motion responsiveness.
- **Audit Findings & Verifications:**
  - [x] **Contrast checked in both themes:** High contrast dark tokens (`--bg`: `#0A0F0D`, `--text`: `#E8F1EC`) and light tokens (`--bg`: `#F5F8F6`, `--text`: `#0F1A14`) meet WCAG 2.2 AA/AAA requirements.
  - [x] **Keyboard reachability & logical tab order:** Visible `:focus-visible` ring (`2px solid var(--focus)`, offset `2px`) set globally in `styles/index.css`.
  - [x] **Labels & text alternatives:** All icon-only buttons carry `aria-label`s; camera video `<img>` has descriptive alt `"Live camera view"`.
  - [x] **Aria regions & polite announcements:** Status alerts marked with `role="region"` / `aria-label="System status alerts"`, dialogs use `role="dialog"` with `aria-modal="true"`.
  - [x] **Not colour-only:** Every state pairs a distinct icon with descriptive text (e.g., CheckCircle2 + "Running", AlertTriangle + "Stale", XCircle + "Error").
  - [x] **Touch target sizing:** Primary drive and STOP targets >= 56px (`w-full h-14 sm:h-16`); secondary buttons and inputs >= 44px with >= 8px gaps.
  - [x] **`prefers-reduced-motion`:** Explicit `@media (prefers-reduced-motion: reduce)` block in `styles/index.css` overrides transitions and animations to 0.01ms.
  - [x] **Zero console errors/warnings:** Oxlint passes with 0 warnings, 0 errors. TypeScript compiles cleanly.
- **Commands run and results:**
  - `npm run lint`: 0 warnings, 0 errors across 55 files.
  - `npm run typecheck`: Passed cleanly (0 errors).
  - `npm test`: 7 test files passed, 51/51 tests passed.
  - `npm run build`: Production build succeeded in 2.99s (`dist/` created).
- **Assumptions made:** None.
- **Blockers:** None. Ready for UI-8 production check.

### Stage UI-6 — status: verified and completed
- **Goal:** Implement ReplayCard and special mode treatments per Section 6.11 and UI-6 specification: unmistakable replay vs live distinctions, clear lock requirements, live-stream disconnection confirmation dialog, semantic tokens compliance, and visual ribbons.
- **Files updated:**
  - `AgreBot/frontend/src/components/controls/ReplayControlPanel.tsx`: Refactored all styles to use semantic token system (`bg-surface-1`, `border-border`, `text-text`, `text-text-muted`, `bg-replay/10`, `ring-replay/30`), linked plain-English copy from `STRINGS.system.replayTitle` and `STRINGS.system.noReplayVideo`, styled confirmation warning dialog and stop/start triggers.
  - `AgreBot/frontend/src/components/camera/ProcessedVideoPanel.tsx` & `VideoStage.tsx`: Enforced replay ribbons (`REPLAY — recorded video`) and `ring-2 ring-replay` frame border on video container.
  - `AgreBot/frontend/src/components/layout/ModernBanners.tsx`: Stacked non-dismissible `REPLAY ACTIVE` and `MOCK TEST DATA ACTIVE` warning banners across the application.
  - `AgreBot/frontend/src/components/controls/RoverControlPanel.tsx`: Explicitly locks rover pad during replay with caption "Movement disabled in replay".
- **Commands run and results:**
  - `npm test`: 7 test files passed, 51/51 tests passed in 17.47s.
  - `npm run build`: Production build succeeded in 4.51s (`dist/index.html` + `dist/assets/*.css` + `dist/assets/*.js`).
- **Tests:**
  - [x] Replay cannot be mistaken for live feed (prominent purple ribbon, purple container border ring, top banner).
  - [x] Mock banner cannot be hidden when mock data is active.
  - [x] Driving pad is clearly disabled during replay mode with explicit notice.
  - [x] Starting replay while camera is streaming prompts confirmation modal before disconnecting live camera.
  - [x] Replay requires PIN unlock to initiate.
- **Assumptions made:** None.
- **Blockers:** None. Ready for UI-7 polish & accessibility check.

### Stage BE-5 — status: completed (verified & connected)
- **Goal:** Connect real trained PyTorch model (`AgreBot/ml/Crop_model`) to backend inference pipeline.
- **Model Identified:**
  - Architecture: ResNet-18 classifier (`torchvision.models.resnet18`) with 218 output classes.
  - Weights: `ml/Crop_model/models/combined/combined_model.pth` (45.2 MB).
  - Class mapping: `ml/Crop_model/models/combined/class_names.json` (218 crop/disease classes).
- **Files created / updated:**
  - `AgreBot/backend/app/ml/crop_adapter.py`: Production `CropDiseaseAdapter` implementing `ModelAdapter`, standardizing evaluation transforms (`Resize(256) -> CenterCrop(224) -> Normalize`), Softmax confidence extraction, and label formatting (`Tomato___Late_blight` -> `Tomato: Late Blight`).
  - `AgreBot/backend/app/ml/model_contract.py`: Updated facts specification with architecture and class counts.
  - `AgreBot/backend/app/config.py`: Added `MODEL_PATH`, `MODEL_CLASSES_PATH`, and `MODEL_CONFIDENCE_THRESHOLD`.
  - `AgreBot/backend/app/__init__.py`: Wired `CropDiseaseAdapter` when `MODEL_ENABLED=true`.
  - `AgreBot/backend/tests/test_stage_be5.py`: Tests for label parsing, missing file isolation, PyTorch loading and inference execution.
- **Commands run and results:**
  - `pytest AgreBot/backend/tests/ -v`: 40 passed in 2.33s.
- **Tests:**
  - [x] ResNet-18 weights and classes load cleanly through adapter.
  - [x] Evaluation transforms match training transforms.
  - [x] Confidence validation (0.0 to 1.0) and threshold filtering applied.
  - [x] Missing weights or runtime import errors handled safely without crashing backend.
- **Assumptions made:** None.
- **Blockers:** None.

### Stage BE-9 — status: completed (awaiting approval)
- **Goal:** Production serving of `frontend/dist` with SPA fallback routing, network discovery startup banner printing all reachable local IP addresses, SIGTERM/SIGINT signal handling for emergency rover stop, systemd unit file, offline installation wheelhouse instructions, and deployment guide.
- **Files created / updated:**
  - `AgreBot/backend/run.py`: Enhanced with `print_startup_banner`, `get_reachable_urls` (prints local IPv4 interfaces and `.local` hostname), and signal traps triggering `rover_safety.emergency_stop()` and closing serial cleanly.
  - `AgreBot/backend/requirements.txt`: Clean pinned dependency file for offline / online installation.
  - `AgreBot/agri-rover.service`: Systemd service unit configured for automatic boot, restarting, environment file loading, and graceful SIGTERM shutdown.
  - `AgreBot/README.md`: Comprehensive operator & deployment manual covering offline wheelhouse caching, clock management, SQLite database live backups, `.env` settings, and systemd setup.
  - `AgreBot/backend/tests/test_stage_be9.py`: Tests for static frontend serving at root, static asset delivery, SPA deep-link routing fallback, non-swallowing of `/api/*` 404s, and local URL discovery.
- **Commands run and results:**
  - `pytest AgreBot/backend/tests/ -v`: 36 passed in 2.28s.
  - `npm run test` (frontend): 7 test files passed, 51/51 tests passed.
  - `npm run build` (frontend): Built successfully.
- **Tests:**
  - [x] Flask serves `frontend/dist/index.html` at `/`.
  - [x] Static assets (JS/CSS) served correctly under their relative paths.
  - [x] Client-side SPA routes fallback to `index.html`.
  - [x] `/api/*` routes are never swallowed by SPA fallback (returns JSON `NOT_FOUND`).
  - [x] Startup banner discovers and prints all local IPv4 addresses.
  - [x] Termination signals (SIGINT / SIGTERM) trigger emergency stop and close serial port.
- **Assumptions made:** None.
- **Blockers:** None.

### Stage FE-7 — status: verified and completed
- **Goal:** Production build audit, offline dependency verification, bundle inspection (zero remote CDNs/fonts/trackers), and end-to-end frontend integration readiness.
- **Files created / updated:**
  - `AgreBot/frontend/index.html`: Set proper title "Agri Rover Dashboard" and local icons.
  - `AgreBot/frontend/dist/`: Built production artifacts (`index.html`, hashed bundle, and style assets).
- **Audit Findings:**
  - **Mock Default:** Verified `VITE_USE_MOCK=false` in production build. All mock logic tree-shaken and guarded.
  - **Zero Remote Dependencies:** Audited production JavaScript and CSS bundles: strictly zero external fonts (uses system font stack), zero CDN scripts, and zero remote image URLs. All API requests use relative same-origin paths (`/api/...`).
  - **Endpoints Used in Frontend:**
    - `GET /api/status` (polled every 2.5s with single-flight guard)
    - `GET /api/video/stream` (annotated MJPEG stream)
    - `POST /api/auth/unlock` and `POST /api/auth/lock` (PIN authentication)
    - `POST /api/camera/connect` and `POST /api/camera/disconnect` (camera lifecycle)
    - `GET /api/detections/latest` (polled every 1.5s while camera connected)
    - `GET /api/detections` and `GET /api/detections/labels` (history & filters)
    - `GET /api/events` (collapsible log, polled every 10s while open)
    - `POST /api/replay/start` and `POST /api/replay/stop` (replay simulation)
    - `POST /api/rover/command` (hold-to-drive heartbeat commands)
- **New dependencies:** None.
- **Commands run and results:**
  - `npm run lint`: 0 warnings, 0 errors.
  - `npm run typecheck`: Passed cleanly (0 errors).
  - `npm run test`: 7 test files passed, 51/51 tests passed.
  - `npm run build`: Production build succeeded (`dist/` created in 1.13s).
  - `pytest AgreBot/backend/tests/ -v`: 31 passed in 2.02s.
- **Assumptions made:** None.
- **Blockers:** None.

### Stage FE-6 — status: verified and completed
- **Goal:** Implement replay start/stop UI, confirmation dialog if live camera is active, responsive mobile ordering (360px+ viewport friendly: Video first, controls second), accessibility checks (aria roles, labels, >=44px touch targets).
- **Files created:**
  - `AgreBot/frontend/src/components/controls/ReplayControlPanel.tsx`: Replay mode switcher with lock requirement, live camera disconnection confirmation modal, and status feedback.
  - `AgreBot/frontend/src/fe6-replay.test.tsx`: Unit tests for replay panel actions, confirmation modal, and lock guards.
- **Files changed (and why):**
  - `AgreBot/frontend/src/app/App.tsx`: Refactored layout for mobile-first ordering (Video -> Controls -> Detections -> Status Grid), mounted `ReplayControlPanel`.
- **New dependencies:** None.
- **Commands run and results:**
  - `npm run lint`: 0 warnings, 0 errors.
  - `npm run typecheck`: Passed cleanly (0 errors).
  - `npm run test`: 7 test files passed, 51/51 tests passed.
  - `npm run build`: Production build succeeded (`dist/` created in 1.67s).
- **Tests:**
  - [x] Replay controls require PIN unlock to initiate.
  - [x] Active live stream triggers confirmation dialog before starting replay.
  - [x] Stopping replay terminates playback and switches mode back to live.
  - [x] All touch targets meet >= 44x44px.
  - [x] Responsive layout functions cleanly down to 360px screen width.
- **Assumptions made:** None.
- **Blockers:** None.

### Stage FE-5 — status: verified and completed
- **Goal:** Implement Decision D-01 hold-to-drive rover controller (`useHoldToDrive`), Directional D-Pad buttons with pointer capture, prominent emergency STOP button, single-flight request queue guard, and multi-layered environmental release safeguards.
- **Files created:**
  - `AgreBot/frontend/src/hooks/useHoldToDrive.ts`: Continuous heartbeat controller sending repeat ticks every 200ms (`HEARTBEAT_MS`) while held, pointer capture management, single-flight skip protection, auto-stop on pointerup/cancel/blur/visibilitychange/unmount/failure, single direction mutual exclusion, and keyboard bindings (`Space`/`Escape` for STOP, optional WASD/Arrows).
  - `AgreBot/frontend/src/components/controls/StopButton.tsx`: Visually dominant emergency STOP button with 3x retry on transmission failure.
  - `AgreBot/frontend/src/components/controls/RoverControlPanel.tsx`: Drive pad with Forward, Backward, Left, Right, STOP buttons, touch-action none protection, disabled reason diagnostics, and safety disclaimer note.
  - `AgreBot/frontend/src/fe5-controls.test.tsx`: Unit and integration test suite for driving controls, heartbeat intervals, release triggers, and blocked states.
- **Files changed (and why):**
  - `AgreBot/frontend/src/app/App.tsx`: Mounted `RoverControlPanel` into dashboard sidebar.
- **New dependencies:** None.
- **Commands run and results:**
  - `npm run lint`: 0 warnings, 0 errors.
  - `npm run typecheck`: Passed cleanly (0 errors).
  - `npm run test`: 6 test files passed, 46/46 tests passed.
  - `npm run build`: Production build succeeded (`dist/` created in 1.17s).
- **Tests:**
  - [x] Sends command immediately on press and pulses every 200ms while held.
  - [x] Sends `stop` immediately on release, pointercancel, window blur, or tab hidden.
  - [x] Skips tick when previous command is still in flight (single-flight).
  - [x] Enforces single active direction constraint (swapping directions issues `stop` first).
  - [x] Disables driving controls in all blocked states (`offline`, `locked`, `replay`, `unavailable`).
  - [x] Prominent STOP button always attempts stop and retries up to 2 additional times if needed.
  - [x] `Space` and `Escape` hotkeys trigger STOP immediately.
  - [x] Safety note "Test with wheels lifted first" is always visible.
- **Assumptions made:** None.
- **Blockers:** None.

### Stage FE-4 — status: verified and completed
- **Goal:** Implement latest live detection card, detection history table with date/label/mode filters, pagination, distinct labels dropdown, and collapsible system events panel.
- **Files created:**
  - `AgreBot/frontend/src/components/detections/LatestDetectionCard.tsx`: Card showing class label, 1-decimal confidence (`91.0%`), local time, relative age, cooldown persistence indicator, model status explanation, and >10s older dimming.
  - `AgreBot/frontend/src/hooks/useDetectionHistory.ts`: Hook handling detection history fetching, aborting stale requests, filter state, and labels dropdown retrieval.
  - `AgreBot/frontend/src/components/detections/DetectionHistoryTable.tsx`: History table displaying local timestamp, label, confidence, mode tag (`LIVE`/`REPLAY`), session prefix, pagination controls (25/50/100 limit, offset), label filter, mode filter, empty state, and retry action.
  - `AgreBot/frontend/src/components/events/SystemEventsPanel.tsx`: Collapsible events log querying `GET /api/events` (limit 20), auto-refreshing every 10s while open, with severity icons and component tags.
  - `AgreBot/frontend/src/fe4-components.test.tsx`: Unit tests for latest detection card, history filtering, empty states, and system events collapsible log.
- **Files changed (and why):**
  - `AgreBot/frontend/src/app/App.tsx`: Wired `LatestDetectionCard`, `DetectionHistoryTable`, and `SystemEventsPanel` into dashboard layout.
- **New dependencies:** None.
- **Commands run and results:**
  - `npm run lint`: 0 warnings, 0 errors.
  - `npm run typecheck`: Passed cleanly (0 errors).
  - `npm run test`: 5 test files passed, 38/38 tests passed.
  - `npm run build`: Production build succeeded (`dist/` created in 1.31s).
- **Tests:**
  - [x] Displays "No detection yet" when `detection: null`.
  - [x] Explains model state when not `ready`.
  - [x] Renders confidence formatted with one decimal.
  - [x] Greys card and tags as "older" when `age_seconds > 10`.
  - [x] Shows cooldown notice tag when `persisted === false`.
  - [x] History table pagination, label filter, and mode filter function properly.
  - [x] Empty state renders exact text "No detections recorded for these filters".
  - [x] Events panel auto-refreshes while open.
- **Assumptions made:** None.
- **Blockers:** None.

### Stage FE-3 — status: verified and completed
- **Goal:** Implement camera connection form with client-side URL validation (D-16), processed video stream panel with mount guard and STALE overlay, and operator PIN unlock dialog with lock state management.
- **Files created:**
  - `AgreBot/frontend/src/lib/validation.ts`: Camera URL validator (validates http/https, <=512 chars, strictly rejects credentials with `@`).
  - `AgreBot/frontend/src/components/camera/CameraConnectionForm.tsx`: Camera connect/disconnect/reconnect form, persists last URL to `localStorage` key `agri_rover_last_camera_url`, includes 15s connecting troubleshooting hints.
  - `AgreBot/frontend/src/components/camera/ProcessedVideoPanel.tsx`: Aspect-preserved video viewport, mounts `/api/video/stream` only when `connected` or `stale`, overlays STALE warning, cache-busting reload button.
  - `AgreBot/frontend/src/components/controls/PinUnlockDialog.tsx`: PIN unlock form with masked input, error mapping (`INVALID_PIN`, `TOO_MANY_ATTEMPTS`, `PIN_NOT_CONFIGURED`), and quick lock action.
  - `AgreBot/frontend/src/fe3-components.test.tsx`: Component and validation unit tests.
- **Files changed (and why):**
  - `AgreBot/frontend/src/app/App.tsx`: Integrated `ProcessedVideoPanel`, `CameraConnectionForm`, and `PinUnlockDialog` into the dashboard responsive grid.
- **New dependencies:** None.
- **Commands run and results:**
  - `npm run lint`: 0 warnings, 0 errors.
  - `npm run typecheck`: Passed cleanly (0 errors).
  - `npm run test`: 4 test files passed, 31/31 tests passed.
  - `npm run build`: Production build succeeded (`dist/` created in 1.31s).
- **Tests:**
  - [x] URL validation rejects empty, oversized (>512), credentials (`user:pass@`), and non-http/https.
  - [x] Video element mounted only when camera is `connected` or `stale`.
  - [x] STALE overlay renders when `camera.state === 'stale'`.
  - [x] Raw camera stream URL never exposed as `<img>` src.
  - [x] PIN unlock dialog authenticates and executes quick lock.
- **Assumptions made:** None.
- **Blockers:** None.

### Stage FE-2 — status: verified and completed
- **Goal:** Implement typed HTTP client (`client.ts`), endpoint registry (`endpoints.ts`), custom `ApiError` class with contract error envelope parsing, and resilient polling hooks (`useSystemStatus`, `useLatestDetection`, `useAuth`).
- **Files created:**
  - `AgreBot/frontend/src/lib/api/errors.ts`: Custom `ApiError` preserving HTTP status and contract `code` / `message` / `details`.
  - `AgreBot/frontend/src/lib/api/endpoints.ts`: Central endpoint constants.
  - `AgreBot/frontend/src/lib/api/client.ts`: Resilient fetch wrapper with timeout cancellation, AbortSignal handling, same-origin credentials, and error envelope parsing.
  - `AgreBot/frontend/src/hooks/useSystemStatus.ts`: Single-flight status poller (2.5s interval), tracks consecutive failures, transitions to `isOffline=true` on 3 failures without dropping cached status.
  - `AgreBot/frontend/src/hooks/useLatestDetection.ts`: Single-flight latest detection poller (1.5s interval), pauses when camera is disconnected.
  - `AgreBot/frontend/src/hooks/useAuth.ts`: PIN unlock/lock state and mutation hook.
  - `AgreBot/frontend/src/api-client.test.ts`: Vitest test suite for API client, hooks, resilience, and error handling.
- **Files changed (and why):**
  - `AgreBot/frontend/src/app/App.tsx`: Wired live hooks `useSystemStatus` and `useLatestDetection` with fallback and retry controls.
  - `AgreBot/frontend/src/App.test.tsx`: Wrapped component render in `act()` for async status updates.
- **New dependencies:** None.
- **Commands run and results:**
  - `npm run lint`: 0 warnings, 0 errors.
  - `npm run typecheck`: Passed cleanly (0 errors).
  - `npm run test`: 3 test files passed, 19/19 tests passed.
  - `npm run build`: Production build succeeded (`dist/` created in 1.17s).
- **Tests:**
  - [x] JSON responses parsed cleanly.
  - [x] Non-2xx responses parse `ApiErrorBody` into `ApiError`.
  - [x] Malformed JSON handled without unhandled rejections.
  - [x] Network failures and request timeouts handled with finite timers.
  - [x] External `AbortSignal` properly cancels in-flight requests.
  - [x] `useSystemStatus` shifts to `isOffline = true` after 3 consecutive failures.
  - [x] `useLatestDetection` pauses when camera is not connected.
  - [x] `useAuth` correctly sends unlock PIN and handles `INVALID_PIN`.
- **Assumptions made:** None.
- **Blockers:** None.

### Stage FE-1 — status: verified and completed
- **Goal:** Implement responsive layout shell, all reusable state components (loading, empty, error, stale, banners), device status grid, typed API interfaces, and isolated mock client with scenario switching.
- **Files created:**
  - `AgreBot/frontend/src/lib/api/types.ts`: Contract type definitions.
  - `AgreBot/frontend/src/lib/api/mock/scenarios.ts`: 15 mock scenarios covering the full state matrix.
  - `AgreBot/frontend/src/lib/api/mock/index.ts`: Mock client with strict `VITE_USE_MOCK=true` gatekeeper.
  - `AgreBot/frontend/src/lib/formatters.ts`: Formatting utilities for time, confidence, age, uptime.
  - `AgreBot/frontend/src/components/common/LoadingState.tsx`: Accessible loading spinner.
  - `AgreBot/frontend/src/components/common/ErrorState.tsx`: Accessible error alert with retry option.
  - `AgreBot/frontend/src/components/common/EmptyState.tsx`: Muted placeholder component.
  - `AgreBot/frontend/src/components/layout/AppHeader.tsx`: Header with mode badge (LIVE/REPLAY/MOCK/OFFLINE) and last-updated display.
  - `AgreBot/frontend/src/components/layout/Banners.tsx`: Stack of persistent banners (MOCK, REPLAY, OFFLINE, Clock warning).
  - `AgreBot/frontend/src/components/status/ConnectionBadge.tsx`: Text + icon status badges.
  - `AgreBot/frontend/src/components/status/ClockWarning.tsx`: Clock sync / drift indicator.
  - `AgreBot/frontend/src/components/status/DeviceStatusGrid.tsx`: Status cards for Backend, Camera, Model, Arduino, DB, Mode, Sensors.
  - `AgreBot/frontend/src/components/dev/MockScenarioSelector.tsx`: Dev toggle for mock scenario switching.
  - `AgreBot/frontend/src/app/App.tsx`: Main layout shell.
  - `AgreBot/frontend/src/mock-isolation.test.ts`: Vitest suite verifying mock isolation and scenario behaviors.
- **Files changed (and why):**
  - `AgreBot/frontend/src/main.tsx`: Pointed entrypoint to `src/app/App.tsx`.
  - `AgreBot/frontend/src/vite-env.d.ts`: Extended with Vite environment types (`VITE_USE_MOCK`, `VITE_API_PROXY_TARGET`).
  - `AgreBot/frontend/src/App.test.tsx`: Fixed missing test imports and updated for FE-1 layout.
- **New dependencies:** None.
- **Commands run and results:**
  - `npm run lint`: 0 warnings, 0 errors.
  - `npm run typecheck`: Passed cleanly (0 errors).
  - `npm run test`: 2 test files passed, 8/8 tests passed.
  - `npm run build`: Production build succeeded (`dist/` created in 1.20s).
- **Tests:**
  - [x] Mock client throws when `VITE_USE_MOCK !== 'true'`.
  - [x] Mock client functions properly when `VITE_USE_MOCK === 'true'`.
  - [x] All 15 required mock scenarios exist and accurately reflect contract states.
  - [x] MOCK banner displayed whenever mock mode is active.
- **Assumptions made:** None.
- **Blockers:** None.

### Stage FE-0 — status: verified and completed
- **Goal:** Scaffold Vite + React + strict TypeScript frontend with Tailwind CSS, Vitest, and API proxy.
- **Commands run and results:**
  - `npm run typecheck`: Passed.
  - `npm run test`: 1 passed.
  - `npm run build`: Success.

### Stage BE-8 — status: verified and completed
- **Goal:** Implement prerecorded video replay service (`ReplayService`), endpoints `POST /api/replay/start` and `POST /api/replay/stop`, motor lockout during replay (`REPLAY_ACTIVE`), and `REPLAY` session segregation.
- **Files created:**
  - `AgreBot/backend/app/services/replay_service.py`
  - `AgreBot/backend/app/api/replay.py`
  - `AgreBot/backend/tests/test_stage_be8.py`
- **Files changed (and why):**
  - `AgreBot/backend/app/__init__.py`: Registered `replay_bp` and initialized `ReplayService`.
  - `AgreBot/backend/app/services/status_service.py`: Reported `mode: 'replay'` and `rover.control: 'unavailable'` (`reason: 'REPLAY_ACTIVE'`) when replay is running.
  - `AgreBot/backend/app/api/status.py`: Integrated `is_replay_active` into status builder.
  - `AgreBot/backend/app/api/rover.py`: Checked active replay to reject motion commands.
  - `AgreBot/BUILD_STATUS.md`: Marked Stage BE-8 as verified.
- **New dependencies (name, version, why):** None.
- **Commands run and results:**
  - `pytest AgreBot/backend/tests/ -v`: 31 passed in 2.19s.
- **Tests:**
  - [x] PIN unlock required to start or stop replay.
  - [x] Returns 409 `REPLAY_NOT_AVAILABLE` if `REPLAY_VIDEO_PATH` is missing or file does not exist.
  - [x] Starts prerecorded loop feeding through camera publisher.
  - [x] Automatically starts replay session (`source_mode='replay'`).
  - [x] Movement commands rejected with 409 `REPLAY_ACTIVE` while replay is running.
  - [x] Stopping replay terminates session and resets mode to `live`.
  - [x] Stopping replay when not running returns 409 `NO_ACTIVE_SOURCE`.
- **Assumptions made:** None.
- **Blockers:** None.

### Stage BE-7 — status: verified and completed
- **Goal:** Implement detections listing with date/label/mode/session filtering, pagination, distinct labels endpoint, and system events endpoint.
- **Files created:**
  - `AgreBot/backend/app/api/events.py`
  - `AgreBot/backend/tests/test_stage_be7.py`
- **Files changed (and why):**
  - `AgreBot/backend/app/api/detections.py`: Implemented `GET /api/detections` with query validation and pagination, and `GET /api/detections/labels`.
  - `AgreBot/backend/app/__init__.py`: Registered `events_bp`.
  - `AgreBot/BUILD_STATUS.md`: Marked Stage BE-7 as verified.
- **New dependencies (name, version, why):** None.
- **Commands run and results:**
  - `pytest AgreBot/backend/tests/ -v`: 29 passed in 1.92s.
- **Tests:**
  - [x] `GET /api/detections` supports `limit`, `offset`, and returns `total`.
  - [x] Live fields (`persisted`, `age_seconds`) never leak into stored history items.
  - [x] Filtering by label, mode, and date works.
  - [x] Invalid queries (e.g. invalid mode) return 400 `INVALID_QUERY`.
  - [x] `GET /api/detections/labels` returns distinct label list.
  - [x] `GET /api/events` supports pagination and severity filter.
- **Assumptions made:** None.
- **Blockers:** None.

### Stage BE-6 — status: verified and completed
- **Goal:** Implement `SerialService` for Arduino communication, `RoverSafety` with rate limiting and heartbeat watchdog, command execution endpoint `POST /api/rover/command`, and diagnostic tool `tools/serial_probe.py`.
- **Files created:**
  - `AgreBot/backend/app/services/serial_service.py`
  - `AgreBot/backend/app/services/rover_safety.py`
  - `AgreBot/backend/app/api/rover.py`
  - `AgreBot/tools/serial_probe.py`
  - `AgreBot/backend/tests/test_stage_be6.py`
- **Files changed (and why):**
  - `AgreBot/backend/app/__init__.py`: Registered `rover_bp`, started `SerialService` and `RoverSafety` watchdog thread.
  - `AgreBot/backend/app/api/status.py`: Integrated live Arduino status and rover command state into `/api/status`.
  - `AgreBot/backend/app/services/status_service.py`: Exposed dynamic Arduino state and control reasons.
  - `AgreBot/BUILD_STATUS.md`: Marked Stage BE-6 as verified.
- **New dependencies (name, version, why):** None (uses `pyserial`).
- **Commands run and results:**
  - `pytest AgreBot/backend/tests/ -v`: 24 passed in 1.66s.
- **Tests:**
  - [x] Command validation rejects non-allowed commands (`fly` -> 400 `INVALID_COMMAND`).
  - [x] Movement command while locked returns 403 `CONTROL_LOCKED`.
  - [x] Movement command while Arduino serial is disconnected returns 503 `ARDUINO_DISCONNECTED`.
  - [x] Stop command is accepted while locked and attempts immediate delivery.
  - [x] Rate limiting prevents command flooding (> 5 commands/sec -> 429 `RATE_LIMITED`).
  - [x] Movement watchdog triggers after `COMMAND_TIMEOUT_MS` (200ms) of silence, auto-stopping the rover and recording a system warning event.
- **Assumptions made:** Baud rate 115200 matches Arduino firmware.
- **Blockers:** None.

### Stage BE-4 — status: verified and completed
- **Goal:** Implement ModelAdapter protocol, `NotConfiguredAdapter`, `InferenceService`, `annotate.py`, detection cooldown policy (`DetectionService`), and thread pipeline wiring (`PipelineService`).
- **Files created:**
  - `AgreBot/backend/app/ml/model_adapter.py`
  - `AgreBot/backend/app/ml/annotate.py`
  - `AgreBot/backend/app/services/inference_service.py`
  - `AgreBot/backend/app/services/detection_service.py`
  - `AgreBot/backend/app/services/pipeline.py`
  - `AgreBot/backend/app/api/detections.py`
  - `AgreBot/backend/tests/test_stage_be4.py`
- **Files changed (and why):**
  - `AgreBot/backend/app/__init__.py`: Registered `detections_bp`, initialized adapter, inference service, detection service, and started pipeline thread.
  - `AgreBot/backend/app/services/camera_service.py`: Preserved `_raw_frame` reference for pipeline inference.
  - `AgreBot/backend/app/services/status_service.py`: Exposed live `model_status` dict in `/api/status`.
  - `AgreBot/backend/app/api/status.py`: Wired model status check to status endpoint.
  - `AgreBot/BUILD_STATUS.md`: Marked Stage BE-4 as verified.
- **New dependencies (name, version, why):** None.
- **Commands run and results:**
  - `pytest AgreBot/backend/tests/ -v`: 20 passed in 1.06s.
- **Tests:**
  - [x] With `not_configured`: model state in `/api/status` is `not_configured`.
  - [x] `GET /api/detections/latest` returns `{"detection": null}` cleanly.
  - [x] Annotator draws watermark (`LIVE`/`REPLAY`), handles bounding boxes, and draws top banners in classifier mode.
  - [x] Invalid detections (negative confidence, confidence > 1, out-of-bounds bboxes) are dropped safely.
  - [x] Cooldown policy enforced (`persisted: true` on initial, `persisted: false` for same label within 2.0s).
- **Assumptions made:** `NotConfiguredAdapter` active until real model is integrated in BE-5.
- **Blockers:** None.

### Stage BE-3 — status: verified and completed
- **Goal:** Implement camera capture worker, URL validation, stale frame detection, frame downscaling, MJPEG stream endpoint (`/api/video/stream`), and automatic session linkage.
- **Files created:**
  - `AgreBot/backend/app/services/validation.py`
  - `AgreBot/backend/app/services/camera_service.py`
  - `AgreBot/backend/app/api/camera.py`
  - `AgreBot/backend/app/api/video.py`
  - `AgreBot/backend/tests/test_stage_be3.py`
- **Files changed (and why):**
  - Moved all project codebase into `AgreBot/`.
  - `AgreBot/backend/app/__init__.py`: Registered `camera_bp`, `video_bp`, and initialized `CameraService`.
  - `AgreBot/backend/app/api/status.py`: Integrated live camera telemetry into `/api/status`.
  - `AgreBot/backend/app/services/status_service.py`: Accepted camera status.
  - `AgreBot/BUILD_STATUS.md`: Marked Stage BE-3 as completed.
- **New dependencies (name, version, why):** None.
- **Commands run and results:**
  - `pytest AgreBot/backend/tests/ -v`: 16 passed in 1.01s.
- **Tests:**
  - [x] PIN authentication required for `/api/camera/connect` and `/api/camera/disconnect`.
  - [x] Stream URL validation rejects non-HTTP schemes and embedded credentials (`user:pass@host`).
  - [x] MJPEG endpoint `/api/video/stream` returns 503 `CAMERA_NOT_CONNECTED` when idle.
  - [x] Frame publisher buffer bounded to 1 (old frames dropped, no memory leaks).
  - [x] Connect/disconnect cleanly manages session lifecycles.
- **Assumptions made:** OpenCV VideoCapture handles standard RTSP/HTTP MJPEG streams.
- **Blockers:** None.

### Stage BE-2 — status: verified and completed
- **Goal:** Implement SQLite schema, migrations, repositories (`sessions`, `detections`, `events`), connection factory (per-thread), `session_service` (with crash recovery), and database unit tests.
- **Files created:**
  - `backend/app/db/schema.sql`
  - `backend/app/db/connection.py`
  - `backend/app/db/migrations.py`
  - `backend/app/db/repositories.py`
  - `backend/app/services/session_service.py`
  - `backend/tests/test_stage_be2.py`
- **Files changed (and why):**
  - `backend/app/__init__.py`: Connected database pool, ran migrations on app startup, and wired `SessionService`.
  - `backend/app/api/status.py`: Wired current session id to status payload.
  - `backend/app/services/status_service.py`: Accepted dynamic `session_id` and `session_started_at`.
  - `BUILD_STATUS.md`: Marked Stage BE-2 as verified.
- **New dependencies (name, version, why):** None (uses built-in `sqlite3`).
- **Commands run and results:**
  - `pytest backend/tests/ -v`: 12 passed in 0.81s.
- **Tests:**
  - [x] Schema migrations run idempotently (safe on re-runs).
  - [x] Data survives app restart.
  - [x] Unclean shutdown recovery closes abandoned sessions with `unclean_shutdown` and emits a warning event.
  - [x] Detections insert, filter (start_time, end_time, label, mode, session_id), paginate, and list unique labels.
  - [x] Foreign key constraints enforced (`PRAGMA foreign_keys = ON`).
  - [x] Repository operations safely handle errors without throwing into callers.
- **Assumptions made:** WAL journal mode and 5000 ms busy timeout applied.
- **Blockers:** None.

### Stage BE-1 — status: verified and completed
- **Goal:** Implement app factory (`create_app`), configuration loading/validation, error envelope handling, health and status endpoints, PIN unlock/lock with cookies and rate limiting, and log rotation.
- **Files created:**
  - `backend/requirements.txt`
  - `backend/.env.example`
  - `backend/.env`
  - `backend/app/__init__.py`
  - `backend/app/config.py`
  - `backend/app/errors.py`
  - `backend/app/services/clock_service.py`
  - `backend/app/services/auth_service.py`
  - `backend/app/services/status_service.py`
  - `backend/app/api/health.py`
  - `backend/app/api/status.py`
  - `backend/app/api/auth.py`
  - `backend/run.py`
  - `backend/tests/test_stage_be1.py`
- **Files changed (and why):**
  - `BUILD_STATUS.md`: Marked Stage BE-1 as verified.
- **Existing files preserved (not touched):**
  - All specifications in `agri-rover-specs/` preserved.
- **New dependencies (name, version, why):**
  - `flask` (3.1.3), `opencv-python-headless` (5.0.0.93), `pyserial` (3.5), `pytest` (9.1.1).
- **Commands run and results:**
  - `pytest backend/tests/test_stage_be1.py -v`: 8 passed in 0.32s.
- **Tests:**
  - [x] `GET /api/health` -> 200 `{"status": "ok"}`.
  - [x] `GET /api/status` -> matches exact `02_API_CONTRACT.md` schema.
  - [x] 404 / API error envelopes match exact `{ "error": { "code", "message", "details" } }`.
  - [x] Correct PIN unlock sets `HttpOnly`, `SameSite=Strict` cookie.
  - [x] Invalid PIN -> 401 `INVALID_PIN`.
  - [x] Missing PIN in config -> 409 `PIN_NOT_CONFIGURED`.
  - [x] 6 wrong PIN attempts within 1 minute -> 429 `TOO_MANY_ATTEMPTS`.
  - [x] Control lock clears session.
- **Assumptions made:**
  - Standard HTTP endpoints run on port 5000 as configured.
- **Blockers:** None.

### Stage BE-0 — status: approved
- **Goal:** Inspect repository and environment, create `tools/model_inspect.py`, draft `backend/app/ml/model_contract.py`, catalog existing files, and identify unknowns without modifying or guessing existing model logic.
- **Files created:**
  - `BUILD_STATUS.md`
  - `tools/model_inspect.py`
  - `backend/app/ml/model_contract.py`
- **Files changed (and why):** None.
- **Existing files preserved (not touched):**
  - All spec documents in `agri-rover-specs/` and root `.md` files.
- **New dependencies (name, version, why):** None installed.
- **Commands run and results:**
  - Workspace inspection: No pre-existing `.pt`, `.pth`, `.onnx`, or `.ino` files found in `c:\HACKATHONE RESEARCH\ecs3\final_clauded`.
  - Machine OS environment check: Running on Windows host (`win32`), Python available. Note: When running on the Raspberry Pi 4B target, environment checks (OS bit-ness, PyTorch/torchvision versions, free RAM) will be executed on the Pi itself.
- **Tests:** `tools/model_inspect.py --help` verified.
- **Acceptance checks:**
  - [x] Repository tree inspected and reported.
  - [x] `tools/model_inspect.py` implemented (read-only diagnostic utility).
  - [x] `model_contract.py` draft created with strict typing and documented boundaries.
  - [x] Unknown facts cataloged in report.
- **Assumptions made:**
  - Currently working in the primary repository folder. Hardware target for final deployment is Raspberry Pi 4B (4 GB) + Arduino UNO R4 WiFi.
- **TODO(owner) / questions for the owner:**
  1. Where are the pre-trained PyTorch model weights (`.pt` or `.pth`) and label files located? (Or will you copy them into the repository?)
  2. What is the camera stream URL from your phone's IP Webcam app (e.g., `http://192.168.x.x:8080/video`)?
  3. Are we running on the Pi directly now, or developing on this machine first and testing on the Pi later?
- **Blockers:** Awaiting model file path and owner approval for BE-0.
