/**
 * Admin Dashboard Module
 * ======================
 * Full CRUD for bookings: list, search, filter, sort, update status, delete.
 * Tab navigation: Bookings | Customers
 * Requires authentication — see auth.js.
 */

import { requireAuth, logout as authLogout, onAuthChange, isAdmin } from './auth.js';
import { getBookings, updateBookingStatus, deleteBooking, getExpiredBookings } from './firestore.js';
import { showAlert, showLoading, hideLoading, formatDate, formatTime, setTextContent, createElement } from './ui.js';
import { sanitiseText } from './validation.js';
import { business, ADMIN_UID } from './config.js';
import { initCustomersTab, showCreateCustomerFromBooking, wireCustomersSearch } from './customers.js';
import { initQuotesTab, showCreateQuoteModal, wireQuotesSearch } from './quotes.js';
import { Toast } from './components/toast.js';
import { confirmDialog } from './components/confirm-dialog.js';

/** @module admin */

const BOOKINGS_TABLE_ID = 'bookings-table-body';
const LOADING_ID = 'admin-loading';
const SEARCH_INPUT_ID = 'admin-search';
const STATUS_FILTER_ID = 'admin-status-filter';
const CONTENT_ID = 'admin-content';
const LOGIN_ID = 'admin-login';
const LOGOUT_BTN_ID = 'admin-logout';
const DASHBOARD_NAV_ID = 'dashboard-nav';

let currentBookings = [];
let currentUser = null;
let currentTab = 'bookings';

/**
 * Initialise the admin dashboard.
 */
export function initAdmin() {
    // Listen for auth state
    onAuthChange((user) => {
        currentUser = user;
        if (user && isAdmin(user)) {
            showDashboard();
            switchTab('bookings');
        } else {
            showLoginForm();
        }
    });

    // Login form handler
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Logout button
    const logoutBtn = document.getElementById(LOGOUT_BTN_ID);
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Tab navigation
    const bookingsTab = document.getElementById('tab-bookings');
    const customersTab = document.getElementById('tab-customers');
    const quotesTab = document.getElementById('tab-quotes');
    if (bookingsTab) {
        bookingsTab.addEventListener('click', () => switchTab('bookings'));
    }
    if (customersTab) {
        customersTab.addEventListener('click', () => switchTab('customers'));
    }
    if (quotesTab) {
        quotesTab.addEventListener('click', () => switchTab('quotes'));
    }

    // Search input
    const searchInput = document.getElementById(SEARCH_INPUT_ID);
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => renderBookings(currentBookings), 300));
    }

    // Status filter
    const statusFilter = document.getElementById(STATUS_FILTER_ID);
    if (statusFilter) {
        statusFilter.addEventListener('change', () => loadBookings());
    }

    // Forgot password link
    const forgotLink = document.getElementById('forgot-password');
    if (forgotLink) {
        forgotLink.addEventListener('click', handleForgotPassword);
    }

    // Admin UID display
    const adminUidEl = document.getElementById('admin-uid-display');
    if (adminUidEl) {
        adminUidEl.textContent = `Admin UID: ${ADMIN_UID}`;
    }

    // Wire customers search
    wireCustomersSearch();

    // Wire quotes search and filter
    wireQuotesSearch();
}

/**
 * Switch between admin tabs.
 * @param {'bookings'|'customers'|'quotes'} tab
 */
function switchTab(tab) {
    currentTab = tab;

    // Update tab button styles
    const bookingsTab = document.getElementById('tab-bookings');
    const customersTab = document.getElementById('tab-customers');
    const quotesTab = document.getElementById('tab-quotes');
    const bookingsSection = document.getElementById('bookings-section');
    const customersSection = document.getElementById('customers-section');
    const quotesSection = document.getElementById('quotes-section');

    // Reset all tabs
    [bookingsTab, customersTab, quotesTab].forEach((btn) => {
        if (btn) {
            btn.classList.remove('bg-purple-600', 'text-white');
            btn.classList.add('theme-btn-secondary');
        }
    });

    // Hide all sections
    if (bookingsSection) bookingsSection.classList.add('hidden');
    if (customersSection) customersSection.classList.add('hidden');
    if (quotesSection) quotesSection.classList.add('hidden');

    // Show selected tab
    if (tab === 'bookings' && bookingsTab && bookingsSection) {
        bookingsTab.classList.remove('theme-btn-secondary');
        bookingsTab.classList.add('bg-purple-600', 'text-white');
        bookingsSection.classList.remove('hidden');
        loadBookings();
    } else if (tab === 'customers' && customersTab && customersSection) {
        customersTab.classList.remove('theme-btn-secondary');
        customersTab.classList.add('bg-purple-600', 'text-white');
        customersSection.classList.remove('hidden');
        initCustomersTab();
    } else if (tab === 'quotes' && quotesTab && quotesSection) {
        quotesTab.classList.remove('theme-btn-secondary');
        quotesTab.classList.add('bg-purple-600', 'text-white');
        quotesSection.classList.remove('hidden');
        initQuotesTab();
    }
}

