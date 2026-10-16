import { NextRequest, NextResponse } from 'next/server';
import { proxyAuthorizedJson } from '@/lib/bffAuth';

export async function GET() {
  try {
    return await proxyAuthorizedJson('/api/admin/queue', undefined, {
      fallbackError: 'Failed to fetch queue metrics',
    });
  } catch (error) {
    console.error('Admin Queue GET Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {}

    return await proxyAuthorizedJson(
      '/api/admin/queue',
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
      { fallbackError: 'Failed to replay dead letter jobs' }
    );
  } catch (error) {
    console.error('Admin Queue POST Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
