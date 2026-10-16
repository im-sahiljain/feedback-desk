async function parseErrorResponse(response: Response, defaultMessage: string): Promise<Error> {
    let message = defaultMessage;
    let code: string | undefined;
    try {
        const errorData = await response.json();
        message = errorData.error || errorData.message || defaultMessage;
        code = errorData.code;
    } catch {
        try {
            const text = await response.text();
            if (text && text.trim().length > 0) message = text;
        } catch {
            // keep defaultMessage
        }
    }
    const err: any = new Error(message);
    err.status = response.status;
    err.code = code;
    return err;
}

/** Single-flight client refresh so parallel 401s share one /api/auth/refresh. */
let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
    if (refreshInFlight) return refreshInFlight;

    refreshInFlight = (async () => {
        try {
            const response = await fetch('/api/auth/refresh', { method: 'POST' });
            return response.ok;
        } catch {
            return false;
        } finally {
            refreshInFlight = null;
        }
    })();

    return refreshInFlight;
}

const AUTH_SKIP_REFRESH_PREFIXES = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/verify-otp',
    '/api/auth/resend-otp',
    '/api/auth/refresh',
    '/api/auth/logout',
    '/api/auth/demo-login',
];

/**
 * Browser fetch that retries once after a silent session refresh on 401.
 */
export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url =
        typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;

    const skipRefresh = AUTH_SKIP_REFRESH_PREFIXES.some((prefix) => url.startsWith(prefix));
    const response = await fetch(input, init);

    if (response.status !== 401 || skipRefresh) {
        return response;
    }

    const refreshed = await refreshSession();
    if (!refreshed) {
        return response;
    }

    return fetch(input, init);
}

