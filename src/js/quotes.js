/**
 * Quotes Module
 * =============
 * Admin management of quotes with line items, VAT, and totals.
 * Accessed via the Quotes tab in the admin dashboard.
 */

import { getQuotes, createQuote, updateQuote, updateQuoteStatus, deleteQuote, duplicateQuote, getQuotesByCustomer, calculateQuoteTotals } from './firestore-quotes.js';
import { getCustomers } from './firestore-customers.js';
import { formatDate } from './ui.js';
import { sanitiseText } from './validation.js';
import { Modal } from './components/modal.js';
import { confirmDialog } from './components/confirm-dialog.js';
import { Toast } from './components/toast.js';
import { renderBadge } from './components/status-badge.js';
import { formatCurrency } from './components/currency-formatter.js';

/** @module quotes */

const QUOTES_TABLE_BODY_ID = 'quotes-table-body';
const QUOTES_SEARCH_ID = 'quotes-search';
const QUOTES_STATUS_FILTER_ID = 'quotes-status-filter';

let currentQuotes = [];
let currentCustomers = [];

/**
 * Initialise the quotes tab.
 */
export async function initQuotesTab() {
    try {
        currentCustomers = await getCustomers();
    } catch (err) {
        console.error('Error loading customers for quotes:', err);
    }
    await loadQuotes();
}

/**
 * Load quotes from Firestore.
 */
async function loadQuotes() {
    const tbody = document.getElementById(QUOTES_TABLE_BODY_ID);
    if (!tbody) return;

    try {
        const statusFilter = document.getElementById(QUOTES_STATUS_FILTER_ID);
        const filterValue = statusFilter ? statusFilter.value : 'all';

        currentQuotes = await getQuotes({ statusFilter: filterValue });
        renderQuotes(currentQuotes);
    } catch (err) {
        console.error('Error loading quotes:', err);
        Toast.error('Failed to load quotes.');
    }
}

/**
 * Render the quotes table.
 * @param {Array} quotes
 */
function renderQuotes(quotes) {
    const tbody = document.getElementById(QUOTES_TABLE_BODY_ID);
    if (!tbody) return;

    const searchInput = document.getElementById(QUOTES_SEARCH_ID);
    const term = searchInput ? searchInput.value.toLowerCase().trim() : '';

    let filtered = quotes;
    if (term) {
        filtered = quotes.filter((q) => {
            return (
                (q.quoteNumber && q.quoteNumber.toLowerCase().includes(term)) ||
                (q.customerName && q.customerName.toLowerCase().includes(term)) ||
                (q.customerEmail && q.customerEmail.toLowerCase().includes(term))
            );
        });
    }

    const countEl = document.getElementById('quotes-count');
    if (countEl) {
        countEl.textContent = `${filtered.length} quote${filtered.length !== 1 ? 's' : ''}`;
    }

    tbody.innerHTML = '';

    if (filtered.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.setAttribute('colspan', '8');
        cell.className = 'text-center py-8 theme-muted';
        cell.textContent = term ? 'No quotes match your search.' : 'No quotes yet. Create one from a customer.';
        row.appendChild(cell);
        tbody.appendChild(row);
        return;
    }

    filtered.forEach((quote) => {
        const row = document.createElement('tr');
        row.className = 'theme-row-hover';

        const cells = [
            sanitiseText(quote.quoteNumber || ''),
            sanitiseText(quote.customerName || ''),
            sanitiseText(quote.customerEmail || ''),
            formatCurrency(quote.total || 0),
            renderBadge(quote.status || 'draft'),
            quote.validUntil ? formatDate(quote.validUntil) : '-',
            formatDate(quote.createdAt),
        ];

        cells.forEach((cellContent, index) => {
            const cell = document.createElement('td');
            cell.className = 'px-4 py-3 text-sm';
            if (index === 3 || index === 4) {
                // Total and Status columns — use innerHTML for badge/formatting
                cell.innerHTML = cellContent;
            } else {
                cell.textContent = cellContent;
            }
            row.appendChild(cell);
        });

        // Actions column
        const actionsCell = document.createElement('td');
        actionsCell.className = 'px-4 py-3 text-sm';

        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'flex gap-2 flex-wrap';

        // View/Edit button
        const editBtn = createActionBtn('Edit', 'theme-btn-primary', () => showEditQuoteModal(quote));
        actionsContainer.appendChild(editBtn);

        // Duplicate button
        const dupBtn = createActionBtn('Duplicate', 'theme-btn-gray', () => handleDuplicateQuote(quote));
        actionsContainer.appendChild(dupBtn);

        // Send button — opens email client and marks as sent (re-sendable)
        if (quote.status === 'draft' || quote.status === 'sent') {
            const sendBtn = createActionBtn('Send', 'theme-btn-success', () => handleSendQuote(quote));
            actionsContainer.appendChild(sendBtn);
        }
        if (quote.status === 'sent') {
            const acceptBtn = createActionBtn('Accept', 'theme-btn-success', () => updateStatus(quote.id, 'accepted'));
            const rejectBtn = createActionBtn('Reject', 'theme-btn-danger', () => updateStatus(quote.id, 'rejected'));
            actionsContainer.appendChild(acceptBtn);
            actionsContainer.appendChild(rejectBtn);
        }
        if (quote.status === 'accepted') {
            const resendBtn = createActionBtn('Resend', 'theme-btn-teal', () => handleSendQuote(quote));
            actionsContainer.appendChild(resendBtn);
        }

        // Delete button with confirmation
        const deleteBtn = createActionBtn('Delete', 'theme-btn-danger', () => handleDeleteQuote(quote));
        actionsContainer.appendChild(deleteBtn);

        actionsCell.appendChild(actionsContainer);
        row.appendChild(actionsCell);

        tbody.appendChild(row);
    });
}

