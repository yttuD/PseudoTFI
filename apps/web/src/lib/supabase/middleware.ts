import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isTestAdapterEnabled } from '../test-adapter'

export async function updateSession(request: NextRequest, response?: NextResponse) {
  const supabaseResponse = response || NextResponse.next({
    request,
  })

  const pathname = request.nextUrl.pathname;
  const isGestorRoute =
    pathname.includes('/dashboard') ||
    pathname.includes('/mis-unidades') ||
    pathname.includes('/grupos') ||
    pathname.includes('/inquilinos') ||
    pathname.includes('/alquileres') ||
    pathname.includes('/facturacion') ||
    pathname.includes('/delegados');

  // The operational server layout verifies the actual session and canonical
  // database role. A 400 ms middleware timeout must never turn a slow check
  // into a login redirect or reuse stale signup role metadata.
  if (isGestorRoute) return supabaseResponse;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          
          // Re-create the response object if we are setting cookies
          // But since we might be using next-intl response, we just set the cookies on it
          // Wait, NextResponse doesn't allow direct modification of request, but it does allow setting cookies
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  let currentUser: { id?: string; user_metadata?: { role?: string; rol?: string } } | null = null;
  try {
    const authPromise = supabase.auth.getUser();
    const timeoutPromise = new Promise<{ data: { user: null } }>((resolve) =>
      setTimeout(() => resolve({ data: { user: null } }), 400)
    );
    const { data } = await Promise.race([authPromise, timeoutPromise]);
    currentUser = data?.user || null;
  } catch {}

  if (!currentUser) {
    if (isTestAdapterEnabled()) {
      const authCookie = request.cookies.get('sb-localhost-auth-token')?.value ||
                         request.cookies.get('sb-127-auth-token')?.value ||
                         request.cookies.get('sb-auth-token')?.value;
      if (authCookie) {
        try {
          const raw = authCookie.startsWith('base64-') ? authCookie.slice(7) : authCookie;
          const parsed = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
          currentUser = parsed.user;
        } catch {}
      }
    }
  }

  const isNative = request.cookies.get('renda-native-mode')?.value === 'true';

  const isLanding =
    pathname === '/' ||
    pathname === '/es' ||
    pathname === '/en' ||
    pathname === '/pt' ||
    pathname === '/es/' ||
    pathname === '/en/' ||
    pathname === '/pt/';

  if (isLanding && isNative) {
    const segments = pathname.split('/').filter(Boolean);
    const locale = segments[0] && ['es', 'en', 'pt'].includes(segments[0]) ? segments[0] : 'es';
    const isGestor =
      currentUser &&
      (currentUser.user_metadata?.role === 'gestor' ||
       currentUser.user_metadata?.rol === 'gestor');

    const url = request.nextUrl.clone();
    url.pathname = isGestor ? `/${locale}/dashboard` : `/${locale}/unidades`;
    return NextResponse.redirect(url);
  }

  return supabaseResponse
}
