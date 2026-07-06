/**
 * Customers Module
 * ================
 * Admin management of customer profiles.
 * Accessed via the Customers tab in the admin dashboard.
 */

import { getCustomers, createCustomer, updateCustomer, deleteCustomer, findCustomerByEmail } from './firestore-customers.js';
import { showAlert, formatDate } from './ui.js';
import { sanitiseText } from './validation.js';
import { showCreateQuoteModal } from './quotes.js';
import { Modal } from './components/modal.js';
import { confirmDialog } from './components/confirm-dialog.js';
import { Toast } from './components/toast.js';
import { renderBadge } from './components/status-badge.js';

/** @module customers */

const CUSTOMERS_CONTAINER_ID = 'customers-content';
const CUSTOMERS_TABLE_BODY_ID = 'customers-table-body';

let currentCustomers = [];

/**
 * Initialise the customers tab.
 * Called when the admin clicks the Customers tab.
 */
export async function initCustomersTab() {
    await loadCustomers();
}

/**
 * Load customers from Firestore and render the table.
 */
async function loadCustomers() {
    const tbody = document.getElementById(CUSTOMERS_TABLE_BODY_ID);
    if (!tbody) return;

    try {
        currentCustomers = await getCustomers();
        renderCustomers(currentCustomers);
    } catch (err) {
        console.error('Error loading customers:', err);
        Toast.error('Failed to load customers.');
    }
}

/**
 * Render the customers table.
 * @param {Array} customers
 */
function renderCustomers(customers) {
    const tbody = document.getElementById(CUSTOMERS_TABLE_BODY_ID);
    if (!tbody) return;

    // Apply search filter
    const searchInput = document.getElementById('customers-search');
    const term = searchInput ? searchInput.value.toLowerCase().trim() : '';

    let filtered = customers;
    if (term) {
        filtered = customers.filter((c) => {
            return (
                (c.name && c.name.toLowerCase().includes(term)) ||
                (c.email && c.email.toLowerCase().includes(term)) ||
                (c.phone && c.phone.toLowerCase().includes(term)) ||
                (c.company && c.company.toLowerCase().includes(term))
            );
        });
    }

    // Update count
    const countEl = document.getElementById('customers-count');
    if (countEl) {
        countEl.textContent = `${filtered.length} customer${filtered.length !== 1 ? 's' : ''}`;
    }

    tbody.innerHTML = '';

    if (filtered.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.setAttribute('colspan', '6');
        cell.className = 'text-center py-8 theme-muted';
        cell.textContent = term ? 'No customers match your search.' : 'No customers yet. Accept a booking to create one.';
        row.appendChild(cell);
        tbody.appendChild(row);
        return;
    }

    filtered.forEach((customer) => {
        const row = document.createElement('tr');
        row.className = 'theme-row-hover';

        const cells = [
            sanitiseText(customer.name || ''),
            sanitiseText(customer.email || ''),
            sanitiseText(customer.phone || ''),
            sanitiseText(customer.company || '-'),
            String(customer.totalBookings || 0),
            formatDate(customer.createdAt),
        ];

        cells.forEach((cellContent) => {
            const cell = document.createElement('td');
            cell.className = 'px-4 py-3 text-sm';
            cell.textContent = cellContent;
            row.appendChild(cell);
        });

        // Actions column
        const actionsCell = document.createElement('td');
        actionsCell.className = 'px-4 py-3 text-sm';

        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'flex gap-2';

        // Edit button
        const editBtn = document.createElement('button');
        editBtn.className = 'theme-btn-action theme-btn-primary';
        editBtn.textContent = 'Edit';
        editBtn.type = 'button';
        editBtn.addEventListener('click', () => showEditCustomerModal(customer));
        actionsContainer.appendChild(editBtn);

        // Create Quote button
        const quoteBtn = document.createElement('button');
        quoteBtn.className = 'theme-btn-action theme-btn-success';
        quoteBtn.textContent = 'Quote';
        quoteBtn.type = 'button';
        quoteBtn.addEventListener('click', () => showCreateQuoteModal(customer));
        actionsContainer.appendChild(quoteBtn);

        // View linked bookings button
        if (customer.linkedBookingIds && customer.linkedBookingIds.length > 0) {
            const viewBtn = document.createElement('button');
            viewBtn.className = 'theme-btn-action theme-btn-teal';
            viewBtn.textContent = `Bookings (${customer.linkedBookingIds.length})`;
            viewBtn.type = 'button';
            viewBtn.addEventListener('click', () => showCustomerBookings(customer));
            actionsContainer.appendChild(viewBtn);
        }

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'theme-btn-action theme-btn-danger';
        deleteBtn.textContent = 'Delete';
        deleteBtn.type = 'button';
        deleteBtn.addEventListener('click', () => handleDeleteCustomer(customer));
        actionsContainer.appendChild(deleteBtn);

        actionsCell.appendChild(actionsContainer);
        row.appendChild(actionsCell);

        tbody.appendChild(row);
    });
}

/**
 * Show modal to create a new customer (from a booking).
 * @param {Object} booking - The booking to create customer from.
 */
