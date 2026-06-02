/**
 * Edge middleware — protects authenticated routes and redirects logged-in
 * users away from the login page (SRS §5).
 */
import { type NextRequest, NextResponse } from 'next/server';
import { ACCESS_COOKIE } from '@/lib/session';

const APP_PATH = /^\/app(\/|$)/;

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const isAuthenticated = request.cookies.has(ACCESS_COOKIE);

  if (pathname === '/login' && isAuthenticated) {
    return NextResponse.redirect(new URL('/app', request.url));
  }
  if (APP_PATH.test(pathname) && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*', '/login'],
};
