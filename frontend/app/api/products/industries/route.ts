import { NextResponse } from 'next/server';
import { getBackendApiUrl, getBffTokens } from '@/lib/bffAuth';

export async function GET() {
    try {
        const { accessToken } = await getBffTokens();

        if (!accessToken) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const response = await fetch(`${getBackendApiUrl()}/api/products/industries`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            return NextResponse.json(
                { message: 'Failed to fetch industries' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Industries GET Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
