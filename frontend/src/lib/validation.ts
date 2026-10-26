export interface ValidationResult {
  valid: boolean;
  error: string | null;
}

export function validateCameraUrl(url: string): ValidationResult {
  if (!url || !url.trim()) {
    return { valid: false, error: 'Stream URL is required' };
  }

  const trimmed = url.trim();

  if (trimmed.length > 512) {
    return { valid: false, error: 'Stream URL cannot exceed 512 characters' };
  }

  // Reject embedded credentials
  if (trimmed.includes('@')) {
    return { valid: false, error: 'Stream URL must not contain credentials (user:pass@)' };
  }

  // Allow numeric camera device index for local webcam testing
  if (/^\d+$/.test(trimmed)) {
    return { valid: true, error: null };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'Stream URL protocol must be http:// or https://' };
    }
    if (!parsed.hostname) {
      return { valid: false, error: 'Stream URL must include a valid host' };
    }
  } catch {
    return { valid: false, error: 'Invalid URL format. Example: http://192.168.1.50:8080/video' };
  }

  return { valid: true, error: null };
}
