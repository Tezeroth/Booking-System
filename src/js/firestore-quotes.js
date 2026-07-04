/**
 * Firestore Quotes Data Abstraction Layer
 * ========================================
 * All Firestore read/write operations for the 'quotes' collection.
 * Each quote is linked to a customer via customerId.
 */

import { Timestamp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { initFirestore, log } from './firestore.js';
import { calculateVAT, calculateGross } from './components/currency-formatter.js';

/** @module firestore-quotes */

const COLLECTION = 'quotes';

/**
 * Generate a quote number in format Q-YYYY-NNNN.
 * @returns {Promise<string>}
 */
async function generateQuoteNumber() {
    const db = initFirestore();
    const { collection, getDocs, query, orderBy, limit } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const year = new Date().getFullYear();

    // Get the highest quote number for this year
    const q = query(
        collection(db, COLLECTION),
        orderBy('createdAt', 'desc'),
        limit(1)
    );

    try {
        const snapshot = await getDocs(q);
        let maxNum = 0;

        snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.quoteNumber) {
                const parts = data.quoteNumber.split('-');
                if (parts.length === 3 && parts[1] === String(year)) {
                    const num = parseInt(parts[2], 10);
                    if (num > maxNum) maxNum = num;
                }
            }
        });

        return `Q-${year}-${String(maxNum + 1).padStart(4, '0')}`;
    } catch {
        // If query fails (e.g., no quotes yet), start from 1
        return `Q-${year}-0001`;
    }
}

/**
 * Calculate line item totals.
 * @param {Array} lineItems
 * @param {number} vatRate - VAT percentage (default 20 for UK)
 * @returns {{ subtotal: number, vatAmount: number, total: number }}
 */
export function calculateQuoteTotals(lineItems, vatRate = 20) {
    const subtotal = lineItems.reduce((sum, item) => {
        return sum + ((item.quantity || 0) * (item.unitPrice || 0));
    }, 0);

    const vatAmount = calculateVAT(subtotal, vatRate);
    const total = subtotal + vatAmount;

    return {
        subtotal: Math.round(subtotal * 100) / 100,
        vatAmount: Math.round(vatAmount * 100) / 100,
        total: Math.round(total * 100) / 100,
    };
}

/**
 * Create a new quote document.
 * @param {Object} quoteData
 * @param {string} quoteData.customerId
 * @param {string} quoteData.customerName
 * @param {string} quoteData.customerEmail
 * @param {Array} quoteData.lineItems
 * @param {string} [quoteData.notes]
 * @param {number} [quoteData.vatRate=20]
 * @param {string} [quoteData.validUntil]
 * @returns {Promise<string>} The new document ID.
 */
export async function createQuote(quoteData) {
    const db = initFirestore();
    const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const now = Timestamp.now();

    const vatRate = quoteData.vatRate || 20;
    const totals = calculateQuoteTotals(quoteData.lineItems || [], vatRate);
    const quoteNumber = await generateQuoteNumber();

    const docData = {
        quoteNumber,
        customerId: quoteData.customerId,
        customerName: quoteData.customerName,
        customerEmail: quoteData.customerEmail || '',
        status: 'draft',
        lineItems: (quoteData.lineItems || []).map(item => ({
            description: item.description || '',
            quantity: parseFloat(item.quantity) || 0,
            unitPrice: parseFloat(item.unitPrice) || 0,
            vatRate: vatRate,
        })),
        subtotal: totals.subtotal,
        vatAmount: totals.vatAmount,
        vatRate: vatRate,
        total: totals.total,
        notes: quoteData.notes || '',
        validUntil: quoteData.validUntil || null,
        createdAt: now,
        updatedAt: now,
    };

    const docRef = await addDoc(collection(db, COLLECTION), docData);
    log('verbose', `Quote ${quoteNumber} created with ID: ${docRef.id}`);
    return docRef.id;
}

