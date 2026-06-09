import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const AUTH_ROUTES = ['/login', '/register'];
const PROTECTED_PREFIXES = [
  '/discover',
  '/matches',
  '/profile',
  '/edit-profile',
  '/preferences',
  '/onboarding',
  '/analytics',
  '/admin',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  const isAuthenticated = !!token;
  const isAuthRoute = AUTH_ROUTES.includes(pathname);
  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  // Authenticated user on / or auth routes → redirect to app
  if (isAuthenticated && (pathname === '/' || isAuthRoute)) {
    const destination = token.registrationStage === 'FINISHED' ? '/discover' : '/onboarding';
    return NextResponse.redirect(new URL(destination, request.url));
  }

  // Unauthenticated user on protected routes → redirect to login
  if (!isAuthenticated && isProtectedRoute) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