export const api = {
    auth: {
        login: async (data: { email: string; purpose?: string } | Record<string, any>) => {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw await parseErrorResponse(response, 'Failed to send verification code');
            }

            return response.json();
        },
        register: async (data: { name?: string; email: string } | Record<string, any>) => {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw await parseErrorResponse(response, 'Registration failed');
            }

            return response.json();
        },
        verifyOtp: async (data: { email: string; otp: string; challengeId?: string; name?: string }) => {
            const response = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw await parseErrorResponse(response, 'Verification failed');
            }

            return response.json();
        },
        resendOtp: async (data: { email: string; challengeId?: string }) => {
            const response = await fetch('/api/auth/resend-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw await parseErrorResponse(response, 'Resend failed');
            }

            return response.json();
        },
        refreshToken: async () => {
            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
            });
            if (!response.ok) {
                throw await parseErrorResponse(response, 'Session refresh failed');
            }
            return response.json();
        },
        demoLogin: async () => {
            const response = await fetch('/api/auth/demo-login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw await parseErrorResponse(response, 'Failed to start demo session');
            }

            return response.json();
        },
        logout: async () => {
            await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
            window.location.href = '/login';
        },
        getToken: () => {
            return null;
        }
    },
    products: {
        list: async () => {
            const response = await authFetch('/api/products');
            if (!response.ok) {
                throw await parseErrorResponse(response, 'Failed to fetch products');
            }
            return response.json();
        },
        create: async (data: { name: string; industry: string; description?: string; config?: { categories: string[]; aiPrompt?: string; focusAreas?: string[] } }) => {
            const response = await authFetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                throw await parseErrorResponse(response, 'Failed to create product');
            }
            return response.json();
        },
        getIndustries: async () => {
            const response = await authFetch('/api/products/industries');
            if (!response.ok) {
                throw await parseErrorResponse(response, 'Failed to fetch industries');
            }
            return response.json();
        },
        getLabels: async (industry: string) => {
            const response = await authFetch(`/api/products/labels?industry=${encodeURIComponent(industry)}`);
            if (!response.ok) {
                throw await parseErrorResponse(response, 'Failed to fetch labels');
            }
            return response.json();
        },
    },
    feedbacks: {
        list: async (productId: string, period = 'all', startDate?: string, endDate?: string) => {
            let url = `/api/feedbacks?product_id=${encodeURIComponent(productId)}&period=${encodeURIComponent(period)}`;
            if (startDate) url += `&start_date=${encodeURIComponent(startDate)}`;
            if (endDate) url += `&end_date=${encodeURIComponent(endDate)}`;
            const response = await authFetch(url);
            if (!response.ok) {
                throw await parseErrorResponse(response, 'Failed to fetch feedbacks');
            }
            return response.json();
        },
        submit: async (data: {
            productId?: string;
            product_id?: string;
            userId?: string;
            user_id?: string;
            industry?: string;
            signature?: string;
            sig?: string;
            feedback: string;
            rating?: number;
            email?: string;
        }) => {
            const response = await fetch('/api/feedbacks/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                throw await parseErrorResponse(response, 'Failed to submit feedback');
            }
            return response.json();
        }
    },
    analytics: {
        getSummary: async (productId: string, period = 'all', startDate?: string, endDate?: string) => {
            let url = `/api/analytics/summary?product_id=${encodeURIComponent(productId)}&period=${encodeURIComponent(period)}`;
            if (startDate) url += `&start_date=${encodeURIComponent(startDate)}`;
            if (endDate) url += `&end_date=${encodeURIComponent(endDate)}`;
            const response = await authFetch(url);
            if (!response.ok) {
                throw await parseErrorResponse(response, 'Failed to fetch analytics summary');
            }
            return response.json();
        },
        getDashboard: async (productId: string, period: '7d' | '30d' | '90d' = '30d') => {
            const url = `/api/analytics/dashboard?product_id=${encodeURIComponent(productId)}&period=${encodeURIComponent(period)}`;
            const response = await authFetch(url);
            if (!response.ok) {
                throw await parseErrorResponse(response, 'Failed to fetch dashboard summary');
            }
            return response.json();
        },
        getExecutiveBrief: async (
            productId: string,
            refresh = false,
            period = 'today',
            startDate?: string,
            endDate?: string,
            cacheOnly = false
        ) => {
            let url = `/api/analytics/executive-brief?product_id=${encodeURIComponent(productId)}&refresh=${refresh}&period=${encodeURIComponent(period)}`;
            if (cacheOnly) url += `&cache_only=true`;
            if (startDate) url += `&start_date=${encodeURIComponent(startDate)}`;
            if (endDate) url += `&end_date=${encodeURIComponent(endDate)}`;
            const response = await authFetch(url);
            if (!response.ok) {
                throw await parseErrorResponse(response, 'Failed to fetch executive brief');
            }
            return response.json();
        }
    },
    admin: {
        getOverview: async () => {
            const response = await authFetch('/api/admin/overview');
            if (!response.ok) throw await parseErrorResponse(response, 'Failed to fetch platform overview');
            return response.json();
        },
        getAiMetrics: async () => {
            const response = await authFetch('/api/admin/ai-metrics');
            if (!response.ok) throw await parseErrorResponse(response, 'Failed to fetch AI metrics');
            return response.json();
        },
        getAiLogs: async (params?: { page?: number; limit?: number; operation?: string; status?: string; search?: string }) => {
            const q = new URLSearchParams();
            if (params?.page) q.set('page', String(params.page));
            if (params?.limit) q.set('limit', String(params.limit));
            if (params?.operation) q.set('operation', params.operation);
            if (params?.status) q.set('status', params.status);
            if (params?.search) q.set('search', params.search);
            const response = await authFetch(`/api/admin/ai-metrics/logs?${q.toString()}`);
            if (!response.ok) throw await parseErrorResponse(response, 'Failed to fetch AI telemetry logs');
            return response.json();
        },
        getQueue: async () => {
            const response = await authFetch('/api/admin/queue');
            if (!response.ok) throw await parseErrorResponse(response, 'Failed to fetch queue health');
            return response.json();
        },
        replayDeadJobs: async () => {
            const response = await authFetch('/api/admin/queue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            if (!response.ok) throw await parseErrorResponse(response, 'Failed to replay dead letter jobs');
            return response.json();
        },
        retryJob: async (jobId: string) => {
            const response = await authFetch('/api/admin/queue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId }),
            });
            if (!response.ok) throw await parseErrorResponse(response, 'Failed to retry job');
            return response.json();
        },
        getDistribution: async () => {
            const response = await authFetch('/api/admin/distribution');
            if (!response.ok) throw await parseErrorResponse(response, 'Failed to fetch distribution metrics');
            return response.json();
        },
        getFeedbacks: async (params?: { search?: string; sentiment?: string; status?: string; priority?: string; page?: number; limit?: number }) => {
            const q = new URLSearchParams();
            if (params?.search) q.set('search', params.search);
            if (params?.sentiment) q.set('sentiment', params.sentiment);
            if (params?.status) q.set('status', params.status);
            if (params?.priority) q.set('priority', params.priority);
            if (params?.page) q.set('page', String(params.page));
            if (params?.limit) q.set('limit', String(params.limit));
            const response = await authFetch(`/api/admin/feedbacks?${q.toString()}`);
            if (!response.ok) throw await parseErrorResponse(response, 'Failed to fetch platform feedbacks');
            return response.json();
        },
        updateFeedback: async (id: string, payload: { status?: string; adminNotes?: string }) => {
            const response = await authFetch(`/api/admin/feedbacks/${encodeURIComponent(id)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw await parseErrorResponse(response, 'Failed to update feedback item');
            return response.json();
        },
        getUsers: async () => {
            const response = await authFetch('/api/admin/users');
            if (!response.ok) throw await parseErrorResponse(response, 'Failed to fetch platform users');
            return response.json();
        },
        updateUserRole: async (id: string, role: string) => {
            const response = await authFetch(`/api/admin/users/${encodeURIComponent(id)}/role`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role })
            });
            if (!response.ok) throw await parseErrorResponse(response, 'Failed to update user role');
            return response.json();
        },
        getAuditLogs: async () => {
            const response = await authFetch('/api/admin/audit-logs');
            if (!response.ok) throw await parseErrorResponse(response, 'Failed to fetch audit logs');
            return response.json();
        }
    }
};
