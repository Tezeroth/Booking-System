/**
 * Toast Notification Component
 * =============================
 * Stackable toast notifications with auto-dismiss and manual close.
 * Integrates with the existing #alert-container if available.
 *
 * Usage:
 *   Toast.success('Booking created!');
 *   Toast.error('Failed to save.');
 *   Toast.info('Processing...');
 */

/** @module components/toast */

export class Toast {
    static container = null;

    /**
     * Ensure the toast container exists.
     * @returns {HTMLElement}
     */
    static _getContainer() {
        // Use existing alert container if available
        const existing = document.getElementById('alert-container');
        if (existing) return existing;

        if (!Toast.container) {
            const div = document.createElement('div');
            div.id = 'toast-container';
            div.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm';
            div.setAttribute('aria-live', 'polite');
            document.body.appendChild(div);
            Toast.container = div;
        }
        return Toast.container;
    }

    /**
     * Show a toast notification.
     * @param {string} message - The message to display.
     * @param {'success'|'error'|'info'} type - Toast type.
     * @param {number} [duration=5000] - Auto-dismiss time in ms (0 = no auto-dismiss).
     */
    static show(message, type = 'info', duration = 5000) {
        const container = Toast._getContainer();

        const toast = document.createElement('div');
        toast.setAttribute('role', 'alert');
        toast.className = `toast toast-${type} flex items-center justify-between gap-3 p-4 rounded-lg shadow-lg text-white font-medium transition-all duration-300 ${
            type === 'success'
                ? 'bg-green-600'
                : type === 'error'
                ? 'bg-red-600'
                : 'bg-blue-600'
        }`;

        const text = document.createElement('span');
        text.textContent = message;
        toast.appendChild(text);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'font-bold hover:opacity-80 flex-shrink-0';
        closeBtn.textContent = '✕';
        closeBtn.setAttribute('aria-label', 'Close notification');
        closeBtn.addEventListener('click', () => Toast._dismiss(toast));
        toast.appendChild(closeBtn);

        container.appendChild(toast);

        // Auto-dismiss
        if (duration > 0) {
            setTimeout(() => Toast._dismiss(toast), duration);
        }

        return toast;
    }

    /**
     * Dismiss a toast with fade animation.
     * @param {HTMLElement} toast
     */
    static _dismiss(toast) {
        if (!toast || !toast.parentNode) return;
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    /** @param {string} message */
    static success(message) {
        return Toast.show(message, 'success');
    }

    /** @param {string} message */
    static error(message) {
        return Toast.show(message, 'error');
    }

    /** @param {string} message */
    static info(message) {
        return Toast.show(message, 'info');
    }
}