/**
 * Fetch all quotes.
 * @param {Object} [options]
 * @param {string} [options.statusFilter]
 * @param {string} [options.sortField='createdAt']
 * @param {string} [options.sortDir='desc']
 * @returns {Promise<Array>}
 */
export async function getQuotes(options = {}) {
    const db = initFirestore();
    const { collection, getDocs, query, orderBy, where } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const { statusFilter = null, sortField = 'createdAt', sortDir = 'desc' } = options;

    let constraints = [orderBy(sortField, sortDir)];

    if (statusFilter && statusFilter !== 'all') {
        constraints.unshift(where('status', '==', statusFilter));
    }

    const q = query(collection(db, COLLECTION), ...constraints);
    const snapshot = await getDocs(q);

    const quotes = [];
    snapshot.forEach((docSnap) => {
        quotes.push({ id: docSnap.id, ...docSnap.data() });
    });

    log('verbose', `Fetched ${quotes.length} quotes`);
    return quotes;
}

/**
 * Get a single quote by ID.
 * @param {string} quoteId
 * @returns {Promise<Object|null>}
 */
export async function getQuoteById(quoteId) {
    const db = initFirestore();
    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

    const docRef = doc(db, COLLECTION, quoteId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() };
}

/**
 * Update a quote.
 * @param {string} quoteId
 * @param {Object} data
 * @returns {Promise<void>}
 */
export async function updateQuote(quoteId, data) {
    const db = initFirestore();
    const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

    const updateData = { ...data, updatedAt: Timestamp.now() };

    // Recalculate totals if line items changed
    if (data.lineItems) {
        const vatRate = data.vatRate || 20;
        const totals = calculateQuoteTotals(data.lineItems, vatRate);
        updateData.subtotal = totals.subtotal;
        updateData.vatAmount = totals.vatAmount;
        updateData.total = totals.total;
    }

    delete updateData.createdAt;
    delete updateData.quoteNumber;

    const docRef = doc(db, COLLECTION, quoteId);
    await updateDoc(docRef, updateData);
    log('verbose', `Quote ${quoteId} updated`);
}

/**
 * Update quote status.
 * @param {string} quoteId
 * @param {string} status
 * @returns {Promise<void>}
 */
export async function updateQuoteStatus(quoteId, status) {
    const db = initFirestore();
    const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

    const docRef = doc(db, COLLECTION, quoteId);
    await updateDoc(docRef, { status, updatedAt: Timestamp.now() });
    log('verbose', `Quote ${quoteId} status updated to ${status}`);
}

/**
 * Delete a quote.
 * @param {string} quoteId
 * @returns {Promise<void>}
 */
export async function deleteQuote(quoteId) {
    const db = initFirestore();
    const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

    const docRef = doc(db, COLLECTION, quoteId);
    await deleteDoc(docRef);
    log('verbose', `Quote ${quoteId} deleted`);
}

/**
 * Get quotes by customer ID.
 * @param {string} customerId
 * @returns {Promise<Array>}
 */
export async function getQuotesByCustomer(customerId) {
    const db = initFirestore();
    const { collection, getDocs, query, where, orderBy } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

    const q = query(
        collection(db, COLLECTION),
        where('customerId', '==', customerId),
        orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const quotes = [];
    snapshot.forEach((docSnap) => {
        quotes.push({ id: docSnap.id, ...docSnap.data() });
    });

    return quotes;
}

/**
 * Duplicate a quote (creates a new draft from existing).
 * @param {string} quoteId
 * @returns {Promise<string>} New quote ID.
 */
export async function duplicateQuote(quoteId) {
    const original = await getQuoteById(quoteId);
    if (!original) throw new Error('Quote not found');

    return createQuote({
        customerId: original.customerId,
        customerName: original.customerName,
        customerEmail: original.customerEmail,
        lineItems: original.lineItems,
        notes: original.notes,
        vatRate: original.vatRate || 20,
    });
}