import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isTestAdapterEnabled } from '../test-adapter'

export async function updateSession(request: NextRequest, response?: NextResponse) {
  const supabaseResponse = response || NextResponse.next({
    request,
  })

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

  const pathname = request.nextUrl.pathname;
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

  const isGestorRoute =
    request.nextUrl.pathname.includes('/dashboard') ||
    request.nextUrl.pathname.includes('/mis-unidades') ||
    request.nextUrl.pathname.includes('/grupos') ||
    request.nextUrl.pathname.includes('/inquilinos') ||
    request.nextUrl.pathname.includes('/alquileres') ||
    request.nextUrl.pathname.includes('/facturacion') ||
    request.nextUrl.pathname.includes('/delegados');

  if (
    !currentUser &&
    !request.nextUrl.pathname.includes('/auth/login') &&
    !request.nextUrl.pathname.includes('/auth/registro') &&
    isGestorRoute
  ) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone()
    url.pathname = '/es/auth/login'
    return NextResponse.redirect(url)
  }

  // Si está logueado pero su rol es buscador, interceptar rutas administrativas y ofrecer onboarding amigable
  if (
    currentUser &&
    (currentUser.user_metadata?.role === 'buscador' || currentUser.user_metadata?.rol === 'buscador') &&
    isGestorRoute
  ) {
    const segments = pathname.split('/').filter(Boolean);
    const locale = segments[0] && ['es', 'en', 'pt'].includes(segments[0]) ? segments[0] : 'es';
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/auth/onboarding-gestor`;
    return NextResponse.redirect(url);
  }

  return supabaseResponse
}
