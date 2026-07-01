/**
 * Booking Form Module
 * ===================
 * Handles the public booking form: initialises, validates, and submits.
 */

import { validateBooking } from './validation.js';
import { createBooking, initFirestore } from './firestore.js';
import { showError, clearErrors, showLoading, hideLoading, showAlert, generateTimeSlots } from './ui.js';
import { business } from './config.js';

/** @module booking */

const FORM_ID = 'booking-form';
const LOADING_ID = 'booking-loading';

/**
 * Initialise the booking form on page load.
 */
export function initBookingForm() {
    const form = document.getElementById(FORM_ID);
    if (!form) return;

    // Initialise Firestore
    try {
        initFirestore();
    } catch (err) {
        console.error('Firestore init error:', err);
    }

    // Set min date to today
    const dateInput = document.getElementById('booking-date');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.setAttribute('min', today);
        dateInput.addEventListener('change', handleDateChange);
    }

    // Set up submit handler
    form.addEventListener('submit', handleSubmit);
}

/**
 * Handle date change — populate available time slots.
 * @param {Event} event
 */
function handleDateChange(event) {
    const dateStr = event.target.value;
    const timeSelect = document.getElementById('booking-time');
    if (!timeSelect) return;

    // Clear existing options
    timeSelect.innerHTML = '<option value="">Select a time</option>';

    if (!dateStr) return;

    // Get day of week
    const date = new Date(dateStr + 'T00:00:00');
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = days[date.getDay()];

    const slots = generateTimeSlots(business.openingHours, dayOfWeek);

    if (slots.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No available slots on this day';
        option.disabled = true;
        timeSelect.appendChild(option);
        return;
    }

    slots.forEach((slot) => {
        const option = document.createElement('option');
        option.value = slot;
        // Display as 12-hour format
        const [h, m] = slot.split(':');
        const hour = parseInt(h, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        option.textContent = `${hour12}:${m} ${ampm}`;
        timeSelect.appendChild(option);
    });
}

/**
 * Handle form submission.
 * @param {Event} event
 */
async function handleSubmit(event) {
    event.preventDefault();
    clearErrors(FORM_ID);

    const form = event.target;
    const formData = new FormData(form);

    const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        date: formData.get('date'),
        time: formData.get('time'),
        notes: formData.get('notes'),
        consentGiven: formData.get('consent') === 'on',
    };

    // Validate
    const result = validateBooking(data);

    if (!result.isValid) {
        // Show errors
        Object.entries(result.errors).forEach(([field, message]) => {
            showError(`error-${field}`, message);
        });
        // Focus first error field
        const firstErrorField = Object.keys(result.errors)[0];
        const firstInput = document.getElementById(`booking-${firstErrorField}`);
        if (firstInput) firstInput.focus();
        return;
    }

    // Submit
    showLoading(LOADING_ID);

    try {
        const bookingId = await createBooking(result.sanitized);
        console.log('Booking created with ID:', bookingId);
        showAlert('Booking submitted successfully! We will contact you shortly.', 'success');
        form.reset();
        // Reset time select
        const timeSelect = document.getElementById('booking-time');
        if (timeSelect) {
            timeSelect.innerHTML = '<option value="">Select a time</option>';
        }
    } catch (err) {
        console.error('Booking submission error:', err);
        if (err.code === 'permission-denied') {
            showAlert('Unable to submit booking. Please try again later.', 'error');
        } else if (err.code === 'unavailable') {
            showAlert('Service temporarily unavailable. Please try again.', 'error');
        } else {
            showAlert('Something went wrong. Please try again.', 'error');
        }
    } finally {
        hideLoading(LOADING_ID);
    }
}