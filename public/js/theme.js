const THEME_STORAGE_KEY = 'theme';
let isThemeInitialized = false;

function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme) {
  const root = document.documentElement;
  const isDark = theme === 'dark';
  root.classList.toggle('dark', isDark);
  root.style.colorScheme = isDark ? 'dark' : 'light';

  const toggle = document.getElementById('themeToggle') || document.getElementById('theme-toggle');
  if (toggle) {
    const icon = toggle.querySelector('.theme-toggle-icon');
    const label = toggle.querySelector('.theme-toggle-label');
    toggle.setAttribute('aria-pressed', String(isDark));
    toggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    if (icon) icon.textContent = isDark ? '☀️' : '🌙';
    if (label) label.textContent = isDark ? 'Light mode' : 'Dark mode';
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore storage errors
  }
}

export function toggleTheme() {
  const nextTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
  applyTheme(nextTheme);
}

export function initThemeToggle() {
  if (isThemeInitialized) {
    return;
  }

  isThemeInitialized = true;

  const storedTheme = getStoredTheme();
  const theme = storedTheme === 'dark' || storedTheme === 'light' ? storedTheme : getSystemTheme();
  applyTheme(theme);

  const toggle = document.getElementById('themeToggle') || document.getElementById('theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', toggleTheme);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initThemeToggle, { once: true });
} else {
  initThemeToggle();
}
