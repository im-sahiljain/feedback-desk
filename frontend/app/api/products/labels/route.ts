import { NextResponse } from 'next/server';
import { getBackendApiUrl, getBffTokens } from '@/lib/bffAuth';

export async function GET(request: Request) {
    try {
        const { accessToken } = await getBffTokens();

        if (!accessToken) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const industry = searchParams.get('industry');

        const response = await fetch(`${getBackendApiUrl()}/api/products/labels?industry=${industry}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            return NextResponse.json(
                { message: 'Failed to fetch labels' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Labels GET Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
