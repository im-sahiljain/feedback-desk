import { NextResponse } from 'next/server';
import { proxyAuthorizedJson } from '@/lib/bffAuth';

export async function POST() {
    try {
        return await proxyAuthorizedJson(
            '/api/admin/ai-metrics/probe',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            },
            {
                fallbackError: 'Failed to probe AI engine health',
            }
        );
    } catch (error) {
        console.error('Admin AI Metrics Probe POST Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
