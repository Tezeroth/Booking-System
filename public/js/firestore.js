/**
 * Firestore Data Abstraction Layer
 * ================================
 * All Firestore read/write operations go through this module.
 * This keeps Firestore logic in one place and makes it easy to swap databases later.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    getDoc,
    doc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    where,
    Timestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { firebaseConfig, RETENTION_PERIOD_DAYS, LOG_LEVEL } from './config.js';

/** @module firestore */

/** @type {import('firebase/firestore').Firestore} */
let db = null;

/**
 * Initialise Firestore connection.
 * Must be called once before any other firestore functions.
 * @returns {import('firebase/firestore').Firestore}
 */
export function initFirestore() {
    if (db) return db;
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    return db;
}

/**
 * Create a new booking document in Firestore.
 * @param {Object} bookingData - Sanitised booking data from validation.
 * @returns {Promise<string>} The new document ID.
 * @throws {Error} If Firestore write fails.
 */
export async function createBooking(bookingData) {
    const database = initFirestore();
    const now = Timestamp.now();

    const docData = {
        name: bookingData.name,
        email: bookingData.email,
        phone: bookingData.phone,
        date: bookingData.date,
        time: bookingData.time,
        notes: bookingData.notes || '',
        consentGiven: bookingData.consentGiven,
        consentTimestamp: now,
        retentionExpiry: new Date(
            Date.now() + RETENTION_PERIOD_DAYS * 24 * 60 * 60 * 1000
        ),
        status: 'pending',
        createdAt: now,
    };

    const docRef = await addDoc(collection(database, 'bookings'), docData);
    return docRef.id;
}

/**
 * Fetch all bookings for the admin dashboard.
 * @param {Object} options - Query options.
 * @param {string} [options.statusFilter] - Filter by status ('pending', 'confirmed', etc.).
 * @param {string} [options.searchTerm] - Search term for name/email/phone.
 * @param {string} [options.sortField='createdAt'] - Field to sort by.
 * @param {string} [options.sortDir='desc'] - Sort direction.
 * @returns {Promise<Array>} Array of booking objects with IDs.
 */
export async function getBookings(options = {}) {
    const database = initFirestore();
    const {
        statusFilter = null,
        searchTerm = null,
        sortField = 'createdAt',
        sortDir = 'desc',
    } = options;

    let constraints = [orderBy(sortField, sortDir)];

    if (statusFilter && statusFilter !== 'all') {
        constraints.unshift(where('status', '==', statusFilter));
    }

    const q = query(collection(database, 'bookings'), ...constraints);
    const snapshot = await getDocs(q);

    let bookings = [];
    snapshot.forEach((docSnap) => {
        bookings.push({
            id: docSnap.id,
            ...docSnap.data(),
        });
    });

    // Client-side search filter (since Firebase doesn't support full-text search)
    if (searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        bookings = bookings.filter((b) => {
            return (
                (b.name && b.name.toLowerCase().includes(term)) ||
                (b.email && b.email.toLowerCase().includes(term)) ||
                (b.phone && b.phone.toLowerCase().includes(term))
            );
        });
    }

    return bookings;
}

/**
 * Get a single booking by ID.
 * @param {string} bookingId
 * @returns {Promise<Object|null>} Booking data or null if not found.
 */
export async function getBookingById(bookingId) {
    const database = initFirestore();
    const docRef = doc(database, 'bookings', bookingId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    return { id: docSnap.id, ...docSnap.data() };
}

/**
 * Update a booking's status.
 * @param {string} bookingId
 * @param {string} status - New status ('pending', 'confirmed', 'completed', 'archived').
 * @returns {Promise<void>}
 */
export async function updateBookingStatus(bookingId, status) {
    const database = initFirestore();
    const docRef = doc(database, 'bookings', bookingId);
    await updateDoc(docRef, { status });
}

/**
 * Delete a booking document permanently.
 * @param {string} bookingId
 * @returns {Promise<void>}
 */
export async function deleteBooking(bookingId) {
    const database = initFirestore();
    const docRef = doc(database, 'bookings', bookingId);
    await deleteDoc(docRef);
}

/**
 * Get bookings that have passed their retention expiry.
 * Used for GDPR compliance to identify records due for deletion.
 * @returns {Promise<Array>} Array of expired booking objects.
 */
export async function getExpiredBookings() {
    const database = initFirestore();
    const now = Timestamp.now();

    const q = query(
        collection(database, 'bookings'),
        where('retentionExpiry', '<', now)
    );
    const snapshot = await getDocs(q);

    let expired = [];
    snapshot.forEach((docSnap) => {
        expired.push({ id: docSnap.id, ...docSnap.data() });
    });

    return expired;
}

/**
 * Log helper that respects log level.
 * @param {string} level
 * @param {string} message
 * @param {*} [data]
 */
export function log(level, message, data) {
    if (LOG_LEVEL === 'minimal' && level === 'verbose') return;

    const prefix = `[Firestore] ${level.toUpperCase()}:`;
    if (data) {
        console.log(prefix, message, data);
    } else {
        console.log(prefix, message);
    }
}
