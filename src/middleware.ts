import { NextRequest, NextResponse } from 'next/server'
import { match } from '@formatjs/intl-localematcher'
import Negotiator from 'negotiator'

let locales = ['en', 'fr', 'ar']
export let defaultLocale = 'en'

function getLocale(request: NextRequest): string {
  const negotiatorHeaders: Record<string, string> = {}
  request.headers.forEach((value, key) => (negotiatorHeaders[key] = value))

  const languages = new Negotiator({ headers: negotiatorHeaders }).languages()

  try {
    return match(languages, locales, defaultLocale)
  } catch (e) {
    return defaultLocale
  }
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Handle locale routing
  const pathnameIsMissingLocale = locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  )

  if (pathnameIsMissingLocale) {
    const locale = getLocale(request)
    // Properly handle pathname - don't add extra slashes
    const pathWithoutLeadingSlash = pathname.startsWith('/') ? pathname.slice(1) : pathname
    return NextResponse.redirect(
      new URL(`/${locale}/${pathWithoutLeadingSlash}`, request.url)
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|icon.svg|sw.js|robots.txt|notification-sound.mp3|images).*)',
  ],
}