export async function showCreateCustomerFromBooking(booking) {
    // Check if customer already exists by email
    const existing = await findCustomerByEmail(booking.email);
    if (existing) {
        const result = await confirmDialog({
            title: 'Customer Already Exists',
            message: `A customer record for "${booking.email}" already exists. Do you want to link this booking to the existing customer?`,
            confirmText: 'Link to Existing',
            cancelText: 'Cancel',
        });
        if (result) {
            // Link booking to existing customer
            const { linkBookingToCustomer } = await import('./firestore-customers.js');
            await linkBookingToCustomer(existing.id, booking.id);
            Toast.success(`Booking linked to ${existing.name}.`);

            // Offer to create a quote for this customer
            const createQuote = await confirmDialog({
                title: 'Create Quote?',
                message: `Would you like to create a new quote for ${existing.name}?`,
                confirmText: 'Create Quote',
                cancelText: 'Not Now',
            });
            if (createQuote) {
                const { showCreateQuoteModal } = await import('./quotes.js');
                await showCreateQuoteModal(existing);
            }
        }
        return;
    }

    // Show create customer form in a modal
    // Use a promise to capture form values before modal closes
    const formData = await new Promise((resolve) => {
        const content = document.createElement('div');
        content.innerHTML = `
            <form id="create-customer-form" class="space-y-4">
                <div>
                    <label for="customer-name" class="theme-text mb-1 block text-sm font-medium">Full Name <span class="text-red-500">*</span></label>
                    <input type="text" id="customer-name" value="${sanitiseText(booking.name)}" required class="theme-input w-full rounded-lg px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-purple-400">
                </div>
                <div>
                    <label for="customer-email" class="theme-text mb-1 block text-sm font-medium">Email <span class="text-red-500">*</span></label>
                    <input type="email" id="customer-email" value="${sanitiseText(booking.email)}" required class="theme-input w-full rounded-lg px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-purple-400">
                </div>
                <div>
                    <label for="customer-phone" class="theme-text mb-1 block text-sm font-medium">Phone</label>
                    <input type="tel" id="customer-phone" value="${sanitiseText(booking.phone || '')}" class="theme-input w-full rounded-lg px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-purple-400">
                </div>
                <div>
                    <label for="customer-company" class="theme-text mb-1 block text-sm font-medium">Company <span class="theme-muted text-xs">(optional)</span></label>
                    <input type="text" id="customer-company" class="theme-input w-full rounded-lg px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-purple-400">
                </div>
                <div>
                    <label for="customer-notes" class="theme-text mb-1 block text-sm font-medium">Notes <span class="theme-muted text-xs">(optional)</span></label>
                    <textarea id="customer-notes" rows="3" class="theme-input w-full resize-none rounded-lg px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-purple-400"></textarea>
                </div>
                <div class="flex justify-end gap-2 pt-2">
                    <button type="button" id="create-customer-cancel" class="theme-btn-secondary px-4 py-2 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-gray-400">Cancel</button>
                    <button type="submit" class="theme-button px-4 py-2 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2">Create Customer</button>
                </div>
            </form>
        `;

        const modal = new Modal({
            title: 'Create Customer Record',
            content,
            size: 'md',
            closable: true,
            buttons: [], // No footer buttons — using form buttons instead
        });

        // Handle form submit — capture values before modal closes
        const form = content.querySelector('#create-customer-form');
        const cancelBtn = content.querySelector('#create-customer-cancel');

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('customer-name').value.trim();
            const email = document.getElementById('customer-email').value.trim();
            const phone = document.getElementById('customer-phone').value.trim();
            const company = document.getElementById('customer-company').value.trim();
            const notes = document.getElementById('customer-notes').value.trim();

            if (!name || !email) {
                Toast.error('Name and email are required.');
                return;
            }

            modal.close();
            resolve({ name, email, phone, company, notes });
        });

        cancelBtn.addEventListener('click', () => {
            modal.close();
            resolve(null);
        });

        modal.open();
    });

    if (!formData) return; // User cancelled

    try {
        const customerId = await createCustomer({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            company: formData.company,
            notes: formData.notes,
            linkedBookingId: booking.id,
        });
        Toast.success(`Customer "${formData.name}" created successfully.`);
        // Refresh customers list if on customers tab
        await loadCustomers();

        // Offer to create a quote for the new customer
        const createQuote = await confirmDialog({
            title: 'Create Quote?',
            message: `Would you like to create a new quote for ${formData.name}?`,
            confirmText: 'Create Quote',
            cancelText: 'Not Now',
        });
        if (createQuote) {
            const { showCreateQuoteModal } = await import('./quotes.js');
            await showCreateQuoteModal({ id: customerId, name: formData.name, email: formData.email });
        }
    } catch (err) {
        console.error('Error creating customer:', err);
        Toast.error('Failed to create customer.');
    }
}

/**
 * Show modal to edit an existing customer.
 * @param {Object} customer
 */
