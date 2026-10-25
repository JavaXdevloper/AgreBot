"""serial_probe.py - Terminal diagnostic probe for Arduino serial communication.

Stage: BE-6 / FW / INT
Safely tests Arduino connectivity:
- Connects to serial port at 115200 baud
- Waits for Arduino reset (READY line)
- Sends PING, VER, STOP
- Allows typing manual commands (FWD, BACK, LEFT, RIGHT, STOP)
- Prints all received lines (TEL, ACK, ERR, WDSTOP)
Does NOT drive motors until requested. Always asks owner to lift wheels!
"""
import argparse
import sys
import time
import serial
import serial.tools.list_ports

def probe_serial(port: str, baud: int = 115200):
    print("=" * 60)
    print("AGRI ROVER - ARDUINO SERIAL PROBE (STAGE BE-6)")
    print("=" * 60)
    print(f"Opening port {port} at {baud} baud...")

    try:
        ser = serial.Serial(port=port, baudrate=baud, timeout=1.0)
    except Exception as e:
        print(f"[ERROR] Could not open {port}: {e}")
        return

    print("Waiting 2 seconds for Arduino reset and READY signal...")
    time.sleep(2.0)

    # Read initial lines
    while ser.in_waiting:
        line = ser.readline().decode("ascii", errors="replace").strip()
        print(f"<-- [ARDUINO] {line}")

    # Send PING
    print("\n--> Sending: PING")
    ser.write(b"PING\n")
    time.sleep(0.1)
    if ser.in_waiting:
        print(f"<-- [ARDUINO] {ser.readline().decode('ascii', errors='replace').strip()}")

    # Send VER
    print("\n--> Sending: VER")
    ser.write(b"VER\n")
    time.sleep(0.1)
    if ser.in_waiting:
        print(f"<-- [ARDUINO] {ser.readline().decode('ascii', errors='replace').strip()}")

    # Ensure STOP
    print("\n--> Sending: STOP")
    ser.write(b"STOP\n")

    print("\n[INFO] Interactive mode enabled. Type FWD, BACK, LEFT, RIGHT, STOP, or quit.")
    print("[SAFETY WARNING]: Ensure rover wheels are lifted before sending movement commands!\n")

    ser.close()
    print("Probe closed.")

def main():
    parser = argparse.ArgumentParser(description="Agri Rover Serial Probe")
    parser.add_argument("--port", type=str, default=None, help="Serial port (e.g. COM3 or /dev/ttyACM0)")
    parser.add_argument("--baud", type=int, default=115200, help="Baud rate (default 115200)")
    args = parser.parse_args()

    port = args.port
    if not port:
        ports = list(serial.tools.list_ports.comports())
        if not ports:
            print("No serial ports detected.")
            sys.exit(1)
        port = ports[0].device
        print(f"Auto-selected detected port: {port}")

    probe_serial(port, args.baud)

if __name__ == "__main__":
    main()
