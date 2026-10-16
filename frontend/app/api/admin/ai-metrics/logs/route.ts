import { NextRequest, NextResponse } from 'next/server';
import { proxyAuthorizedJson } from '@/lib/bffAuth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const targetUrl = queryString
      ? `/api/admin/ai-metrics/logs?${queryString}`
      : '/api/admin/ai-metrics/logs';

    return await proxyAuthorizedJson(targetUrl, undefined, {
      fallbackError: 'Failed to fetch AI telemetry logs',
    });
  } catch (error) {
    console.error('Admin AI Metrics Logs GET Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