async function showEditCustomerModal(customer) {
    const formData = await new Promise((resolve) => {
        const content = document.createElement('div');
        content.innerHTML = `
            <form id="edit-customer-form" class="space-y-4">
                <div>
                    <label for="edit-customer-name" class="theme-text mb-1 block text-sm font-medium">Full Name <span class="text-red-500">*</span></label>
                    <input type="text" id="edit-customer-name" value="${sanitiseText(customer.name)}" required class="theme-input w-full rounded-lg px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-purple-400">
                </div>
                <div>
                    <label for="edit-customer-email" class="theme-text mb-1 block text-sm font-medium">Email</label>
                    <input type="email" id="edit-customer-email" value="${sanitiseText(customer.email || '')}" class="theme-input w-full rounded-lg px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-purple-400">
                </div>
                <div>
                    <label for="edit-customer-phone" class="theme-text mb-1 block text-sm font-medium">Phone</label>
                    <input type="tel" id="edit-customer-phone" value="${sanitiseText(customer.phone || '')}" class="theme-input w-full rounded-lg px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-purple-400">
                </div>
                <div>
                    <label for="edit-customer-company" class="theme-text mb-1 block text-sm font-medium">Company</label>
                    <input type="text" id="edit-customer-company" value="${sanitiseText(customer.company || '')}" class="theme-input w-full rounded-lg px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-purple-400">
                </div>
                <div>
                    <label for="edit-customer-notes" class="theme-text mb-1 block text-sm font-medium">Notes</label>
                    <textarea id="edit-customer-notes" rows="3" class="theme-input w-full resize-none rounded-lg px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-purple-400">${sanitiseText(customer.notes || '')}</textarea>
                </div>
                <div class="flex justify-end gap-2 pt-2">
                    <button type="button" id="edit-customer-cancel" class="theme-btn-secondary px-4 py-2 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-gray-400">Cancel</button>
                    <button type="submit" class="theme-button px-4 py-2 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2">Save Changes</button>
                </div>
            </form>
        `;

        const modal = new Modal({
            title: 'Edit Customer',
            content,
            size: 'md',
            closable: true,
            buttons: [],
        });

        const form = content.querySelector('#edit-customer-form');
        const cancelBtn = content.querySelector('#edit-customer-cancel');

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('edit-customer-name').value.trim();
            const email = document.getElementById('edit-customer-email').value.trim();
            const phone = document.getElementById('edit-customer-phone').value.trim();
            const company = document.getElementById('edit-customer-company').value.trim();
            const notes = document.getElementById('edit-customer-notes').value.trim();

            if (!name) {
                Toast.error('Customer name is required.');
                return;
            }

            modal.close();
            resolve({ name, email, phone, company, notes });
        });

        cancelBtn.addEventListener('click', () => {
            modal.close();
            resolve(null);
        });

        modal.open();
    });

    if (!formData) return; // User cancelled

    try {
        await updateCustomer(customer.id, {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            company: formData.company,
            notes: formData.notes,
        });
        Toast.success('Customer updated successfully.');
        await loadCustomers();
    } catch (err) {
        console.error('Error updating customer:', err);
        Toast.error('Failed to update customer.');
    }
}

/**
 * Handle delete customer with confirmation.
 * @param {Object} customer
 */
async function handleDeleteCustomer(customer) {
    const confirmed = await confirmDialog({
        title: 'Delete Customer',
        message: `Are you sure you want to permanently delete "${customer.name}"? This cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        danger: true,
    });

    if (!confirmed) return;

    try {
        await deleteCustomer(customer.id);
        Toast.success(`Customer "${customer.name}" deleted.`);
        await loadCustomers();
    } catch (err) {
        console.error('Error deleting customer:', err);
        Toast.error('Failed to delete customer.');
    }
}

/**
 * Show modal listing a customer's linked bookings.
 * @param {Object} customer
 */
async function showCustomerBookings(customer) {
    const { getBookingById } = await import('./firestore.js');

    let bookingsHtml = '<div class="space-y-2">';

    if (customer.linkedBookingIds && customer.linkedBookingIds.length > 0) {
        for (const bookingId of customer.linkedBookingIds) {
            try {
                const booking = await getBookingById(bookingId);
                if (booking) {
                    bookingsHtml += `
                        <div class="theme-surface p-3 rounded-lg border border-gray-200">
                            <p class="font-medium">${sanitiseText(booking.name || 'Unknown')}</p>
                            <p class="text-sm theme-muted">${booking.date || ''} at ${booking.time || ''} — ${booking.status || ''}</p>
                        </div>
                    `;
                }
            } catch {
                bookingsHtml += `
                    <div class="theme-surface p-3 rounded-lg border border-gray-200">
                        <p class="text-sm theme-muted">Booking ${bookingId} (unavailable)</p>
                    </div>
                `;
            }
        }
    } else {
        bookingsHtml += '<p class="theme-muted">No linked bookings.</p>';
    }

    bookingsHtml += '</div>';

    const modal = new Modal({
        title: `Bookings — ${customer.name}`,
        content: bookingsHtml,
        size: 'md',
        buttons: [
            { text: 'Close', value: 'close' },
        ],
    });

    await modal.open();
}

/**
 * Wire search input for customers.
 */
export function wireCustomersSearch() {
    const searchInput = document.getElementById('customers-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            renderCustomers(currentCustomers);
        });
    }
}