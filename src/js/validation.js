/**
 * Input Validation & Sanitisation Module
 * ======================================
 * All user input must pass through this module.
 * Never trust client-side validation alone — this runs client-side AND
 * the Firestore security rules act as the server-side enforcement layer.
 */

import { MAX_LENGTHS } from './config.js';

/** @module validation */

/**
 * Validates a complete booking form submission.
 * @param {Object} data - The booking form data.
 * @param {string} data.name - Customer name.
 * @param {string} data.email - Customer email.
 * @param {string} data.phone - Customer phone number.
 * @param {string} data.date - Preferred date (YYYY-MM-DD).
 * @param {string} data.time - Preferred time (HH:mm).
 * @param {string} data.notes - Optional notes.
 * @param {boolean} data.consentGiven - GDPR consent checkbox.
 * @returns {{ isValid: boolean, errors: Object<string, string> }}
 */
export function validateBooking(data) {
    const errors = {};

    // Normalise whitespace
    const name = safeTrim(data.name);
    const email = safeTrim(data.email);
    const phone = safeTrim(data.phone);
    const date = safeTrim(data.date);
    const time = safeTrim(data.time);
    const notes = safeTrim(data.notes || '');

    // Name validation
    if (!name) {
        errors.name = 'Name is required.';
    } else if (name.length > MAX_LENGTHS.name) {
        errors.name = `Name must be ${MAX_LENGTHS.name} characters or fewer.`;
    } else if (/<[^>]*>/g.test(name)) {
        errors.name = 'Name contains invalid characters.';
    }

    // Email validation
    if (!email) {
        errors.email = 'Email is required.';
    } else if (email.length > MAX_LENGTHS.email) {
        errors.email = `Email must be ${MAX_LENGTHS.email} characters or fewer.`;
    } else if (!isValidEmail(email)) {
        errors.email = 'Please enter a valid email address.';
    }

    // Phone validation
    if (!phone) {
        errors.phone = 'Phone number is required.';
    } else if (phone.length > MAX_LENGTHS.phone) {
        errors.phone = `Phone must be ${MAX_LENGTHS.phone} characters or fewer.`;
    } else if (!isValidPhone(phone)) {
        errors.phone = 'Please enter a valid phone number (e.g. +44 1234 567890).';
    }

    // Date validation
    if (!date) {
        errors.date = 'Please select a preferred date.';
    } else if (!isValidDate(date)) {
        errors.date = 'Please select a valid date (today or in the future).';
    }

    // Time validation
    if (!time) {
        errors.time = 'Please select a preferred time.';
    } else if (!isValidTimeFormat(time)) {
        errors.time = 'Please select a valid time.';
    }

    // Notes validation
    if (notes && notes.length > MAX_LENGTHS.notes) {
        errors.notes = `Notes must be ${MAX_LENGTHS.notes} characters or fewer.`;
    }
    if (notes && /<[^>]*>/g.test(notes)) {
        errors.notes = 'Notes contain invalid characters.';
    }

    // Consent validation
    if (!data.consentGiven) {
        errors.consentGiven = 'You must consent to your data being stored.';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
        sanitized: {
            name: sanitiseText(name),
            email: sanitiseText(email),
            phone: sanitiseText(phone),
            date,
            time,
            notes: sanitiseText(notes),
            consentGiven: data.consentGiven,
            consentTimestamp: data.consentTimestamp || new Date().toISOString(),
        },
    };
}

/**
 * Validate admin login form.
 * @param {string} email
 * @param {string} password
 * @returns {{ isValid: boolean, errors: Object<string, string> }}
 */
export function validateLogin(email, password) {
    const errors = {};
    const cleanEmail = safeTrim(email);
    const cleanPassword = safeTrim(password);

    if (!cleanEmail) {
        errors.email = 'Email is required.';
    } else if (!isValidEmail(cleanEmail)) {
        errors.email = 'Please enter a valid email.';
    }

    if (!cleanPassword) {
        errors.password = 'Password is required.';
    } else if (cleanPassword.length < 6) {
        errors.password = 'Password must be at least 6 characters.';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
}

/**
 * Trims whitespace and returns empty string for null/undefined.
 * @param {string} str
 * @returns {string}
 */
export function safeTrim(str) {
    if (typeof str !== 'string') return '';
    return str.trim();
}

/**
 * Remove HTML tags and dangerous characters for safe text display.
 * ALWAYS use this before displaying user data.
 * @param {string} str
 * @returns {string}
 */
export function sanitiseText(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
        .replace(/'/g, '&#039;');
}

/**
 * Validate email format.
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= MAX_LENGTHS.email;
}

/**
 * Validate phone number format (allows international formats).
 * @param {string} phone
 * @returns {boolean}
 */
function isValidPhone(phone) {
    // Allows: +44 1234 567890, 01234 567890, +1 (555) 123-4567
    const phoneRegex = /^[\+\d\s\-\(\)\.]{7,20}$/;
    return phoneRegex.test(phone);
}

/**
 * Validate date is today or in the future.
 * @param {string} dateStr - YYYY-MM-DD format
 * @returns {boolean}
 */
function isValidDate(dateStr) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;

    const selected = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return selected >= today;
}

/**
 * Validate time format (HH:mm).
 * @param {string} timeStr
 * @returns {boolean}
 */
function isValidTimeFormat(timeStr) {
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(timeStr);
}