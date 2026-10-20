import { isTestAdapterEnabled } from '../test-adapter';

export function getClientAuthToken(tokenProp?: string): string {
  if (tokenProp && tokenProp.length > 5) return tokenProp;
  if (typeof document !== 'undefined' && isTestAdapterEnabled()) {
    const match =
      document.cookie.match(/sb-localhost-auth-token=([^;]+)/) ||
      document.cookie.match(/sb-127-auth-token=([^;]+)/) ||
      document.cookie.match(/sb-auth-token=([^;]+)/);
    if (match) {
      try {
        const raw = match[1].startsWith('base64-') ? match[1].slice(7) : match[1];
        const parsed = JSON.parse(atob(raw));
        if (parsed.access_token) return parsed.access_token;
      } catch {}
    }
  }
  return tokenProp || '';
}
