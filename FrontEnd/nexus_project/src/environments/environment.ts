function resolveApiUrl(): string {
  if (typeof window !== 'undefined' && window.location) {
    const customApi = (window as unknown as { __NEXUS_API__?: string }).__NEXUS_API__;
    if (customApi) return customApi;

    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return '/api';
    }
  }
  return 'http://localhost:8000/api';
}

export const environment = {
  production: false,
  apiUrl: resolveApiUrl(),
};
