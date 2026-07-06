/**
 * Loading Spinner Component
 * =========================
 * Reusable loading spinner with overlay and inline variants.
 * Wraps the existing showLoading/hideLoading pattern into a component.
 *
 * Usage:
 *   const spinner = new LoadingSpinner({ overlay: true });
 *   spinner.show();
 *   spinner.hide();
 *
 *   // Inline spinner for buttons:
 *   const btnSpinner = new LoadingSpinner({ target: document.getElementById('my-btn'), inline: true });
 *   btnSpinner.show();
 *   btnSpinner.hide();
 */

/** @module components/loading-spinner */

export class LoadingSpinner {
    /**
     * @param {Object} options
     * @param {boolean} [options.overlay=false] - Show as full-screen overlay.
     * @param {HTMLElement} [options.target] - Element to show spinner in (for inline).
     * @param {boolean} [options.inline=false] - Show as inline spinner (small).
     * @param {string} [options.message='Loading...'] - Message to display.
     */
    constructor(options = {}) {
        this.options = {
            overlay: false,
            target: null,
            inline: false,
            message: 'Loading...',
            ...options,
        };

        this.element = null;
        this._originalContent = null;
    }

    /**
     * Show the spinner.
     */
    show() {
        if (this.element) return; // Already showing

        if (this.options.overlay) {
            this._showOverlay();
        } else if (this.options.inline && this.options.target) {
            this._showInline();
        } else {
            this._showOverlay();
        }
    }

    /**
     * Show full-screen overlay spinner.
     */
    _showOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay fixed inset-0 theme-overlay flex items-center justify-center z-50';
        overlay.setAttribute('role', 'status');

        const panel = document.createElement('div');
        panel.className = 'theme-panel rounded-xl p-6 flex items-center gap-4 shadow-xl';

        const spinner = document.createElement('div');
        spinner.className = 'animate-spin rounded-full h-8 w-8 border-4 border-purple-600 border-t-transparent';
        panel.appendChild(spinner);

        const msg = document.createElement('p');
        msg.className = 'theme-text font-medium';
        msg.textContent = this.options.message;
        panel.appendChild(msg);

        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        this.element = overlay;
    }

    /**
     * Show inline spinner inside a target element (e.g., a button).
     */
    _showInline() {
        const target = this.options.target;
        if (!target) return;

        // Save original content
        this._originalContent = {
            html: target.innerHTML,
            disabled: target.disabled,
        };

        // Disable and show spinner
        target.disabled = true;
        target.innerHTML = `
            <span class="inline-flex items-center gap-2">
                <span class="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></span>
                <span>${this.options.message}</span>
            </span>
        `;

        this.element = target;
    }

    /**
     * Hide the spinner.
     */
    hide() {
        if (!this.element) return;

        if (this.options.inline && this._originalContent) {
            // Restore original content
            this.element.innerHTML = this._originalContent.html;
            this.element.disabled = this._originalContent.disabled;
            this._originalContent = null;
        } else if (this.element.parentNode) {
            document.body.removeChild(this.element);
        }

        this.element = null;
    }

    /**
     * Static helper: create and show an overlay spinner.
     * @param {string} [message='Loading...']
     * @returns {LoadingSpinner}
     */
    static overlay(message = 'Loading...') {
        const spinner = new LoadingSpinner({ overlay: true, message });
        spinner.show();
        return spinner;
    }

    /**
     * Static helper: create and show an inline spinner in a target element.
     * @param {HTMLElement} target
     * @param {string} [message='Saving...']
     * @returns {LoadingSpinner}
     */
    static inline(target, message = 'Saving...') {
        const spinner = new LoadingSpinner({ target, inline: true, message });
        spinner.show();
        return spinner;
    }
}