/**
 * Show the dashboard content and hide login.
 */
function showDashboard() {
    const loginEl = document.getElementById(LOGIN_ID);
    const contentEl = document.getElementById(CONTENT_ID);
    const navEl = document.getElementById(DASHBOARD_NAV_ID);
    if (loginEl) loginEl.classList.add('hidden');
    if (contentEl) contentEl.classList.remove('hidden');
    if (navEl) navEl.classList.remove('hidden');
}

/**
 * Show the login form and hide dashboard.
 */
function showLoginForm() {
    const loginEl = document.getElementById(LOGIN_ID);
    const contentEl = document.getElementById(CONTENT_ID);
    const navEl = document.getElementById(DASHBOARD_NAV_ID);
    if (loginEl) loginEl.classList.remove('hidden');
    if (contentEl) contentEl.classList.add('hidden');
    if (navEl) navEl.classList.add('hidden');
}

/**
 * Handle login form submission.
 * @param {Event} event
 */
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    if (!email || !password) {
        errorEl.textContent = 'Please enter email and password.';
        errorEl.classList.remove('hidden');
        return;
    }

    showLoading(LOADING_ID);
    errorEl.classList.add('hidden');

    try {
        const { login } = await import('./auth.js');
        await login(email, password);
        // onAuthChange will handle the rest
    } catch (err) {
        console.error('Login error:', err);
        let message = 'Login failed. Please try again.';
        if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
            message = 'Invalid email or password.';
        } else if (err.code === 'auth/too-many-requests') {
            message = 'Too many attempts. Please try again later.';
        } else if (err.code === 'auth/invalid-email') {
            message = 'Please enter a valid email address.';
        }
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
    } finally {
        hideLoading(LOADING_ID);
    }
}

/**
 * Handle logout.
 */
async function handleLogout() {
    try {
        await authLogout();
        showLoginForm();
    } catch (err) {
        console.error('Logout error:', err);
    }
}

/**
 * Handle forgot password.
 */
async function handleForgotPassword() {
    const emailInput = document.getElementById('login-email');
    const email = emailInput ? emailInput.value.trim() : '';

    if (!email) {
        const errorEl = document.getElementById('login-error');
        errorEl.textContent = 'Please enter your email address first.';
        errorEl.classList.remove('hidden');
        return;
    }

    try {
        const { resetPassword } = await import('./auth.js');
        await resetPassword(email);
        showAlert('Password reset email sent. Check your inbox.', 'info');
    } catch (err) {
        console.error('Password reset error:', err);
        const errorEl = document.getElementById('login-error');
        errorEl.textContent = 'Could not send reset email. Please try again.';
        errorEl.classList.remove('hidden');
    }
}

/**
 * Load bookings from Firestore with current filters.
 */
async function loadBookings() {
    showLoading(LOADING_ID);

    try {
        const statusFilter = document.getElementById(STATUS_FILTER_ID);
        const filterValue = statusFilter ? statusFilter.value : 'all';

        currentBookings = await getBookings({
            statusFilter: filterValue,
        });

        renderBookings(currentBookings);
    } catch (err) {
        console.error('Error loading bookings:', err);
        showAlert('Failed to load bookings. Please try again.', 'error');
    } finally {
        hideLoading(LOADING_ID);
    }
}

/**
 * Render bookings table with current data.
 * @param {Array} bookings
 */
