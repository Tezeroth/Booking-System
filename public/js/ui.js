/**
 * UI Helper Module
 * ================
 * Shared UI functions: alerts, loading states, DOM helpers.
 * ALL user-data rendered via textContent — NEVER innerHTML.
 */

/** @module ui */

/**
 * Show a friendly user-facing error message.
 * @param {string} elementId - The ID of the element to show the error in.
 * @param {string} message - The error message to display.
 */
export function showError(elementId, message) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.classList.remove('hidden');
}

/**
 * Clear all error messages in a form.
 * @param {string} formId - The ID of the form.
 */
export function clearErrors(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    const errorEls = form.querySelectorAll('.error-message');
    errorEls.forEach((el) => {
        el.textContent = '';
        el.classList.add('hidden');
    });
}

/**
 * Show a loading spinner or overlay.
 * @param {string} elementId
 */
export function showLoading(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.classList.remove('hidden');
}

/**
 * Hide a loading spinner or overlay.
 * @param {string} elementId
 */
export function hideLoading(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.classList.add('hidden');
}

/**
 * Show a temporary success or info alert at the top of the page.
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
export function showAlert(message, type) {
    const container = document.getElementById('alert-container');
    if (!container) return;

    const alert = document.createElement('div');
    alert.setAttribute('role', 'alert');
    alert.className = `alert alert-${type} p-4 mb-4 rounded-lg text-white font-medium ${
        type === 'success'
            ? 'bg-green-600'
            : type === 'error'
            ? 'bg-red-600'
            : 'bg-blue-600'
    }`;

    const text = document.createElement('span');
    text.textContent = message;
    alert.appendChild(text);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'float-right font-bold hover:opacity-80 ml-4';
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label', 'Close alert');
    closeBtn.addEventListener('click', () => alert.remove());
    alert.appendChild(closeBtn);

    container.appendChild(alert);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 5000);
}

/**
 * Format a date for display.
 * @param {Date|string|Object} dateInput
 * @returns {string} Formatted date string.
 */
export function formatDate(dateInput) {
    if (!dateInput) return 'N/A';

    try {
        let date;
        if (typeof dateInput === 'object' && dateInput.seconds) {
            // Firestore Timestamp
            date = new Date(dateInput.seconds * 1000);
        } else if (typeof dateInput === 'string') {
            date = new Date(dateInput);
        } else {
            date = new Date(dateInput);
        }

        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    } catch {
        return 'Invalid date';
    }
}

/**
 * Format a time string (HH:mm) for display.
 * @param {string} timeStr
 * @returns {string}
 */
export function formatTime(timeStr) {
    if (!timeStr) return 'N/A';
    try {
        const [hours, minutes] = timeStr.split(':');
        const hour = parseInt(hours, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    } catch {
        return timeStr;
    }
}

/**
 * Sanitise and set text content safely.
 * Use this instead of innerHTML.
 * @param {HTMLElement} element
 * @param {string} text
 */
export function setTextContent(element, text) {
    if (!element) return;
    element.textContent = text || '';
}

/**
 * Create a DOM element with attributes.
 * @param {string} tag
 * @param {Object} attrs
 * @returns {HTMLElement}
 */
export function createElement(tag, attrs = {}) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
        if (key === 'className') {
            el.className = value;
        } else if (key === 'textContent') {
            el.textContent = value;
        } else {
            el.setAttribute(key, value);
        }
    });
    return el;
}

/**
 * Generate time slots for a given day based on business hours.
 * @param {Object} openingHours - The business hours object from config.
 * @param {string} dayOfWeek - Lowercase day name (e.g. 'monday').
 * @returns {Array<string>} Array of time slots in HH:mm format.
 */
export function generateTimeSlots(openingHours, dayOfWeek) {
    const day = openingHours[dayOfWeek];
    if (!day || !day.open || !day.close) return [];

    const slots = [];
    const [openHour, openMin] = day.open.split(':').map(Number);
    const [closeHour, closeMin] = day.close.split(':').map(Number);

    const openMinutes = openHour * 60 + openMin;
    const closeMinutes = closeHour * 60 + closeMin;
    const slotDuration = 60; // 1 hour slots as per requirements

    for (let m = openMinutes; m + slotDuration <= closeMinutes; m += slotDuration) {
        const h = Math.floor(m / 60);
        const min = m % 60;
        slots.push(
            `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
        );
    }

    return slots;
}