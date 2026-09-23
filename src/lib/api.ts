import { useAppStore } from '@/lib/store';

const originalFetch = typeof window !== 'undefined' ? window.fetch.bind(window) : null;

function readPersistedToken(): string | null {
  try {
    const raw = localStorage.getItem('trait-app-storage');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.token ?? null;
  } catch {
    return null;
  }
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  const storeToken = useAppStore.getState().token;
  if (storeToken) return storeToken;
  const persisted = readPersistedToken();
  if (persisted) {
    useAppStore.getState().setToken(persisted);
    return persisted;
  }
  return null;
}

let sessionExpiredNotified = false;

function notifySessionExpired() {
  if (sessionExpiredNotified) return;
  const { user, logout } = useAppStore.getState();
  if (!user) return;
  sessionExpiredNotified = true;
  logout();
  try {
    window.dispatchEvent(new CustomEvent('trait:session-expired'));
  } catch {}
}

function isAuthApiUrl(url: string): boolean {
  try {
    const u = new URL(url, window.location.origin);
    if (u.origin !== window.location.origin) return false;
    return u.pathname.startsWith('/api/auth/') || u.pathname.startsWith('/api/admin/login');
  } catch {
    return false;
  }
}

function isApiUrl(url: string): boolean {
  try {
    const u = new URL(url, window.location.origin);
    return u.origin === window.location.origin && u.pathname.startsWith('/api/');
  } catch {
    return false;
  }
}

function friendlyAuthMessage(message: string | undefined): string | undefined {
  if (message === 'Non authentifié' || message === 'Session invalide' || message === "Erreur d'authentification") {
    return 'Session expirée. Veuillez vous reconnecter.';
  }
  return message;
}

function isSessionMessage(msg: string | undefined): boolean {
  return (
    msg === 'Non authentifié' ||
    msg === 'Session invalide' ||
    msg === "Erreur d'authentification"
  );
}

if (typeof window !== 'undefined' && originalFetch) {
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const isApi = isApiUrl(url);
    const isAuthApi = isAuthApiUrl(url);

    let nextInit = init;
    if (isApi) {
      const token = getAuthToken();
      const existingHeaders =
        init?.headers instanceof Headers
          ? Object.fromEntries(init.headers.entries())
          : ((init?.headers as Record<string, string> | undefined) ?? {});

      const existingAuth = existingHeaders.Authorization || existingHeaders.authorization;
      nextInit = {
        ...init,
        credentials: init?.credentials ?? 'include',
        headers: {
          ...existingHeaders,
          ...(token && !existingAuth ? { Authorization: `Bearer ${token}` } : {}),
        },
      };
    }

    const response = await originalFetch(input, nextInit);

    if (isApi && response.status === 401) {
      let payload: any = null;
      try {
        const clone = response.clone();
        payload = await clone.json();
      } catch {}

      const msg = payload?.message as string | undefined;
      if (isSessionMessage(msg)) {
        const isSessionFailure = msg === 'Non authentifié' || msg === 'Session invalide';
        if (!isAuthApi || isSessionFailure) {
          notifySessionExpired();
        }
        const body = JSON.stringify({
          success: false,
          message: 'Session expirée. Veuillez vous reconnecter.',
        });
        return new Response(body, {
          status: 401,
          statusText: response.statusText,
          headers: {
            'Content-Type': 'application/json',
            ...Object.fromEntries(response.headers.entries()),
          },
        });
      }
    }

    return response;
  };
}

export function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function resetSessionExpiredFlag() {
  sessionExpiredNotified = false;
}

export { friendlyAuthMessage };
