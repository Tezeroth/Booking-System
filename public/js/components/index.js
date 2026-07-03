/**
 * Components Barrel Export
 * ========================
 * Central export point for all reusable UI components.
 * Import from here instead of individual component files.
 *
 * Usage:
 *   import { Modal, Toast, DataTable, confirmDialog, renderBadge, LoadingSpinner, formatCurrency } from './components/index.js';
 */

/** @module components */

export { Modal } from './modal.js';
export { confirmDialog } from './confirm-dialog.js';
export { Toast } from './toast.js';
export { DataTable } from './table.js';
export { renderBadge, createBadgeElement, getStatusClass } from './status-badge.js';
export { LoadingSpinner } from './loading-spinner.js';
export { formatCurrency, parseCurrency, calculateVAT, calculateGross } from './currency-formatter.js';