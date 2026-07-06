/**
 * Firestore Customers Data Abstraction Layer
 * ==========================================
 * All Firestore read/write operations for the 'customers' collection.
 * Uses DocumentReference to link to bookings, quotes, and invoices.
 */

import { Timestamp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { initFirestore } from './firestore.js';
import { log } from './firestore.js';

/** @module firestore-customers */

const COLLECTION = 'customers';

/**
 * Create a new customer document in Firestore.
 * @param {Object} customerData - Customer data from admin action.
 * @param {string} customerData.name - Customer name.
 * @param {string} customerData.email - Customer email.
 * @param {string} customerData.phone - Customer phone.
 * @param {string} [customerData.company] - Optional company name.
 * @param {string} [customerData.notes] - Optional notes.
 * @param {string} [customerData.linkedBookingId] - Original booking ID that created this customer.
 * @returns {Promise<string>} The new document ID.
 */
export async function createCustomer(customerData) {
    const db = initFirestore();
    const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const now = Timestamp.now();

    const docData = {
        name: customerData.name,
        email: customerData.email || '',
        phone: customerData.phone || '',
        company: customerData.company || '',
        notes: customerData.notes || '',
        linkedBookingIds: customerData.linkedBookingId ? [customerData.linkedBookingId] : [],
        totalBookings: customerData.linkedBookingId ? 1 : 0,
        createdAt: now,
        updatedAt: now,
    };

    const docRef = await addDoc(collection(db, COLLECTION), docData);
    log('verbose', `Customer created with ID: ${docRef.id}`);
    return docRef.id;
}

/**
 * Fetch all customers.
 * @param {Object} [options] - Query options.
 * @param {string} [options.sortField='createdAt'] - Field to sort by.
 * @param {string} [options.sortDir='desc'] - Sort direction.
 * @returns {Promise<Array>} Array of customer objects with IDs.
 */
export async function getCustomers(options = {}) {
    const db = initFirestore();
    const { collection, getDocs, query, orderBy } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const { sortField = 'createdAt', sortDir = 'desc' } = options;

    const q = query(collection(db, COLLECTION), orderBy(sortField, sortDir));
    const snapshot = await getDocs(q);

    const customers = [];
    snapshot.forEach((docSnap) => {
        customers.push({ id: docSnap.id, ...docSnap.data() });
    });

    log('verbose', `Fetched ${customers.length} customers`);
    return customers;
}

/**
 * Get a single customer by ID.
 * @param {string} customerId
 * @returns {Promise<Object|null>}
 */
export async function getCustomerById(customerId) {
    const db = initFirestore();
    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

    const docRef = doc(db, COLLECTION, customerId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() };
}

/**
 * Update a customer document.
 * @param {string} customerId
 * @param {Object} data - Fields to update.
 * @returns {Promise<void>}
 */
export async function updateCustomer(customerId, data) {
    const db = initFirestore();
    const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

    const updateData = { ...data, updatedAt: Timestamp.now() };
    // Prevent overwriting timestamps
    delete updateData.createdAt;

    const docRef = doc(db, COLLECTION, customerId);
    await updateDoc(docRef, updateData);
    log('verbose', `Customer ${customerId} updated`);
}

/**
 * Link a booking ID to an existing customer (increment totalBookings).
 * @param {string} customerId
 * @param {string} bookingId
 * @returns {Promise<void>}
 */
export async function linkBookingToCustomer(customerId, bookingId) {
    const db = initFirestore();
    const { doc, updateDoc, arrayUnion } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

    const docRef = doc(db, COLLECTION, customerId);
    await updateDoc(docRef, {
        linkedBookingIds: arrayUnion(bookingId),
        totalBookings: (await getCustomerById(customerId))?.totalBookings + 1 || 1,
        updatedAt: Timestamp.now(),
    });
    log('verbose', `Booking ${bookingId} linked to customer ${customerId}`);
}

/**
 * Delete a customer document permanently.
 * @param {string} customerId
 * @returns {Promise<void>}
 */
export async function deleteCustomer(customerId) {
    const db = initFirestore();
    const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

    const docRef = doc(db, COLLECTION, customerId);
    await deleteDoc(docRef);
    log('verbose', `Customer ${customerId} deleted`);
}

/**
 * Find a customer by email (exact match) — used for deduplication.
 * @param {string} email
 * @returns {Promise<Object|null>}
 */
export async function findCustomerByEmail(email) {
    if (!email) return null;
    const db = initFirestore();
    const { collection, getDocs, query, where } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

    const q = query(collection(db, COLLECTION), where('email', '==', email));
    const snapshot = await getDocs(q);

    let customer = null;
    snapshot.forEach((docSnap) => {
        customer = { id: docSnap.id, ...docSnap.data() };
    });

    return customer;
}