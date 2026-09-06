import { type NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { updateSession } from '@/lib/supabase/middleware'
import { routing } from '@/i18n/routing'

const handleI18nRouting = createIntlMiddleware(routing)

export async function middleware(request: NextRequest) {
  const response = handleI18nRouting(request)
  return await updateSession(request, response)
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}
