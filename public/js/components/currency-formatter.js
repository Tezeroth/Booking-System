/**
 * Currency Formatter Component
 * ============================
 * Locale-aware currency formatting utility.
 * Supports GBP, EUR, USD with proper symbol placement and decimal formatting.
 *
 * Usage:
 *   formatCurrency(1234.56)        // '£1,234.56'
 *   formatCurrency(1000, 'EUR')    // '€1,000.00'
 *   formatCurrency(99.99, 'USD')   // '$99.99'
 *   formatCurrency(0)              // '£0.00'
 *   formatCurrency(null)           // '£0.00'
 */

/** @module components/currency-formatter */

/**
 * Map of currency codes to Intl locale and options.
 */
const CURRENCY_CONFIG = {
    GBP: { locale: 'en-GB', currency: 'GBP' },
    EUR: { locale: 'de-DE', currency: 'EUR' },
    USD: { locale: 'en-US', currency: 'USD' },
};

/**
 * Format a number as a currency string.
 * @param {number|string|null} amount - The amount to format.
 * @param {string} [currency='GBP'] - Currency code (GBP, EUR, USD).
 * @param {boolean} [showZero=true] - Whether to show '£0.00' for zero/null.
 * @returns {string} Formatted currency string.
 */
export function formatCurrency(amount, currency = 'GBP', showZero = true) {
    const num = parseFloat(amount);
    if (isNaN(num)) {
        return showZero ? formatCurrency(0, currency) : '';
    }

    const config = CURRENCY_CONFIG[currency.toUpperCase()] || CURRENCY_CONFIG.GBP;

    try {
        return new Intl.NumberFormat(config.locale, {
            style: 'currency',
            currency: config.currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(num);
    } catch {
        // Fallback
        return `${currency.toUpperCase()} ${num.toFixed(2)}`;
    }
}

/**
 * Parse a currency string back to a number.
 * @param {string} str - Currency string like '£1,234.56'.
 * @returns {number}
 */
export function parseCurrency(str) {
    if (!str) return 0;
    // Remove all non-numeric characters except decimal point and minus
    const cleaned = String(str).replace(/[^0-9.\-]/g, '');
    return parseFloat(cleaned) || 0;
}

/**
 * Calculate VAT (Value Added Tax) amount.
 * @param {number} netAmount - The net amount (before VAT).
 * @param {number} [vatRate=20] - VAT percentage (default 20 for UK).
 * @returns {number} The VAT amount.
 */
export function calculateVAT(netAmount, vatRate = 20) {
    const net = parseFloat(netAmount) || 0;
    return net * (vatRate / 100);
}

/**
 * Calculate gross amount (net + VAT).
 * @param {number} netAmount - The net amount.
 * @param {number} [vatRate=20] - VAT percentage.
 * @returns {number} The gross amount.
 */
export function calculateGross(netAmount, vatRate = 20) {
    const net = parseFloat(netAmount) || 0;
    return net + calculateVAT(net, vatRate);
}