/**
 * Get the currently selected product ID from localStorage
 */
export function getCurrentProductId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('current_product_id');
}

/**
 * Set the currently selected product ID in localStorage
 */
export function setCurrentProductId(productId: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('current_product_id', productId);
}

/**
 * Clear the currently selected product ID from localStorage
 */
export function clearCurrentProductId(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('current_product_id');
}
