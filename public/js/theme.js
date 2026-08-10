/**
 * Dark/Light Theme Toggle Module
 * ===============================
 * Handles the theme toggle button, localStorage persistence,
 * and system preference detection. Inline script in <head> handles
 * initial load to prevent FOUC; this module handles user toggling.
 */

/** @module theme */

const STORAGE_KEY = 'theme';

/**
 * Get the current effective theme (respects system preference as fallback).
 * @returns {'dark' | 'light'}
 */
function getCurrentTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Apply a theme to the document.
 * @param {'dark' | 'light'} theme
 */
function applyTheme(theme) {
    const root = document.documentElement;
    const isDark = theme === 'dark';
    root.classList.toggle('dark', isDark);
    root.style.colorScheme = isDark ? 'dark' : 'light';
    localStorage.setItem(STORAGE_KEY, theme);
}

/**
 * Update the toggle button text and icon to reflect current theme.
 * @param {HTMLElement} button
 * @param {'dark' | 'light'} theme
 */
function updateButtonUI(button, theme) {
    const icon = button.querySelector('.theme-toggle-icon');
    const label = button.querySelector('.theme-toggle-label');
    if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    if (label) label.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
    button.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
}

/**
 * Initialise the theme toggle button interactivity.
 * Call this on DOMContentLoaded.
 */
export function initThemeToggle() {
    const button = document.getElementById('themeToggle');
    if (!button) return;

    // Update UI to match current state (inline script already applied the class)
    updateButtonUI(button, getCurrentTheme());

    button.addEventListener('click', () => {
        const newTheme = getCurrentTheme() === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
        updateButtonUI(button, newTheme);
    });
}