/**
 * Create an action button.
 * @param {string} text
 * @param {string} colorClass
 * @param {function} onClick
 * @returns {HTMLElement}
 */
function createActionBtn(text, colorClass, onClick) {
    const btn = document.createElement('button');
    btn.className = `theme-btn-action ${colorClass}`;
    btn.textContent = text;
    btn.type = 'button';
    btn.addEventListener('click', onClick);
    return btn;
}

/**
 * Show modal to create a new quote for a customer.
 * @param {Object} customer
 */
export async function showCreateQuoteModal(customer) {
    const formData = await new Promise((resolve) => {
        const content = document.createElement('div');
        content.innerHTML = `
            <form id="create-quote-form" class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="theme-text mb-1 block text-sm font-medium">Customer</label>
                        <p class="theme-text font-medium">${sanitiseText(customer.name)}</p>
                    </div>
                    <div>
                        <label class="theme-text mb-1 block text-sm font-medium">Email</label>
                        <p class="theme-text">${sanitiseText(customer.email || '')}</p>
                    </div>
                </div>

                <div>
                    <label class="theme-text mb-1 block text-sm font-medium">Valid Until <span class="theme-muted text-xs">(optional)</span></label>
                    <input type="date" id="quote-valid-until" class="theme-input w-full rounded-lg px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-purple-400">
                </div>

                <div>
                    <label class="theme-text mb-1 block text-sm font-medium">VAT Rate (%)</label>
                    <input type="number" id="quote-vat-rate" value="20" min="0" max="100" step="0.01" class="theme-input w-24 rounded-lg px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-purple-400">
                    <span class="theme-muted text-xs ml-2">UK standard is 20%</span>
                </div>

                <div>
                <div class="flex items-center justify-between mb-2">
                    <label class="theme-text text-sm font-medium">Line Items / Services</label>
                    <button type="button" id="add-line-item" class="text-sm text-purple-600 hover:underline">+ Add Item</button>
                </div>
                <div class="grid grid-cols-12 gap-2 mb-1 text-xs font-semibold theme-muted uppercase tracking-wide">
                    <div class="col-span-5 pl-3">Description</div>
                    <div class="col-span-2 pl-3">Quantity</div>
                    <div class="col-span-3 pl-3">Unit Price</div>
                    <div class="col-span-2"></div>
                </div>
                <div id="line-items-container">
                    <div class="line-item grid grid-cols-12 gap-2 mb-2 items-start">
                        <div class="col-span-5">
                            <input type="text" name="item-desc[]" placeholder="Description" required class="theme-input w-full rounded-lg px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-purple-400">
                        </div>
                        <div class="col-span-2">
                            <input type="number" name="item-qty[]" placeholder="Qty" min="1" step="1" value="1" required class="theme-input w-full rounded-lg px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-purple-400">
                        </div>
                        <div class="col-span-3">
                            <input type="number" name="item-price[]" placeholder="Unit price (£)" min="0" step="0.01" value="0" required class="theme-input w-full rounded-lg px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-purple-400">
                        </div>
                        <div class="col-span-2 flex items-center">
                            <button type="button" class="remove-item text-red-500 hover:text-red-700 text-lg font-bold">&times;</button>
                        </div>
                    </div>
                </div>
                </div>

                <div class="theme-surface rounded-lg p-4 space-y-1 text-sm">
                    <div class="flex justify-between">
                        <span class="theme-muted">Subtotal:</span>
                        <span id="quote-subtotal">£0.00</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="theme-muted">VAT (20%):</span>
                        <span id="quote-vat">£0.00</span>
                    </div>
                    <div class="flex justify-between font-bold text-base">
                        <span>Total:</span>
                        <span id="quote-total">£0.00</span>
                    </div>
                </div>

                <div>
                    <label for="quote-notes" class="theme-text mb-1 block text-sm font-medium">Notes <span class="theme-muted text-xs">(optional)</span></label>
                    <textarea id="quote-notes" rows="3" class="theme-input w-full resize-none rounded-lg px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-purple-400"></textarea>
                </div>

                <div class="flex justify-end gap-2 pt-2">
                    <button type="button" id="create-quote-cancel" class="theme-btn-secondary px-4 py-2 rounded-lg font-medium">Cancel</button>
                    <button type="submit" class="theme-button px-4 py-2 rounded-lg font-semibold">Create Quote</button>
                </div>
            </form>
        `;

        const modal = new Modal({
            title: `New Quote — ${customer.name}`,
            content,
            size: 'lg',
            closable: true,
            buttons: [],
        });

        // Wire up line item add/remove and total calculation
        const container = content.querySelector('#line-items-container');
        const addBtn = content.querySelector('#add-line-item');
        const vatRateInput = content.querySelector('#quote-vat-rate');

        function updateTotals() {
            const items = container.querySelectorAll('.line-item');
            const lineItems = [];
            items.forEach((item) => {
                const desc = item.querySelector('[name="item-desc[]"]').value;
                const qty = parseFloat(item.querySelector('[name="item-qty[]"]').value) || 0;
                const price = parseFloat(item.querySelector('[name="item-price[]"]').value) || 0;
                if (desc) lineItems.push({ description: desc, quantity: qty, unitPrice: price });
            });

            const vatRate = parseFloat(vatRateInput.value) || 20;
            const totals = calculateQuoteTotals(lineItems, vatRate);

            content.querySelector('#quote-subtotal').textContent = formatCurrency(totals.subtotal);
            content.querySelector('#quote-vat').textContent = formatCurrency(totals.vatAmount);
            content.querySelector('#quote-total').textContent = formatCurrency(totals.total);
        }

        function addLineItem(desc = '', qty = 1, price = 0) {
            const div = document.createElement('div');
            div.className = 'line-item grid grid-cols-12 gap-2 mb-2 items-start';
            div.innerHTML = `
                <div class="col-span-5">
                    <input type="text" name="item-desc[]" placeholder="Description" value="${sanitiseText(desc)}" required class="theme-input w-full rounded-lg px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-purple-400">
                </div>
                <div class="col-span-2">
                    <input type="number" name="item-qty[]" placeholder="Qty" min="1" step="1" value="${qty}" required class="theme-input w-full rounded-lg px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-purple-400">
                </div>
                <div class="col-span-3">
                    <input type="number" name="item-price[]" placeholder="Unit price (£)" min="0" step="0.01" value="${price}" required class="theme-input w-full rounded-lg px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-purple-400">
                </div>
                <div class="col-span-2 flex items-center">
                    <button type="button" class="remove-item text-red-500 hover:text-red-700 text-lg font-bold">&times;</button>
                </div>
            `;

            const inputs = div.querySelectorAll('input');
            inputs.forEach((input) => {
                input.addEventListener('input', updateTotals);
            });

            div.querySelector('.remove-item').addEventListener('click', () => {
                div.remove();
                updateTotals();
            });

            container.appendChild(div);
            updateTotals();
        }

        // Wire existing line item
        const existingItems = container.querySelectorAll('.line-item');
        existingItems.forEach((item) => {
            const inputs = item.querySelectorAll('input');
            inputs.forEach((input) => {
                input.addEventListener('input', updateTotals);
            });
            item.querySelector('.remove-item').addEventListener('click', () => {
                item.remove();
                updateTotals();
            });
        });

        addBtn.addEventListener('click', () => addLineItem());
        vatRateInput.addEventListener('input', updateTotals);

        const form = content.querySelector('#create-quote-form');
        const cancelBtn = content.querySelector('#create-quote-cancel');

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const items = container.querySelectorAll('.line-item');
            const lineItems = [];
            items.forEach((item) => {
                const desc = item.querySelector('[name="item-desc[]"]').value.trim();
                const qty = parseFloat(item.querySelector('[name="item-qty[]"]').value) || 0;
                const price = parseFloat(item.querySelector('[name="item-price[]"]').value) || 0;
                if (desc) lineItems.push({ description: desc, quantity: qty, unitPrice: price });
            });

            if (lineItems.length === 0) {
                Toast.error('Add at least one line item.');
                return;
            }

            const vatRate = parseFloat(vatRateInput.value) || 20;
            const validUntil = document.getElementById('quote-valid-until').value;
            const notes = document.getElementById('quote-notes').value.trim();

            modal.close();
            resolve({ lineItems, vatRate, validUntil, notes });
        });

        cancelBtn.addEventListener('click', () => {
            modal.close();
            resolve(null);
        });

        modal.open();
    });

    if (!formData) return;

    try {
        const quoteId = await createQuote({
            customerId: customer.id,
            customerName: customer.name,
            customerEmail: customer.email,
            lineItems: formData.lineItems,
            vatRate: formData.vatRate,
            validUntil: formData.validUntil || null,
            notes: formData.notes,
        });
        Toast.success('Quote created successfully.');
        await loadQuotes();
    } catch (err) {
        console.error('Error creating quote:', err);
        Toast.error('Failed to create quote.');
    }
}

