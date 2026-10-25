"""clock_service.py - Check system clock synchronization.

Checks timedatectl on Linux / Pi to see if NTP is synchronized.
Returns None if command is unavailable or platform is Windows/macOS.
"""
import shutil
import subprocess
from typing import Optional

class ClockService:
    @staticmethod
    def is_ntp_synchronized() -> Optional[bool]:
        """Check if system clock is synchronized via NTP (Linux)."""
        if not shutil.which("timedatectl"):
            return None
        try:
            res = subprocess.run(
                ["timedatectl", "show", "-p", "NTPSynchronized", "--value"],
                capture_output=True,
                text=True,
                timeout=1.0,
                check=False
            )
            val = res.stdout.strip().lower()
            if val == "yes":
                return True
            if val == "no":
                return False
            return None
        except Exception:
            return None
