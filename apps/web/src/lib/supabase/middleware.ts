import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (
    !user &&
    !request.nextUrl.pathname.includes('/auth/login') &&
    !request.nextUrl.pathname.includes('/auth/registro') &&
    request.nextUrl.pathname.startsWith('/es/dashboard') // Protegemos rutas del dashboard
  ) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone()
    url.pathname = '/es/auth/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
