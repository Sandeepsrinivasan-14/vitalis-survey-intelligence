import { NextResponse, type NextRequest } from 'next/server';
import { ROLE_HOME, canAccess, roleForPath } from '@/lib/auth/roles';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/token';

/**
 * Gatekeeper for the four role dashboards. Unauthenticated visitors are sent
 * to the login page; signed-in users who open a dashboard outside their
 * permissions are sent to their own.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const target = roleForPath(pathname);
  if (!target) return NextResponse.next();

  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?role=${target}/dashboard&next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  if (!canAccess(session.role, target)) {
    const url = request.nextUrl.clone();
    url.pathname = ROLE_HOME[session.role];
    url.search = '';
    return NextResponse.redirect(url);
  }
  const res = NextResponse.next();
  res.headers.set('Cache-Control', 'private, no-store');
  return res;
}

export const config = {
  matcher: ['/admin/:path*', '/facility/:path*', '/district/:path*', '/state/:path*'],
};