function renderBookings(bookings) {
    const tbody = document.getElementById(BOOKINGS_TABLE_ID);
    if (!tbody) return;

    const searchTerm = document.getElementById(SEARCH_INPUT_ID);
    const term = searchTerm ? searchTerm.value.toLowerCase().trim() : '';

    // Client-side search
    let filtered = bookings;
    if (term) {
        filtered = bookings.filter((b) => {
            return (
                (b.name && b.name.toLowerCase().includes(term)) ||
                (b.email && b.email.toLowerCase().includes(term)) ||
                (b.phone && b.phone.toLowerCase().includes(term))
            );
        });
    }

    // Update count
    const countEl = document.getElementById('booking-count');
    if (countEl) {
        countEl.textContent = `${filtered.length} booking${filtered.length !== 1 ? 's' : ''}`;
    }

    // Clear table
    tbody.innerHTML = '';

    if (filtered.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.setAttribute('colspan', '8');
        cell.className = 'text-center py-8 theme-muted';
        cell.textContent = term ? 'No bookings match your search.' : 'No bookings found.';
        row.appendChild(cell);
        tbody.appendChild(row);
        return;
    }

    filtered.forEach((booking) => {
        const row = document.createElement('tr');
        row.className = 'theme-row-hover';

        // Status badge colour
        const statusColors = {
            pending: 'theme-badge-pending',
            confirmed: 'theme-badge-confirmed',
            completed: 'theme-badge-completed',
            archived: 'theme-badge-archived',
        };
        const statusColor = statusColors[booking.status] || 'theme-badge-archived';

        const cells = [
            sanitiseText(booking.name || ''),
            sanitiseText(booking.email || ''),
            sanitiseText(booking.phone || ''),
            booking.date || '',
            formatTime(booking.time),
            `<span class="theme-badge ${statusColor}">${sanitiseText(booking.status || '')}</span>`,
            formatDate(booking.createdAt),
        ];

        cells.forEach((cellContent, index) => {
            const cell = document.createElement('td');
            cell.className = 'px-4 py-3 text-sm';
            if (index === 5) {
                // Status column — use innerHTML for the badge
                cell.innerHTML = cellContent;
            } else {
                // All other columns — use textContent for XSS protection
                cell.textContent = cellContent;
            }
            row.appendChild(cell);
        });

        // Actions column
        const actionsCell = document.createElement('td');
        actionsCell.className = 'px-4 py-3 text-sm';

        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'flex gap-2';

        // View button
        const viewBtn = createButton('View', 'theme-btn-primary', () => showBookingDetails(booking));
        actionsContainer.appendChild(viewBtn);

        // Status buttons
        if (booking.status === 'pending') {
            const confirmBtn = createButton('Confirm', 'theme-btn-success', () => updateStatus(booking.id, 'confirmed'));
            actionsContainer.appendChild(confirmBtn);
        }
        if (booking.status === 'confirmed') {
            const completeBtn = createButton('Complete', 'theme-btn-teal', () => updateStatus(booking.id, 'completed'));
            actionsContainer.appendChild(completeBtn);
        }
        if (booking.status !== 'archived') {
            const archiveBtn = createButton('Archive', 'theme-btn-gray', () => updateStatus(booking.id, 'archived'));
            actionsContainer.appendChild(archiveBtn);
        }

        // Add button — creates a customer record from booking
        if (booking.status === 'pending' || booking.status === 'confirmed') {
            const acceptBtn = createButton('Add', 'theme-btn-success', () => handleAcceptBooking(booking));
            actionsContainer.appendChild(acceptBtn);
        }

        // Quote button — creates customer if needed, then opens quote modal
        if (booking.status === 'pending' || booking.status === 'confirmed') {
            const quoteBtn = createButton('Quote', 'theme-btn-teal', () => handleBookingToQuote(booking));
            actionsContainer.appendChild(quoteBtn);
        }

        // Delete button
        const deleteBtn = createButton('Delete', 'theme-btn-danger', () => confirmDelete(booking.id, booking.name));
        actionsContainer.appendChild(deleteBtn);

        actionsCell.appendChild(actionsContainer);
        row.appendChild(actionsCell);

        tbody.appendChild(row);
    });
}

/**
 * Handle Accept booking — creates a customer record.
 * @param {Object} booking
 */
async function handleAcceptBooking(booking) {
    await showCreateCustomerFromBooking(booking);
    // Refresh bookings to reflect any status changes
    await loadBookings();
}

/**
 * Handle booking-to-quote flow — auto-creates customer if needed, then opens quote modal.
 * @param {Object} booking
 */