/**
 * Show modal to edit an existing quote.
 * @param {Object} quote
 */
async function showEditQuoteModal(quote) {
    const formData = await new Promise((resolve) => {
        const content = document.createElement('div');
        content.innerHTML = `
            <form id="edit-quote-form" class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="theme-text mb-1 block text-sm font-medium">Quote #</label>
                        <p class="theme-text font-medium">${sanitiseText(quote.quoteNumber)}</p>
                    </div>
                    <div>
                        <label class="theme-text mb-1 block text-sm font-medium">Customer</label>
                        <p class="theme-text">${sanitiseText(quote.customerName)}</p>
                    </div>
                </div>

                <div>
                    <label class="theme-text mb-1 block text-sm font-medium">Valid Until <span class="theme-muted text-xs">(optional)</span></label>
                    <input type="date" id="edit-quote-valid-until" value="${quote.validUntil || ''}" class="theme-input w-full rounded-lg px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-purple-400">
                </div>

                <div>
                    <label class="theme-text mb-1 block text-sm font-medium">VAT Rate (%)</label>
                    <input type="number" id="edit-quote-vat-rate" value="${quote.vatRate || 20}" min="0" max="100" step="0.01" class="theme-input w-24 rounded-lg px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-purple-400">
                </div>

                <div>
                    <div class="flex items-center justify-between mb-2">
                        <label class="theme-text text-sm font-medium">Line Items / Services</label>
                        <button type="button" id="edit-add-line-item" class="text-sm text-purple-600 hover:underline">+ Add Item</button>
                    </div>
                    <div class="grid grid-cols-12 gap-2 mb-1 text-xs font-semibold theme-muted uppercase tracking-wide">
                        <div class="col-span-5 pl-3">Description</div>
                        <div class="col-span-2 pl-3">Quantity</div>
                        <div class="col-span-3 pl-3">Unit Price</div>
                        <div class="col-span-2"></div>
                    </div>
                    <div id="edit-line-items-container">
                        ${(quote.lineItems || []).map((item, i) => `
                            <div class="line-item grid grid-cols-12 gap-2 mb-2 items-start">
                                <div class="col-span-5">
                                    <input type="text" name="item-desc[]" placeholder="Description" value="${sanitiseText(item.description)}" required class="theme-input w-full rounded-lg px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-purple-400">
                                </div>
                                <div class="col-span-2">
                                    <input type="number" name="item-qty[]" placeholder="Qty" min="1" step="1" value="${item.quantity || 1}" required class="theme-input w-full rounded-lg px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-purple-400">
                                </div>
                                <div class="col-span-3">
                                    <input type="number" name="item-price[]" placeholder="Unit price (£)" min="0" step="0.01" value="${item.unitPrice || 0}" required class="theme-input w-full rounded-lg px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-purple-400">
                                </div>
                                <div class="col-span-2 flex items-center">
                                    <button type="button" class="remove-item text-red-500 hover:text-red-700 text-lg font-bold">&times;</button>
                                </div>
                            </div>
                        `).join('') || ''}
                    </div>
                </div>

                <div class="theme-surface rounded-lg p-4 space-y-1 text-sm">
                    <div class="flex justify-between">
                        <span class="theme-muted">Subtotal:</span>
                        <span id="edit-quote-subtotal">${formatCurrency(quote.subtotal || 0)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="theme-muted">VAT (${quote.vatRate || 20}%):</span>
                        <span id="edit-quote-vat">${formatCurrency(quote.vatAmount || 0)}</span>
                    </div>
                    <div class="flex justify-between font-bold text-base">
                        <span>Total:</span>
                        <span id="edit-quote-total">${formatCurrency(quote.total || 0)}</span>
                    </div>
                </div>

                <div>
                    <label for="edit-quote-notes" class="theme-text mb-1 block text-sm font-medium">Notes</label>
                    <textarea id="edit-quote-notes" rows="3" class="theme-input w-full resize-none rounded-lg px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-purple-400">${sanitiseText(quote.notes || '')}</textarea>
                </div>

                <div class="flex justify-end gap-2 pt-2">
                    <button type="button" id="edit-quote-cancel" class="theme-btn-secondary px-4 py-2 rounded-lg font-medium">Cancel</button>
                    <button type="submit" class="theme-button px-4 py-2 rounded-lg font-semibold">Save Changes</button>
                </div>
            </form>
        `;

        const modal = new Modal({
            title: `Edit Quote — ${quote.quoteNumber}`,
            content,
            size: 'lg',
            closable: true,
            buttons: [],
        });

        const container = content.querySelector('#edit-line-items-container');
        const addBtn = content.querySelector('#edit-add-line-item');
        const vatRateInput = content.querySelector('#edit-quote-vat-rate');

        function updateTotals() {
            const items = container.querySelectorAll('.line-item');
            const lineItems = [];
            items.forEach((item) => {
                const desc = item.querySelector('[name="item-desc[]"]').value;
                const qty = parseFloat(item.querySelector('[name="item-qty[]"]').value) || 0;
                const price = parseFloat(item.querySelector('[name="item-price[]"]').value) || 0;
                if (desc) lineItems.push({ description: desc, quantity: qty, unitPrice: price });
            });

            const vatRate = parseFloat(vatRateInput.value) || 20;
            const totals = calculateQuoteTotals(lineItems, vatRate);

            content.querySelector('#edit-quote-subtotal').textContent = formatCurrency(totals.subtotal);
            content.querySelector('#edit-quote-vat').textContent = formatCurrency(totals.vatAmount);
            content.querySelector('#edit-quote-total').textContent = formatCurrency(totals.total);
        }

        function addLineItem(desc = '', qty = 1, price = 0) {
            const div = document.createElement('div');
            div.className = 'line-item grid grid-cols-12 gap-2 mb-2 items-start';
            div.innerHTML = `
                <div class="col-span-5">
                    <input type="text" name="item-desc[]" placeholder="Description" value="${sanitiseText(desc)}" required class="theme-input w-full rounded-lg px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-purple-400">
                </div>
                <div class="col-span-2">
                    <input type="number" name="item-qty[]" placeholder="Qty" min="1" step="1" value="${qty}" required class="theme-input w-full rounded-lg px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-purple-400">
                </div>
                <div class="col-span-3">
                    <input type="number" name="item-price[]" placeholder="Unit price (£)" min="0" step="0.01" value="${price}" required class="theme-input w-full rounded-lg px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-purple-400">
                </div>
                <div class="col-span-2 flex items-center">
                    <button type="button" class="remove-item text-red-500 hover:text-red-700 text-lg font-bold">&times;</button>
                </div>
            `;

            const inputs = div.querySelectorAll('input');
            inputs.forEach((input) => {
                input.addEventListener('input', updateTotals);
            });

            div.querySelector('.remove-item').addEventListener('click', () => {
                div.remove();
                updateTotals();
            });

            container.appendChild(div);
            updateTotals();
        }

        // Wire existing items
        container.querySelectorAll('.line-item').forEach((item) => {
            const inputs = item.querySelectorAll('input');
            inputs.forEach((input) => {
                input.addEventListener('input', updateTotals);
            });
            item.querySelector('.remove-item').addEventListener('click', () => {
                item.remove();
                updateTotals();
            });
        });

        addBtn.addEventListener('click', () => addLineItem());
        vatRateInput.addEventListener('input', updateTotals);

        const form = content.querySelector('#edit-quote-form');
        const cancelBtn = content.querySelector('#edit-quote-cancel');

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const items = container.querySelectorAll('.line-item');
            const lineItems = [];
            items.forEach((item) => {
                const desc = item.querySelector('[name="item-desc[]"]').value.trim();
                const qty = parseFloat(item.querySelector('[name="item-qty[]"]').value) || 0;
                const price = parseFloat(item.querySelector('[name="item-price[]"]').value) || 0;
                if (desc) lineItems.push({ description: desc, quantity: qty, unitPrice: price });
            });

            if (lineItems.length === 0) {
                Toast.error('Add at least one line item.');
                return;
            }

            const vatRate = parseFloat(vatRateInput.value) || 20;
            const validUntil = document.getElementById('edit-quote-valid-until').value;
            const notes = document.getElementById('edit-quote-notes').value.trim();

            modal.close();
            resolve({ lineItems, vatRate, validUntil, notes });
        });

        cancelBtn.addEventListener('click', () => {
            modal.close();
            resolve(null);
        });

        modal.open();
    });

    if (!formData) return;

    try {
        await updateQuote(quote.id, {
            lineItems: formData.lineItems,
            vatRate: formData.vatRate,
            validUntil: formData.validUntil || null,
            notes: formData.notes,
        });
        Toast.success('Quote updated successfully.');
        await loadQuotes();
    } catch (err) {
        console.error('Error updating quote:', err);
        Toast.error('Failed to update quote.');
    }
}

