/**
 * Booking System Configuration
 * ============================
 * Edit this file for each client/business.
 * NEVER hardcode secrets here — use environment variables.
 */

/** @module config */

/**
 * Firebase configuration — replace with your own Firebase project values.
 * These are safe to expose to the client (public Firebase config).
 * Set via environment variables or replace the placeholder values below.
 * @type {Object}
 */
export const firebaseConfig = {
    apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || 'YOUR_API_KEY',
    authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || 'YOUR_PROJECT.firebaseapp.com',
    projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || 'YOUR_PROJECT_ID',
    storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || 'YOUR_PROJECT.appspot.com',
    messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || 'YOUR_SENDER_ID',
    appId: import.meta.env?.VITE_FIREBASE_APP_ID || 'YOUR_APP_ID',
};

/**
 * Admin UID — the Firebase Auth UID of the admin account.
 * Only this user can access the admin dashboard.
 * @type {string}
 */
export const ADMIN_UID = 'YOUR_ADMIN_UID';

/**
 * Business branding configuration.
 * Update these values when cloning for a new client.
 * @type {Object}
 */
export const business = {
    name: 'Booking-System',
    tagline: 'Book your appointment online',
    email: 'admin@example.com',
    phone: '+44 1234 567890',
    address: '123 High Street, London, UK',
    openingHours: {
        monday: { open: '09:00', close: '17:00' },
        tuesday: { open: '09:00', close: '17:00' },
        wednesday: { open: '09:00', close: '17:00' },
        thursday: { open: '09:00', close: '17:00' },
        friday: { open: '09:00', close: '17:00' },
        saturday: { open: null, close: null },
        sunday: { open: null, close: null },
    },
    /** Duration of each booking slot in minutes */
    slotDurationMinutes: 60,
    /** Maximum number of days in advance a booking can be made */
    maxAdvanceBookingDays: 60,
};

/**
 * Data retention period in days (GDPR).
 * After this period, bookings should be flagged for deletion.
 * @type {number}
 */
export const RETENTION_PERIOD_DAYS = 365;

/**
 * Maximum lengths for input fields.
 * @type {Object}
 */
export const MAX_LENGTHS = {
    name: 100,
    email: 254,
    phone: 20,
    notes: 500,
};

/**
 * Email configuration for notifications.
 * Uses EmailJS free tier.
 * @type {Object}
 */
export const emailConfig = {
    serviceId: 'YOUR_EMAILJS_SERVICE_ID',
    templateId: 'YOUR_EMAILJS_TEMPLATE_ID',
    publicKey: 'YOUR_EMAILJS_PUBLIC_KEY',
};

/**
 * Logging level.
 * 'verbose' for development, 'minimal' for production.
 * @type {string}
 */
export const LOG_LEVEL = 'verbose'; // Change to 'minimal' in production