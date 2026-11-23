function resolveApiUrl(): string {
  if (typeof window !== 'undefined' && window.location) {
    const customApi = (window as unknown as { __NEXUS_API__?: string }).__NEXUS_API__;
    if (customApi) return customApi;

    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return '/api/v1';
    }
  }
  return 'http://localhost:8000/api/v1';
}

function resolveWebSocketUrl(): string {
  if (typeof window !== 'undefined' && window.location) {
    const customWebSocket = (window as unknown as { __NEXUS_WS__?: string }).__NEXUS_WS__;
    if (customWebSocket) return customWebSocket;

    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;
    }

    return `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;
  }
  return 'ws://localhost:8000';
}

function resolveRealtimeEnabled(): boolean {
  if (typeof window !== 'undefined') {
    const configured = (window as unknown as { __NEXUS_REALTIME__?: unknown }).__NEXUS_REALTIME__;
    if (typeof configured === 'boolean') return configured;
  }
  return true;
}

export const environment = {
  production: false,
  apiUrl: resolveApiUrl(),
  webSocketUrl: resolveWebSocketUrl(),
  realtimeEnabled: resolveRealtimeEnabled(),
};
