/**
 * Global fetch interceptor for PesquisaMaster multi-tenant authentication.
 * Automatically injects `Authorization: Bearer <pm_auth_token>` on all API/auth
 * requests when a token is present in localStorage and no Authorization header
 * was explicitly provided.
 */

const API_URL_PREFIXES = [
  "http://127.0.0.1:8000",
  "http://localhost:8000",
  "/api/",
  "/auth/",
] as const;

let isInstalled = false;

function extractRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function shouldAttachAuthHeader(url: string): boolean {
  return API_URL_PREFIXES.some((prefix) => url.startsWith(prefix));
}

export function installAuthFetchInterceptor(): void {
  if (isInstalled || typeof window === "undefined" || typeof window.fetch !== "function") {
    return;
  }
  isInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = extractRequestUrl(input);
    if (!shouldAttachAuthHeader(url)) {
      return originalFetch(input, init);
    }

    const token = window.localStorage.getItem("pm_auth_token");
    if (!token) {
      return originalFetch(input, init);
    }

    const mergedHeaders = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined),
    );
    if (!mergedHeaders.has("Authorization")) {
      mergedHeaders.set("Authorization", `Bearer ${token}`);
    }

    return originalFetch(input, {
      ...init,
      headers: mergedHeaders,
    });
  };
}