/**
 * Update quote status.
 * @param {string} id
 * @param {string} status
 */
async function updateStatus(id, status) {
    try {
        await updateQuoteStatus(id, status);
        Toast.success(`Quote marked as ${status}.`);
        await loadQuotes();
    } catch (err) {
        console.error('Error updating quote status:', err);
        Toast.error('Failed to update quote status.');
    }
}

/**
 * Handle duplicate quote.
 * @param {Object} quote
 */
async function handleDuplicateQuote(quote) {
    try {
        await duplicateQuote(quote.id);
        Toast.success('Quote duplicated.');
        await loadQuotes();
    } catch (err) {
        console.error('Error duplicating quote:', err);
        Toast.error('Failed to duplicate quote.');
    }
}

/**
 * Handle delete quote with confirmation.
 * @param {Object} quote
 */
async function handleDeleteQuote(quote) {
    const confirmed = await confirmDialog({
        title: 'Delete Quote',
        message: `Are you sure you want to permanently delete quote ${quote.quoteNumber}? This cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        danger: true,
    });

    if (!confirmed) return;

    try {
        await deleteQuote(quote.id);
        Toast.success(`Quote ${quote.quoteNumber} deleted.`);
        await loadQuotes();
    } catch (err) {
        console.error('Error deleting quote:', err);
        Toast.error('Failed to delete quote.');
    }
}

/**
 * Handle sending a quote — opens default email client and marks as sent.
 * @param {Object} quote
 */
async function handleSendQuote(quote) {
    // Build a summary of line items for the email body
    const lineItemsSummary = (quote.lineItems || [])
        .map(item => `  - ${item.description}: ${item.quantity} × ${formatCurrency(item.unitPrice)}`)
        .join('\n');

    const subject = encodeURIComponent(`Quote ${quote.quoteNumber} from Booking-System`);
    const body = encodeURIComponent(
        `Dear ${quote.customerName},\n\n` +
        `Please find your quote (${quote.quoteNumber}) attached below.\n\n` +
        `---\n${lineItemsSummary}\n---\n\n` +
        `Total: ${formatCurrency(quote.total || 0)}\n` +
        `Valid until: ${quote.validUntil ? formatDate(quote.validUntil) : 'N/A'}\n\n` +
        `Kind regards,\nBooking-System`
    );

    // Open default email client
    window.open(`mailto:${quote.customerEmail}?subject=${subject}&body=${body}`, '_blank');

    // Mark as sent in the system
    try {
        await updateQuoteStatus(quote.id, 'sent');
        Toast.success(`Quote ${quote.quoteNumber} sent to ${quote.customerEmail}.`);
        await loadQuotes();
    } catch (err) {
        console.error('Error updating quote status after send:', err);
        Toast.error('Email opened but failed to update quote status.');
    }
}

/**
 * Wire search and filter for quotes.
 */
export function wireQuotesSearch() {
    const searchInput = document.getElementById(QUOTES_SEARCH_ID);
    if (searchInput) {
        searchInput.addEventListener('input', () => renderQuotes(currentQuotes));
    }

    const statusFilter = document.getElementById(QUOTES_STATUS_FILTER_ID);
    if (statusFilter) {
        statusFilter.addEventListener('change', () => loadQuotes());
    }
}