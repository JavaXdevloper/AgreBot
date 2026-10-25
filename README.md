# Agri Rover Inspection System — Deployment & Operator Guide

The **Agri Rover** is a local-network-only agricultural inspection and control rover built on a **Raspberry Pi 4B**, an **Arduino UNO R4 WiFi**, and a **React dashboard**.

---

## 1. Quick Start (Development / Standalone Run)

### Backend (Python 3.10+)
```bash
cd backend
python -m venv venv
# Linux / macOS
source venv/bin/activate
# Windows PowerShell
.\venv\Scripts\Activate.ps1

pip install -r requirements.txt
python run.py
```

### Frontend (Build Artifacts)
The frontend builds static artifacts into `frontend/dist`, which the Flask backend automatically serves at `http://<pi-ip>:5000/`:
```bash
cd frontend
npm install
npm run build
```

---

## 2. Environment Configuration (`.env`)

Create or update `backend/.env`:
```ini
HOST=0.0.0.0
PORT=5000
DEBUG=false
LOG_LEVEL=INFO
LOG_DIR=backend/instance/logs
DATABASE_PATH=backend/instance/rover_history.db
FRONTEND_DIST_PATH=../frontend/dist

# Hardware Serial Link
SERIAL_PORT=auto
SERIAL_BAUD=115200
COMMAND_TIMEOUT_MS=400
COMMAND_MAX_PER_SECOND=10

# Security PIN (Masked Operator Unlock)
CONTROL_PIN=1234
SESSION_IDLE_MINUTES=30
PIN_MAX_ATTEMPTS_PER_MINUTE=5

# Camera & Inference Pipeline
FRAME_MAX_WIDTH=640
JPEG_QUALITY=75
STALE_FRAME_SECONDS=5
DETECTION_COOLDOWN_SECONDS=2.0
```

---

## 3. Offline Installation & Zero-Internet Guarantee

The rover is designed to operate completely offline in agricultural fields without external internet or cloud dependencies:

### Preparing Offline Wheels (on an internet-connected PC)
```bash
mkdir -p wheelhouse
pip download -r backend/requirements.txt -d wheelhouse/
```

### Installing on the Offline Raspberry Pi
```bash
pip install --no-index --find-links=wheelhouse/ -r backend/requirements.txt
```

---

## 4. Raspberry Pi Autostart (`systemd`)

To start the dashboard and safety controller automatically upon Pi boot:

1. Copy the service unit:
   ```bash
   sudo cp agri-rover.service /etc/systemd/system/agri-rover.service
   ```
2. Enable and start:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable agri-rover.service
   sudo systemctl start agri-rover.service
   ```
3. Inspect status or logs:
   ```bash
   sudo systemctl status agri-rover.service
   journalctl -u agri-rover -f
   ```

---

## 5. Clock Synchronization & Offline Warnings

- In the field without internet, the Pi's real-time clock may drift.
- If `ntp_synchronized` is false or the Pi clock differs from the operator's phone/laptop by $> 2$ minutes, the dashboard prominently displays a **Clock Warning** banner.
- To set the Pi's clock manually when offline:
  ```bash
  sudo date -s "2026-10-25 12:00:00"
  ```

---

## 6. Database Backups

Inspection detections and system events are saved to SQLite in WAL mode:
- File location: `backend/instance/rover_history.db`
- To safely backup while the server is live:
  ```bash
  sqlite3 backend/instance/rover_history.db ".backup 'rover_history_backup.db'"
  ```

---

## 7. Troubleshooting Checklist

| Issue | Cause | Remedy |
| :--- | :--- | :--- |
| **OFFLINE Badge in UI** | Backend not reachable | Ensure device is on the same local Wi-Fi / hotspot. Check `python run.py` output. |
| **Camera Connecting Loop** | Wrong IP or port | Verify the phone screen's URL in IP Webcam. Ensure phone and Pi share the same Wi-Fi subnet. |
| **Motor Controls Locked** | Operator PIN required | Click Unlock in the Operator Auth panel and enter your PIN (default: `1234`). |
| **Arduino Disconnected** | USB cable unseated | Check USB connection to Arduino UNO R4. Ensure `SERIAL_PORT=auto` or specify `/dev/ttyACM0`. |
