import { NextResponse } from 'next/server';
import { proxyAuthorizedJson } from '@/lib/bffAuth';

export async function GET() {
    try {
        return await proxyAuthorizedJson('/api/products', undefined, {
            fallbackError: 'Failed to fetch products',
        });
    } catch (error) {
        console.error('Products GET Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Transform the body to match backend requirements
        // Backend expects: { name, industry, description, categories: string[] }
        const backendPayload = {
            name: body.name,
            industry: body.industry,
            description: body.description,
            categories: body.config?.categories || body.categories || [],
        };

        return await proxyAuthorizedJson(
            '/api/products',
            {
                method: 'POST',
                body: JSON.stringify(backendPayload),
            },
            { fallbackError: 'Failed to create product' }
        );
    } catch (error) {
        console.error('Products POST Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
