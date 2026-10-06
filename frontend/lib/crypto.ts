import { createHmac, timingSafeEqual } from 'crypto';

function getSecretKey(): string {
    const secret = process.env.LINK_SECRET;
    if (!secret || secret.trim() === '') {
        throw new Error('LINK_SECRET environment variable is not configured. A valid signing secret is required.');
    }
    return secret;
}

export function signParams(
    params: Record<string, string | number | undefined | null>,
    customSecret?: string
): string {
    const secret = customSecret ?? getSecretKey();

    // Sort keys to ensure consistent order
    const keys = Object.keys(params).sort();

    // Create a string representation: key=value&key2=value2
    const dataString = keys
        .filter(key => params[key] !== undefined && params[key] !== null)
        .map(key => `${key}=${String(params[key])}`)
        .join('&');

    // Sign the string
    const hmac = createHmac('sha256', secret);
    hmac.update(dataString);
    return hmac.digest('hex');
}

export function verifyParams(
    params: Record<string, string | number | undefined | null>,
    signature: string | undefined | null,
    customSecret?: string
): boolean {
    if (!signature || typeof signature !== 'string') {
        return false;
    }

    // Check expiration if expiresAt / expires_at / exp is provided
    const expiresAt = params.expiresAt ?? params.expires_at ?? params.exp;
    if (expiresAt !== undefined && expiresAt !== null && expiresAt !== '') {
        const expNum = Number(expiresAt);
        if (isNaN(expNum) || Date.now() > expNum) {
            return false;
        }
    }

    // Hex string validation: sha256 hex digest is 64 characters [0-9a-fA-F]
    const hexRegex = /^[0-9a-fA-F]+$/;
    if (!hexRegex.test(signature)) {
        return false;
    }

    let expectedSignature: string;
    try {
        expectedSignature = signParams(params, customSecret);
    } catch {
        return false;
    }

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const signatureBuffer = Buffer.from(signature, 'utf8');

    // timingSafeEqual requires buffers of identical length
    if (expectedBuffer.length !== signatureBuffer.length) {
        return false;
    }

    return timingSafeEqual(expectedBuffer, signatureBuffer);
}
