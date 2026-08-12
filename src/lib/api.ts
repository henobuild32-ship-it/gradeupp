import { useAppStore } from '@/lib/store';

const originalFetch = typeof window !== 'undefined' ? window.fetch.bind(window) : null;

if (typeof window !== 'undefined' && originalFetch) {
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    try {
      const token = useAppStore.getState().token;
      if (token) {
        const existingHeaders = init?.headers instanceof Headers
          ? Object.fromEntries(init.headers.entries())
          : (init?.headers as Record<string, string> | undefined) ?? {};

        init = {
          ...init,
          headers: {
            ...existingHeaders,
            Authorization: `Bearer ${token}`,
          },
        };
      }
      return await originalFetch(input, init);
    } catch {
      return originalFetch(input, init);
    }
  };
}

export function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};

  const token = useAppStore.getState().token;
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }

  return {};
}
