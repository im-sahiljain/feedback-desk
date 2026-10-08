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

/** Deduplicate concurrent refresh calls for the same refresh token (same Node process). */
const refreshInFlight = new Map<string, Promise<RefreshedTokens | null>>();

/**
 * After rotation, parallel requests may still present the old refresh cookie briefly.
 * Replaying a successful rotation result avoids backend "reuse detected" session wipes.
 */
const recentRefreshByOldToken = new Map<
    string,
    { tokens: RefreshedTokens; expiresAt: number }
>();
const REFRESH_GRACE_MS = 15_000;

async function refreshWithBackend(refreshToken: string): Promise<RefreshedTokens | null> {
    const cached = recentRefreshByOldToken.get(refreshToken);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.tokens;
    }

    const existing = refreshInFlight.get(refreshToken);
    if (existing) return existing;

    const promise = (async (): Promise<RefreshedTokens | null> => {
        try {
            const refreshRes = await fetch(`${getBackendApiUrl()}/api/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
            });
            if (!refreshRes.ok) return null;
            const tokens = (await refreshRes.json()) as RefreshedTokens;
            recentRefreshByOldToken.set(refreshToken, {
                tokens,
                expiresAt: Date.now() + REFRESH_GRACE_MS,
            });
            return tokens;
        } catch {
            return null;
        } finally {
            refreshInFlight.delete(refreshToken);
        }
    })();

    refreshInFlight.set(refreshToken, promise);
    return promise;
}

function extractErrorMessage(errData: unknown, fallback: string): string {
    if (errData && typeof errData === 'object') {
        const record = errData as Record<string, unknown>;
        if (typeof record.error === 'string' && record.error) return record.error;
        if (typeof record.message === 'string' && record.message) return record.message;
    }
    return fallback;
}

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
        newTokens = await refreshWithBackend(refreshToken);
        if (!newTokens) {
            return {
                response: null,
                unauthorized: true,
                applyAuthCookies: (res) => clearBffCookies(res),
            };
        }
        token = newTokens.accessToken || newTokens.token;
        // Subsequent refreshes in this process must use the rotated token
        if (newTokens.refreshToken) {
            refreshToken = newTokens.refreshToken;
        }
    }

    const headers = new Headers(init.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (!headers.has('Content-Type') && init.body) {
        headers.set('Content-Type', 'application/json');
    }

    let response = await fetch(`${base}${pathWithQuery}`, { ...init, headers });

    if (response.status === 401 && refreshToken && !newTokens) {
        newTokens = await refreshWithBackend(refreshToken);
        if (newTokens) {
            token = newTokens.accessToken || newTokens.token;
            if (newTokens.refreshToken) {
                refreshToken = newTokens.refreshToken;
            }
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

/**
 * Proxy a backend JSON endpoint with silent refresh and cookie propagation.
 */
export async function proxyAuthorizedJson(
    pathWithQuery: string,
    init: RequestInit = {},
    options: { fallbackError?: string } = {}
): Promise<NextResponse> {
    const { response, unauthorized, applyAuthCookies } = await authorizedBackendFetch(
        pathWithQuery,
        init
    );

    if (unauthorized || !response) {
        const errorResponse = NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        applyAuthCookies(errorResponse);
        return errorResponse;
    }

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errorResponse = NextResponse.json(
            {
                message: extractErrorMessage(
                    errData,
                    options.fallbackError || 'Request failed'
                ),
            },
            { status: response.status }
        );
        applyAuthCookies(errorResponse);
        return errorResponse;
    }

    const text = await response.text();
    let data: unknown = null;
    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            data = { message: text };
        }
    }

    const nextResponse = NextResponse.json(data ?? {});
    applyAuthCookies(nextResponse);
    return nextResponse;
}
