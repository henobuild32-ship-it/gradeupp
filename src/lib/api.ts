import { useAppStore } from '@/lib/store';

export function getAuthHeaders(): Record<string, string> {
  const token = useAppStore.getState().token;
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

const originalFetch = typeof window !== 'undefined' ? window.fetch.bind(window) : null;

if (typeof window !== 'undefined') {
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const token = useAppStore.getState().token;
    if (token) {
      const existingHeaders = init?.headers instanceof Headers
        ? Object.fromEntries(init.headers.entries())
        : (init?.headers as Record<string, string>) || {};
      init = {
        ...init,
        headers: {
          ...existingHeaders,
          Authorization: `Bearer ${token}`,
        },
      };
    }
    return originalFetch!(input, init);
  };
}
