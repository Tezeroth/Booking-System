/**
 * Firebase Authentication Module
 * ===============================
 * Handles admin login, logout, session persistence, and route guarding.
 * Only email/password auth — no public registration.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { firebaseConfig, ADMIN_UID } from './config.js';

/** @module auth */

let auth = null;

/**
 * Initialise Firebase Auth.
 * @returns {import('firebase/auth').Auth}
 */
function initAuth() {
    if (auth) return auth;
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    return auth;
}

/**
 * Log in with email and password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<import('firebase/auth').UserCredential>}
 */
export async function login(email, password) {
    const authInstance = initAuth();
    return signInWithEmailAndPassword(authInstance, email, password);
}

/**
 * Log out the current user.
 * @returns {Promise<void>}
 */
export async function logout() {
    const authInstance = initAuth();
    await signOut(authInstance);
}

/**
 * Send password reset email.
 * @param {string} email
 * @returns {Promise<void>}
 */
export async function resetPassword(email) {
    const authInstance = initAuth();
    await sendPasswordResetEmail(authInstance, email);
}

/**
 * Listen for auth state changes.
 * @param {function(import('firebase/auth').User|null)} callback
 * @returns {function()} Unsubscribe function
 */
export function onAuthChange(callback) {
    const authInstance = initAuth();
    return onAuthStateChanged(authInstance, callback);
}

/**
 * Check if the current user is the authorised admin.
 * @param {import('firebase/auth').User} user
 * @returns {boolean}
 */
export function isAdmin(user) {
    if (!user) return false;
    return user.uid === ADMIN_UID;
}

/**
 * Require authentication — redirects to login if not authorised.
 * @returns {Promise<import('firebase/auth').User|null>}
 */
export function requireAuth() {
    return new Promise((resolve, reject) => {
        const authInstance = initAuth();
        const unsubscribe = onAuthStateChanged(authInstance, (user) => {
            unsubscribe();
            if (user && isAdmin(user)) {
                resolve(user);
            } else if (user && !isAdmin(user)) {
                // User is logged in but not authorised admin
                signOut(authInstance);
                reject(new Error('Unauthorised access. Please contact the administrator.'));
            } else {
                reject(new Error('Authentication required. Please log in.'));
            }
        }, reject);
    });
}