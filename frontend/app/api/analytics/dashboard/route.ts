import { NextResponse } from 'next/server';
import { proxyAuthorizedJson } from '@/lib/bffAuth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');

    if (!productId) {
      return NextResponse.json({ message: 'Product ID is required' }, { status: 400 });
    }

    return await proxyAuthorizedJson(
      `/api/analytics/dashboard?${searchParams.toString()}`,
      undefined,
      { fallbackError: 'Failed to fetch dashboard summary' }
    );
  } catch (error) {
    console.error('Dashboard Summary Proxy Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
