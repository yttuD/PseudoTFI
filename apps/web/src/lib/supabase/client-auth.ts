import { isTestAdapterEnabled } from '../test-adapter';
import { createClient } from './client';

export interface ClientAuthUser {
  id: string;
  email: string;
  name: string;
  role: 'gestor' | 'delegado' | 'buscador';
}

export function getClientSessionUser(): ClientAuthUser | null {
  if (typeof document === 'undefined' || !isTestAdapterEnabled()) return null;
  const match =
    document.cookie.match(/sb-localhost-auth-token=([^;]+)/) ||
    document.cookie.match(/sb-127-auth-token=([^;]+)/) ||
    document.cookie.match(/sb-auth-token=([^;]+)/);

  if (match) {
    try {
      const raw = match[1].startsWith('base64-') ? match[1].slice(7) : match[1];
      const parsed = JSON.parse(atob(raw));
      const user = parsed.user || parsed;
      if (user && user.id) {
        const metadata = user.user_metadata || {};
        const role =
          metadata.role ||
          metadata.rol ||
          'gestor';
        const name =
          metadata.full_name ||
          metadata.nombre_completo ||
          (user.email ? user.email.split('@')[0] : 'Usuario');
        return {
          id: user.id,
          email: user.email || '',
          name,
          role: role as 'gestor' | 'delegado' | 'buscador',
        };
      }
    } catch {}
  }
  return null;
}

export async function getVerifiedClientSessionUser(): Promise<ClientAuthUser | null> {
  if (isTestAdapterEnabled()) return getClientSessionUser();
  try {
    const client = createClient();
    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData.session) return null;
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError || !authData.user) return null;
    const { data: profile, error: profileError } = await client.from('users')
      .select('rol,full_name,deleted_at').eq('id', authData.user.id).single();
    if (profileError || !profile || profile.deleted_at !== null ||
        !['buscador', 'gestor', 'delegado'].includes(profile.rol)) return null;
    return {
      id: authData.user.id,
      email: authData.user.email || '',
      name: profile.full_name || authData.user.email?.split('@')[0] || 'Usuario',
      role: profile.rol as ClientAuthUser['role'],
    };
  } catch {
    return null;
  }
}

export function getClientSessionToken(): string | null {
  if (typeof document === 'undefined' || !isTestAdapterEnabled()) return null;
  const match =
    document.cookie.match(/sb-localhost-auth-token=([^;]+)/) ||
    document.cookie.match(/sb-127-auth-token=([^;]+)/) ||
    document.cookie.match(/sb-auth-token=([^;]+)/);

  if (match) {
    try {
      const raw = match[1].startsWith('base64-') ? match[1].slice(7) : match[1];
      const parsed = JSON.parse(atob(raw));
      return parsed.access_token || 'dev-access-token';
    } catch {
      return 'dev-access-token';
    }
  }
  return null;
}

export async function signOutClient(): Promise<void> {
  // The legacy demo adapter has no Supabase Auth session. Clear only its
  // synthetic cookies, never consider a failed real signOut successful.
  const clearLegacyCookies = () => {
    if (typeof document !== 'undefined') {
      document.cookie = 'sb-127-auth-token=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'sb-localhost-auth-token=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'sb-auth-token=; path=/; max-age=0; SameSite=Lax';
    }
  };
  if (isTestAdapterEnabled()) {
    clearLegacyCookies();
    return;
  }

  // Supabase SSR may split Auth state into multiple project-prefixed cookie
  // chunks; only its SDK knows the complete set of session cookies.
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error('No se pudo confirmar el cierre de sesión');

  const { data, error: remainingError } = await supabase.auth.getSession();
  if (remainingError || data.session) {
    throw new Error('La sesión sigue activa después de intentar cerrarla');
  }
  clearLegacyCookies();
}
