import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const accessToken =
        request.cookies.get('accessToken')?.value ||
        request.cookies.get('token')?.value;
    const refreshToken = request.cookies.get('refreshToken')?.value;
    const hasAuth = !!(accessToken || refreshToken);
    const { pathname } = request.nextUrl;

    // Auth routes that logged-in users should not see (redirect to /)
    const authRoutes = ['/login', '/signup'];

    // Public informational pages accessible by anyone at any time
    const publicPages = ['/terms', '/privacy'];

    const isAuthRoute = authRoutes.includes(pathname);
    const isPublicPage = publicPages.some(page => pathname === page || pathname.startsWith(page + '/'));

    const isDemo =
        request.cookies.get('isDemo')?.value === 'true' ||
        request.nextUrl.searchParams.get('from') === 'demo';

    // If a demo user accesses /signup, clear demo session cookies and allow access to /signup
    if (pathname === '/signup' && (isDemo || request.nextUrl.searchParams.get('from') === 'demo')) {
        const url = new URL('/signup', request.url);
        const hadFromDemo = url.searchParams.has('from');
        url.searchParams.delete('from');
        const response = hadFromDemo
            ? NextResponse.redirect(url)
            : NextResponse.next();

        const isProduction = process.env.NODE_ENV === 'production';
        const cookieOptions = {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax' as const,
            maxAge: 0,
            path: '/',
        };
        response.cookies.set('accessToken', '', cookieOptions);
        response.cookies.set('token', '', cookieOptions);
        response.cookies.set('refreshToken', '', cookieOptions);
        response.cookies.set('isDemo', '', { ...cookieOptions, httpOnly: false });
        return response;
    }

    // If the user has auth cookies and tries to access an auth route (like login),
    // redirect them to the dashboard
    if (isAuthRoute && hasAuth) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    // Allow public informational pages regardless of auth state
    if (isPublicPage) {
        return NextResponse.next();
    }

    // If the user has NO auth and tries to access a PROTECTED path,
    // redirect them to login
    if (!isAuthRoute && !hasAuth) {
        // Filter out nextjs internals and static files
        if (
            !pathname.startsWith('/_next') &&
            !pathname.startsWith('/api') && // Let API routes handle their own auth or be public for consistency
            !pathname.startsWith('/submit-feedback') && // Allow legacy signed feedback submission
            !pathname.startsWith('/f') && // Allow opaque public feedback links
            !pathname.includes('.') // naive check for files (css, js, images)
        ) {
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }

    return NextResponse.next();
}

// Configure which paths the middleware runs on
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
