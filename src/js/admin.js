/**
 * Admin Dashboard Module
 * ======================
 * Full CRUD for bookings: list, search, filter, sort, update status, delete.
 * Requires authentication — see auth.js.
 */

import { requireAuth, logout as authLogout, onAuthChange, isAdmin } from './auth.js';
import { getBookings, updateBookingStatus, deleteBooking, getExpiredBookings } from './firestore.js';
import { showAlert, showLoading, hideLoading, formatDate, formatTime, setTextContent, createElement } from './ui.js';
import { sanitiseText } from './validation.js';
import { business, ADMIN_UID } from './config.js';

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

/**
 * Initialise the admin dashboard.
 */
export function initAdmin() {
    // Listen for auth state
    onAuthChange((user) => {
        currentUser = user;
        if (user && isAdmin(user)) {
            showDashboard();
            loadBookings();
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
        cell.setAttribute('colspan', '7');
        cell.className = 'text-center py-8 text-gray-500';
        cell.textContent = term ? 'No bookings match your search.' : 'No bookings found.';
        row.appendChild(cell);
        tbody.appendChild(row);
        return;
    }

    filtered.forEach((booking) => {
        const row = document.createElement('tr');
        row.className = 'border-b border-gray-200 hover:bg-gray-50';

        // Status badge colour
        const statusColors = {
            pending: 'bg-yellow-100 text-yellow-800',
            confirmed: 'bg-blue-100 text-blue-800',
            completed: 'bg-green-100 text-green-800',
            archived: 'bg-gray-100 text-gray-600',
        };
        const statusColor = statusColors[booking.status] || 'bg-gray-100 text-gray-600';

        const cells = [
            sanitiseText(booking.name || ''),
            sanitiseText(booking.email || ''),
            sanitiseText(booking.phone || ''),
            booking.date || '',
            formatTime(booking.time),
            `<span class="px-2 py-1 rounded-full text-xs font-medium ${statusColor}">${sanitiseText(booking.status || '')}</span>`,
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
        const viewBtn = createButton('View', 'bg-blue-500 hover:bg-blue-600', () => showBookingDetails(booking));
        actionsContainer.appendChild(viewBtn);

        // Status buttons
        if (booking.status === 'pending') {
            const confirmBtn = createButton('Confirm', 'bg-green-500 hover:bg-green-600', () => updateStatus(booking.id, 'confirmed'));
            actionsContainer.appendChild(confirmBtn);
        }
        if (booking.status === 'confirmed') {
            const completeBtn = createButton('Complete', 'bg-teal-500 hover:bg-teal-600', () => updateStatus(booking.id, 'completed'));
            actionsContainer.appendChild(completeBtn);
        }
        if (booking.status !== 'archived') {
            const archiveBtn = createButton('Archive', 'bg-gray-500 hover:bg-gray-600', () => updateStatus(booking.id, 'archived'));
            actionsContainer.appendChild(archiveBtn);
        }

        // Delete button
        const deleteBtn = createButton('Delete', 'bg-red-500 hover:bg-red-600', () => confirmDelete(booking.id, booking.name));
        actionsContainer.appendChild(deleteBtn);

        actionsCell.appendChild(actionsContainer);
        row.appendChild(actionsCell);

        tbody.appendChild(row);
    });
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
    btn.className = `px-2 py-1 rounded text-xs text-white font-medium ${colorClasses} focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400`;
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
function confirmDelete(id, name) {
    const sanitisedName = sanitiseText(name || 'this booking');
    if (!confirm(`Are you sure you want to permanently delete ${sanitisedName}'s booking? This cannot be undone.`)) {
        return;
    }

    showLoading(LOADING_ID);
    deleteBooking(id)
        .then(() => {
            showAlert('Booking deleted permanently.', 'success');
            return loadBookings();
        })
        .catch((err) => {
            console.error('Delete error:', err);
            showAlert('Failed to delete booking.', 'error');
        })
        .finally(() => {
            hideLoading(LOADING_ID);
        });
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