async function handleBookingToQuote(booking) {
    const { findCustomerByEmail, createCustomer } = await import('./firestore-customers.js');
    const { showCreateQuoteModal } = await import('./quotes.js');

    showLoading(LOADING_ID);
    try {
        // Check if customer already exists by email
        let customer = await findCustomerByEmail(booking.email);

        if (!customer) {
            // Auto-create customer from booking data
            const customerId = await createCustomer({
                name: booking.name,
                email: booking.email,
                phone: booking.phone || '',
                notes: '',
                linkedBookingId: booking.id,
            });
            Toast.success(`Customer "${booking.name}" created automatically.`);
            customer = { id: customerId, name: booking.name, email: booking.email };
        }

        hideLoading(LOADING_ID);

        // Open quote modal with the customer data
        await showCreateQuoteModal({ id: customer.id, name: customer.name, email: customer.email });

        // Refresh bookings
        await loadBookings();
    } catch (err) {
        console.error('Error in booking-to-quote flow:', err);
        hideLoading(LOADING_ID);
        Toast.error('Failed to create quote from booking.');
    }
}

/**
 * Create a styled action button.
 * @param {string} text
 * @param {string} colorClasses
 * @param {function} onClick
 * @returns {HTMLElement}
 */
function createButton(text, colorClasses, onClick) {
    const btn = document.createElement('button');
    btn.className = `theme-btn-action ${colorClasses}`;
    btn.textContent = text;
    btn.setAttribute('type', 'button');
    btn.addEventListener('click', onClick);
    return btn;
}

/**
 * Update booking status.
 * @param {string} id
 * @param {string} status
 */
async function updateStatus(id, status) {
    showLoading(LOADING_ID);
    try {
        await updateBookingStatus(id, status);
        showAlert(`Booking marked as ${status}.`, 'success');
        await loadBookings();
    } catch (err) {
        console.error('Status update error:', err);
        showAlert('Failed to update booking status.', 'error');
    } finally {
        hideLoading(LOADING_ID);
    }
}

/**
 * Confirm and delete a booking.
 * @param {string} id
 * @param {string} name
 */
async function confirmDelete(id, name) {
    const confirmed = await confirmDialog({
        title: 'Delete Booking',
        message: `Are you sure you want to permanently delete ${sanitiseText(name || 'this booking')}'s booking? This cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        danger: true,
    });

    if (!confirmed) return;

    showLoading(LOADING_ID);
    try {
        await deleteBooking(id);
        showAlert('Booking deleted permanently.', 'success');
        await loadBookings();
    } catch (err) {
        console.error('Delete error:', err);
        showAlert('Failed to delete booking.', 'error');
    } finally {
        hideLoading(LOADING_ID);
    }
}

/**
 * Show booking details modal.
 * @param {Object} booking
 */
function showBookingDetails(booking) {
    const modal = document.getElementById('booking-modal');
    const overlay = document.getElementById('modal-overlay');
    if (!modal || !overlay) return;

    // Populate modal with safe textContent
    const fields = [
        { id: 'modal-name', value: booking.name },
        { id: 'modal-email', value: booking.email },
        { id: 'modal-phone', value: booking.phone },
        { id: 'modal-date', value: booking.date },
        { id: 'modal-time', value: formatTime(booking.time) },
        { id: 'modal-notes', value: booking.notes || 'No notes provided' },
        { id: 'modal-status', value: booking.status },
        { id: 'modal-created', value: formatDate(booking.createdAt) },
        { id: 'modal-consent', value: booking.consentGiven ? 'Yes' : 'No' },
        { id: 'modal-retention', value: formatDate(booking.retentionExpiry) },
    ];

    fields.forEach(({ id, value }) => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = sanitiseText(value || 'N/A');
        }
    });

    modal.classList.remove('hidden');
    overlay.classList.remove('hidden');

    // Close buttons
    const closeButtons = modal.querySelectorAll('[data-close-modal]');
    closeButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            modal.classList.add('hidden');
            overlay.classList.add('hidden');
        });
    });

    // Close on overlay click
    overlay.addEventListener('click', () => {
        modal.classList.add('hidden');
        overlay.classList.add('hidden');
    });
}

/**
 * Debounce utility for search input.
 * @param {function} fn
 * @param {number} delay
 * @returns {function}
 */
function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}