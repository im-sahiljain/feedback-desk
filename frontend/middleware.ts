import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const accessToken =
        request.cookies.get('accessToken')?.value ||
        request.cookies.get('token')?.value;
    const refreshToken = request.cookies.get('refreshToken')?.value;
    const hasAuth = !!(accessToken || refreshToken);
    const { pathname } = request.nextUrl;

    // Public paths that identify authentication routes
    const publicPaths = ['/login', '/signup'];

    // Check if the current path is a public path
    const isPublicPath = publicPaths.includes(pathname);

    // If the user has auth cookies and tries to access a public path (like login),
    // redirect them to the dashboard
    if (isPublicPath && hasAuth) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    // If the user has NO auth and tries to access a PROTECTED path,
    // redirect them to login
    if (!isPublicPath && !hasAuth) {
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
