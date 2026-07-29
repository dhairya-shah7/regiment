function getBrowserOrigin() {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

function getBrowserLocation() {
  if (typeof window === 'undefined') return null;
  return window.location;
}

function getInjectedConfig() {
  if (typeof window === 'undefined') return {};
  return window.__SENTINELOPS_CONFIG__ || window.__SENTINELOPS_RUNTIME__ || {};
}

function isLocalOrPrivateHost(hostname = '') {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)
  );
}

function resolveConfiguredOrigin(value, fallback) {
  try {
    return new URL(value, fallback || undefined).origin;
  } catch {
    return fallback;
  }
}

export function getApiOrigin() {
  const fallback = getBrowserOrigin();
  const injected = String(getInjectedConfig().apiBaseUrl || '').trim();
  const configured = injected || String(import.meta.env.VITE_API_BASE_URL || '').trim();

  if (configured) {
    return resolveConfiguredOrigin(configured, fallback);
  }

  const location = getBrowserLocation();
  if (!location) return fallback;

  if (isLocalOrPrivateHost(location.hostname)) {
    if (location.port === '4000') {
      return location.origin;
    }

    return `${location.protocol}//${location.hostname}:4000`;
  }

  return fallback;
}

export function getMlServiceOrigin() {
  const fallback = getBrowserOrigin();
  const injected = String(getInjectedConfig().mlServiceUrl || '').trim();
  const configured = injected || String(import.meta.env.VITE_ML_SERVICE_URL || '').trim();

  if (configured) {
    return resolveConfiguredOrigin(configured, fallback);
  }

  const location = getBrowserLocation();
  if (!location) return fallback;

  if (isLocalOrPrivateHost(location.hostname)) {
    if (location.port === '8000') {
      return location.origin;
    }

    return `${location.protocol}//${location.hostname}:8000`;
  }

  return fallback;
}
