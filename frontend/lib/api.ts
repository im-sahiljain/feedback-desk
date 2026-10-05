export const api = {
    auth: {
        login: async (data: any) => {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Login failed');
            }

            return response.json();
        },
        register: async (data: any) => {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Registration failed');
            }

            return response.json();
        },
        verifyOtp: async (data: { email: string; otp: string }) => {
            const response = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Verification failed');
            }

            return response.json();
        },
        resendOtp: async (data: { email: string }) => {
            const response = await fetch('/api/auth/resend-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Resend failed');
            }

            return response.json();
        },
        logout: async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/login';
        },
        getToken: () => {
            return null;
        }
    },
    products: {
        list: async () => {
            const response = await fetch('/api/products');
            if (!response.ok) {
                const error: any = new Error('Failed to fetch products');
                error.status = response.status;
                throw error;
            }
            return response.json();
        },
        create: async (data: any) => {
            const response = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!response.ok) throw new Error('Failed to create product');
            return response.json();
        },
        getIndustries: async () => {
            const response = await fetch('/api/products/industries');
            if (!response.ok) throw new Error('Failed to fetch industries');
            return response.json();
        },
        getLabels: async (industry: string) => {
            const response = await fetch(`/api/products/labels?industry=${industry}`);
            if (!response.ok) throw new Error('Failed to fetch labels');
            return response.json();
        },
    },
    feedbacks: {
        list: async (productId: string, period = 'all', startDate?: string, endDate?: string) => {
            let url = `/api/feedbacks?product_id=${productId}&period=${period}`;
            if (startDate) url += `&start_date=${encodeURIComponent(startDate)}`;
            if (endDate) url += `&end_date=${encodeURIComponent(endDate)}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch feedbacks');
            return response.json();
        },
        submit: async (data: any) => {
            const response = await fetch('/api/feedbacks/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!response.ok) throw new Error('Failed to submit feedback');
            return response.json();
        }
    },
    analytics: {
        getSummary: async (productId: string, period = 'all', startDate?: string, endDate?: string) => {
            let url = `/api/analytics/summary?product_id=${productId}&period=${period}`;
            if (startDate) url += `&start_date=${encodeURIComponent(startDate)}`;
            if (endDate) url += `&end_date=${encodeURIComponent(endDate)}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch analytics summary');
            return response.json();
        },
        getExecutiveBrief: async (productId: string, refresh = false, period = 'all', startDate?: string, endDate?: string) => {
            let url = `/api/analytics/executive-brief?product_id=${productId}&refresh=${refresh}&period=${period}`;
            if (startDate) url += `&start_date=${encodeURIComponent(startDate)}`;
            if (endDate) url += `&end_date=${encodeURIComponent(endDate)}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch executive brief');
            return response.json();
        }
    }
};
