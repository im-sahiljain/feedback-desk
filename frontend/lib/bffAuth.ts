import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export function getBackendApiUrl(): string {
    return (
        process.env.BACKEND_API_URL ||
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        'http://localhost:5000'
    );
}

export interface AuthTokens {
    accessToken?: string;
    refreshToken?: string;
}

export async function getBffTokens(): Promise<AuthTokens> {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value || cookieStore.get('token')?.value;
    const refreshToken = cookieStore.get('refreshToken')?.value;
    return { accessToken, refreshToken };
}

export function setBffCookies(
    response: NextResponse,
    tokens: { accessToken: string; refreshToken?: string; token?: string }
) {
    const isProduction = process.env.NODE_ENV === 'production';
    const mainToken = tokens.accessToken || tokens.token;

    if (mainToken) {
        // Short-lived Access Token (15 minutes)
        response.cookies.set('accessToken', mainToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: 15 * 60, // 15 minutes
            path: '/',
        });

        // Backward compatibility cookie
        response.cookies.set('token', mainToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: 15 * 60,
            path: '/',
        });
    }

    if (tokens.refreshToken) {
        // Long-lived Refresh Token (30 days)
        response.cookies.set('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60, // 30 days
            path: '/',
        });
    }
}

export function clearBffCookies(response: NextResponse) {
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
}

type RefreshedTokens = {
    accessToken?: string;
    token?: string;
    refreshToken?: string;
};

/**
 * Backend fetch with silent access-token refresh (same behavior as /api/auth/me).
 * Call applyAuthCookies() on the NextResponse you return so refreshed cookies reach the browser.
 */
export async function authorizedBackendFetch(
    pathWithQuery: string,
    init: RequestInit = {}
): Promise<{
    response: Response | null;
    unauthorized: boolean;
    applyAuthCookies: (res: NextResponse) => void;
}> {
    let { accessToken: token, refreshToken } = await getBffTokens();
    let newTokens: RefreshedTokens | null = null;
    const base = getBackendApiUrl();

    if (!token && !refreshToken) {
        return {
            response: null,
            unauthorized: true,
            applyAuthCookies: () => undefined,
        };
    }

    if (!token && refreshToken) {
        const refreshRes = await fetch(`${base}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        });
        if (!refreshRes.ok) {
            return {
                response: null,
                unauthorized: true,
                applyAuthCookies: (res) => clearBffCookies(res),
            };
        }
        newTokens = await refreshRes.json();
        token = newTokens.accessToken || newTokens.token;
    }

    const headers = new Headers(init.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (!headers.has('Content-Type') && init.body) {
        headers.set('Content-Type', 'application/json');
    }

    let response = await fetch(`${base}${pathWithQuery}`, { ...init, headers });

    if (response.status === 401 && refreshToken && !newTokens) {
        const refreshRes = await fetch(`${base}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        });
        if (refreshRes.ok) {
            newTokens = await refreshRes.json();
            token = newTokens.accessToken || newTokens.token;
            headers.set('Authorization', `Bearer ${token}`);
            response = await fetch(`${base}${pathWithQuery}`, { ...init, headers });
        }
    }

    if (response.status === 401) {
        return {
            response,
            unauthorized: true,
            applyAuthCookies: (res) => clearBffCookies(res),
        };
    }

    return {
        response,
        unauthorized: false,
        applyAuthCookies: (res) => {
            if (newTokens) {
                setBffCookies(res, {
                    accessToken: newTokens.accessToken || newTokens.token || '',
                    refreshToken: newTokens.refreshToken,
                });
            }
        },
    };
}
