/**
 * Status Badge Component
 * ======================
 * Renders status badges with appropriate colour classes.
 * Extends the existing theme-badge system.
 *
 * Usage:
 *   const badgeHtml = renderBadge('pending');
 *   // Returns: '<span class="theme-badge theme-badge-pending">Pending</span>'
 *
 *   const badgeEl = createBadgeElement('confirmed');
 *   // Returns an HTMLElement
 */

/** @module components/status-badge */

/**
 * Map of status values to CSS classes.
 * Extend this map as new statuses are added (quotes, invoices, etc.).
 */
const STATUS_CLASSES = {
    // Booking statuses
    pending: 'theme-badge-pending',
    confirmed: 'theme-badge-confirmed',
    completed: 'theme-badge-completed',
    archived: 'theme-badge-archived',

    // Quote statuses
    draft: 'theme-badge-pending',
    sent: 'theme-badge-confirmed',
    accepted: 'theme-badge-completed',
    rejected: 'theme-badge-archived',
    expired: 'theme-badge-archived',

    // Invoice statuses
    'partially paid': 'theme-badge-confirmed',
    paid: 'theme-badge-completed',
    overdue: 'theme-badge-pending',
    cancelled: 'theme-badge-archived',

    // Generic
    active: 'theme-badge-confirmed',
    inactive: 'theme-badge-archived',
};

/**
 * Get the CSS class for a given status.
 * @param {string} status
 * @returns {string}
 */
export function getStatusClass(status) {
    if (!status) return 'theme-badge-archived';
    const key = status.toLowerCase();
    return STATUS_CLASSES[key] || 'theme-badge-archived';
}

/**
 * Render a status badge as an HTML string.
 * @param {string} status - The status value.
 * @returns {string} HTML string for the badge.
 */
export function renderBadge(status) {
    if (!status) return '';
    const cssClass = getStatusClass(status);
    const label = status.charAt(0).toUpperCase() + status.slice(1);
    return `<span class="theme-badge ${cssClass}">${label}</span>`;
}

/**
 * Create a status badge DOM element.
 * @param {string} status - The status value.
 * @returns {HTMLElement}
 */
export function createBadgeElement(status) {
    const span = document.createElement('span');
    span.className = `theme-badge ${getStatusClass(status)}`;
    span.textContent = status ? status.charAt(0).toUpperCase() + status.slice(1) : '';
    return span;
}