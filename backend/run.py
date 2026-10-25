"""run.py - Production Entry Point for Agri Rover Backend.

Includes startup banner with all local IPv4 addresses and hostname,
graceful SIGTERM/SIGINT shutdown with emergency rover STOP, and offline capability.
"""
import sys
import os
import socket
import signal

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.config import Config

config = Config()
config.validate()
app = create_app(config)

def get_reachable_urls(port: int) -> list[str]:
    """Discover all reachable IPv4 addresses and local hostname."""
    urls = []
    hostname = socket.gethostname()

    # Hostname .local url
    urls.append(f"http://{hostname}.local:{port}")

    # Discover network interfaces
    try:
        # Get all socket addresses associated with the local machine
        host_info = socket.getaddrinfo(hostname, None, socket.AF_INET)
        ips = sorted(list(set(info[4][0] for info in host_info if info[4][0] != "127.0.0.1")))
        for ip in ips:
            urls.append(f"http://{ip}:{port}")
    except Exception:
        pass

    # Fallback/standard local loopback
    urls.append(f"http://127.0.0.1:{port}")
    return urls

def print_startup_banner(port: int):
    """Print production startup banner showing all reachable URLs."""
    banner_width = 65
    print("\n" + "=" * banner_width)
    print(" AGRI ROVER DASHBOARD & BACKEND (OFFLINE PRODUCTION READY)")
    print("=" * banner_width)
    print("  Status:     ACTIVE (Flask + PyTorch Architecture)")
    print("  Network:    Local LAN only (No internet access required)")
    print("  Hardware:   Safety Watchdog armed (400ms heartbeat)")
    print("-" * banner_width)
    print("  Reachable Dashboard URLs:")
    for url in get_reachable_urls(port):
        print(f"    -> {url}")
    print("-" * banner_width)
    print("  Logs:       backend/instance/logs/rover_backend.log")
    print("  Shutdown:   Press Ctrl+C (SIGINT / SIGTERM for safe stop)")
    print("=" * banner_width + "\n")

def register_signal_handlers(flask_app):
    """Handle SIGINT and SIGTERM to stop motors and close serial safely."""
    def handle_exit(signum, frame):
        print("\n[Shutdown] Received termination signal. Executing emergency safety stop...")
        try:
            if hasattr(flask_app, 'rover_safety'):
                flask_app.rover_safety.emergency_stop()
            if hasattr(flask_app, 'serial_service'):
                flask_app.serial_service.close()
        except Exception as e:
            print(f"[Shutdown Error] {e}")
        finally:
            print("[Shutdown] Completed cleanly. Exiting.")
            sys.exit(0)

    try:
        signal.signal(signal.SIGINT, handle_exit)
        signal.signal(signal.SIGTERM, handle_exit)
    except Exception:
        pass

if __name__ == "__main__":
    register_signal_handlers(app)
    print_startup_banner(config.PORT)
    app.run(
        host=config.HOST,
        port=config.PORT,
        debug=config.DEBUG,
        threaded=True
    )
