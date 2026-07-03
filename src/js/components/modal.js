/**
 * Modal Component
 * ===============
 * Reusable modal dialog with focus trapping, ESC dismissal, and overlay click-to-close.
 * 
 * Usage:
 *   const modal = new Modal({ title: 'My Modal', content: '<p>Hello</p>' });
 *   modal.open();
 *   modal.close();
 * 
 * Alternatively, use the helper:
 *   const modal = await Modal.show({ title: 'Confirm', content: 'Are you sure?' });
 *   // Returns 'confirm' or 'cancel'
 */

/** @module components/modal */

export class Modal {
    /**
     * @param {Object} options
     * @param {string} options.title - Modal heading text
     * @param {string|HTMLElement} options.content - HTML string or DOM element for body
     * @param {string} [options.size='md'] - 'sm', 'md', 'lg'
     * @param {boolean} [options.closable=true] - Show close button
     * @param {Array<{text: string, class?: string, value?: string, primary?: boolean}>} [options.buttons=[]] - Footer buttons
     * @param {function} [options.onClose] - Callback when modal closes
     */
    constructor(options = {}) {
        this.options = {
            title: '',
            content: '',
            size: 'md',
            closable: true,
            buttons: [],
            onClose: null,
            ...options,
        };

        this._resolvePromise = null;
        this.element = null;
        this._build();
    }

    /**
     * Build the modal DOM structure.
     */
    _build() {
        // Overlay
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay fixed inset-0 theme-overlay z-40';
        overlay.setAttribute('aria-hidden', 'true');

        // Container
        const container = document.createElement('div');
        container.className = 'modal-container fixed inset-0 z-50 flex items-center justify-center p-4';
        container.setAttribute('role', 'dialog');
        container.setAttribute('aria-modal', 'true');
        container.setAttribute('aria-labelledby', 'modal-title');

        // Panel
        const panel = document.createElement('div');
        const sizeClasses = {
            sm: 'max-w-sm',
            md: 'max-w-lg',
            lg: 'max-w-2xl',
        };
        panel.className = `theme-panel max-h-[90vh] w-full ${sizeClasses[this.options.size] || 'max-w-lg'} overflow-y-auto rounded-xl shadow-2xl`;
        panel.setAttribute('tabindex', '-1');

        // Header
        const header = document.createElement('div');
        header.className = 'gradient-bg flex items-center justify-between rounded-t-xl px-6 py-4';

        const title = document.createElement('h2');
        title.id = 'modal-title';
        title.className = 'text-lg font-bold text-white';
        title.textContent = this.options.title;

        header.appendChild(title);

        if (this.options.closable) {
            const closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.className = 'text-white hover:text-gray-200 text-2xl focus:outline-none focus:ring-2 focus:ring-white rounded';
            closeBtn.setAttribute('aria-label', 'Close modal');
            closeBtn.innerHTML = '&times;';
            closeBtn.addEventListener('click', () => this.close());
            header.appendChild(closeBtn);
        }

        panel.appendChild(header);

        // Body
        const body = document.createElement('div');
        body.className = 'p-6 space-y-4';

        if (typeof this.options.content === 'string') {
            body.innerHTML = this.options.content;
        } else if (this.options.content instanceof HTMLElement) {
            body.appendChild(this.options.content);
        }

        panel.appendChild(body);

        // Footer buttons
        if (this.options.buttons.length > 0) {
            const footer = document.createElement('div');
            footer.className = 'theme-surface flex justify-end gap-2 rounded-b-xl px-6 py-4';

            this.options.buttons.forEach((btnConfig, index) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = btnConfig.primary
                    ? 'theme-button px-4 py-2 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2'
                    : 'theme-btn-secondary px-4 py-2 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-gray-400';
                if (btnConfig.class) {
                    btn.className += ' ' + btnConfig.class;
                }
                btn.textContent = btnConfig.text;
                btn.addEventListener('click', () => {
                    this.close(btnConfig.value || btnConfig.text.toLowerCase());
                });
                footer.appendChild(btn);
            });

            panel.appendChild(footer);
        }

        container.appendChild(panel);

        // Assemble
        this.element = document.createElement('div');
        this.element.className = 'modal-root';
        this.element.appendChild(overlay);
        this.element.appendChild(container);

        // ESC key handler
        this._keyHandler = (e) => {
            if (e.key === 'Escape' && this.options.closable) {
                this.close();
            }
        };

        // Overlay click
        overlay.addEventListener('click', () => {
            if (this.options.closable) {
                this.close();
            }
        });
    }

    /**
     * Open the modal. Returns a Promise that resolves with the button value.
     * @returns {Promise<string|null>}
     */
    open() {
        return new Promise((resolve) => {
            this._resolvePromise = resolve;
            document.body.appendChild(this.element);
            document.body.addEventListener('keydown', this._keyHandler);
            // Focus the panel
            const panel = this.element.querySelector('[tabindex="-1"]');
            if (panel) panel.focus();
        });
    }

    /**
     * Close the modal.
     * @param {*} [result=null] - Value to resolve the promise with.
     */
    close(result = null) {
        if (!this.element || !this.element.parentNode) return;

        document.body.removeChild(this.element);
        document.body.removeEventListener('keydown', this._keyHandler);

        if (this._resolvePromise) {
            this._resolvePromise(result);
            this._resolvePromise = null;
        }

        if (this.options.onClose) {
            this.options.onClose(result);
        }
    }

    /**
     * Static helper: show a modal with title and content, returns Promise of button value.
     * @param {Object} options
     * @param {string} options.title
     * @param {string} options.content
     * @param {Array} [options.buttons]
     * @returns {Promise<string|null>}
     */
    static show(options) {
        const modal = new Modal(options);
        return modal.open();
    }

    /**
     * Clean up and remove from DOM.
     */
    destroy() {
        this.close();
        this.element = null;
    }
}