"""validation.py - URL and parameter validation according to 02_API_CONTRACT.md."""
import urllib.parse
from app.errors import ApiError

def validate_stream_url(url: str) -> str:
    if not url or not isinstance(url, str):
        raise ApiError("INVALID_URL", "Camera stream URL is required.", 400)

    url_str = url.strip()
    if len(url_str) > 512:
        raise ApiError("INVALID_URL", "Camera stream URL exceeds maximum length of 512 characters.", 400)

    # Support local camera device indices (e.g. "0", "1") for testing without an IP phone
    if url_str.isdigit():
        return url_str

    parsed = urllib.parse.urlsplit(url_str)
    if parsed.scheme.lower() not in ("http", "https"):
        raise ApiError("INVALID_URL", "Stream URL must start with http:// or https:// (or specify camera index '0')", 400)

    if not parsed.netloc:
        raise ApiError("INVALID_URL", "Stream URL is missing host address.", 400)

    # Hard decision D-16: Reject URLs with embedded credentials (user:pass@host)
    if parsed.username or parsed.password:
        raise ApiError(
            "INVALID_URL",
            "Stream URLs with embedded usernames/passwords are not allowed. Please disable authentication in IP Webcam.",
            400
        )

    return url_str
