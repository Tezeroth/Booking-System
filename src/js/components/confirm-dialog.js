/**
 * Confirm Dialog Component
 * ========================
 * Promise-based confirmation dialog. Replaces native `confirm()` calls.
 *
 * Usage:
 *   const result = await confirmDialog('Are you sure you want to delete this?');
 *   if (result) { // delete... }
 *
 *   const result = await confirmDialog({
 *     title: 'Delete Booking',
 *     message: 'Are you sure? This cannot be undone.',
 *     confirmText: 'Delete',
 *     cancelText: 'Cancel',
 *     danger: true,
 *   });
 */

/** @module components/confirm-dialog */

import { Modal } from './modal.js';

/**
 * Show a confirmation dialog.
 * @param {string|Object} options - Message string or configuration object.
 * @param {string} [options.title='Confirm'] - Dialog title.
 * @param {string} [options.message='Are you sure?'] - Dialog message body.
 * @param {string} [options.confirmText='Confirm'] - Confirm button text.
 * @param {string} [options.cancelText='Cancel'] - Cancel button text.
 * @param {boolean} [options.danger=false] - Style confirm as destructive.
 * @returns {Promise<boolean>} true if confirmed, false if cancelled.
 */
export async function confirmDialog(options) {
    if (typeof options === 'string') {
        options = { message: options };
    }

    const {
        title = 'Confirm',
        message = 'Are you sure?',
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        danger = false,
    } = options;

    const modal = new Modal({
        title,
        content: `<p class="theme-text">${message}</p>`,
        size: 'sm',
        closable: true,
        buttons: [
            { text: cancelText, value: 'cancel' },
            {
                text: confirmText,
                value: 'confirm',
                primary: true,
                class: danger ? 'bg-red-600 hover:bg-red-700' : '',
            },
        ],
    });

    const result = await modal.open();
    return result === 'confirm';
}