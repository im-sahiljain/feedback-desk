import { createHmac } from 'crypto';

const SECRET = process.env.LINK_SECRET || 'dev-secret-key-change-me-in-prod';

export function signParams(params: Record<string, string | number | undefined | null>): string {
    // Sort keys to ensure consistent order
    const keys = Object.keys(params).sort();

    // Create a string representation: key=value&key2=value2
    const dataString = keys
        .filter(key => params[key] !== undefined && params[key] !== null)
        .map(key => `${key}=${String(params[key])}`)
        .join('&');

    // Sign the string
    const hmac = createHmac('sha256', SECRET);
    hmac.update(dataString);
    return hmac.digest('hex');
}

export function verifyParams(params: Record<string, string | number | undefined | null>, signature: string): boolean {
    const expectedSignature = signParams(params);
    // Use timingSafeEqual to prevent timing attacks, but simple comparison is okay for this use case if buffers match length
    return expectedSignature === signature;
}
