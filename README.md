# Booking-System

A production-ready, secure booking system template built with **HTML5**, **Vanilla JavaScript (ES Modules)**, **Tailwind CSS**, **Firebase Authentication**, and **Firestore**.

Designed for easy cloning and rebranding for client projects. **No frameworks** (React, Vue, Angular, etc.).

---

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Quick Start](#quick-start)
- [Firebase Setup (Step by Step)](#firebase-setup-step-by-step)
- [Configuration](#configuration)
- [Git Workflow](#git-workflow)
- [Netlify Deployment Guide](#netlify-deployment-guide)
- [Security Decisions](#security-decisions)
- [GDPR Compliance](#gdpr-compliance)
- [Accessibility](#accessibility)
- [Extensibility Guide](#extensibility-guide)
- [Project Structure](#project-structure)

---

## Architecture Overview

```
booking-template/
├── public/                    # Deployed to Netlify
│   ├── index.html             # Public booking page
│   ├── admin.html             # Admin dashboard
│   ├── privacy.html           # GDPR privacy policy
│   └── _redirects             # Netlify SPA redirects
├── src/
│   ├── css/
│   │   └── style.css          # Custom styles + CSS vars
│   └── js/
│       ├── config.js          # Firebase + branding config
│       ├── validation.js      # Input validation + sanitisation
│       ├── firestore.js       # Firestore CRUD abstraction
│       ├── auth.js            # Firebase Auth (admin only)
│       ├── booking.js         # Public booking form logic
│       ├── admin.js           # Admin dashboard logic
│       └── ui.js              # Shared UI helpers
├── firebase/
│   ├── firestore.rules        # Production security rules
│   └── firestore.indexes.json # Composite indexes
├── netlify/
│   └── netlify.toml           # Deployment config
├── .env.example               # Environment variable template
├── .gitignore
└── package.json
```

### Key Security Principles

- **Never trust client input** — validation runs on client AND Firestore rules
- **No `innerHTML`** — all user data rendered via `textContent` (prevents XSS)
- **Least privilege** — public = create only, admin = read/update/delete
- **CSP headers** — Content Security Policy via Netlify
- **No secrets in Git** — Firebase config is public, but admin UID and API keys are documented

---

## Quick Start

### Prerequisites

- [Git](https://git-scm.com/)
- A web browser
- A [Firebase](https://firebase.google.com/) account (free tier is fine)
- A [Netlify](https://www.netlify.com/) account (free tier)

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/booking-system.git
cd booking-system
```

### 2. Set up Firebase (see [Firebase Setup](#firebase-setup-step-by-step))

### 3. Configure the app

Edit `src/js/config.js` with your Firebase project details and admin UID.

### 4. Open locally

Just open `public/index.html` in your browser, or run:

```bash
npx serve public
```

---

## Firebase Setup (Step by Step)

### Step 1: Create a Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Name it (e.g., `booking-system-client1`)
4. Disable Google Analytics (optional)
5. Click **"Create project"**

### Step 2: Enable Authentication

1. In the Firebase console, go to **Authentication** → **Sign-in method**
2. Click **"Email/Password"** → **Enable** → **Save**
3. Go to the **Users** tab
4. Click **"Add user"**
5. Enter your admin email and a strong password
6. **IMPORTANT**: After creating the user, copy their **User UID** (you'll need this for config.js and Firestore rules)

### Step 3: Create a Firestore Database

1. Go to **Firestore Database** → **Create database**
2. Choose **"Start in test mode"** (we'll update rules later)
3. Choose a location (e.g., `eur3` for Europe)
4. Click **"Enable"**

### Step 4: Get Your Firebase Config

1. Go to **Project Settings** (⚙️ icon) → **General**
2. Under **"Your apps"**, click **"Add app"** → **"Web"**
3. Register the app (nickname: `booking-system`)
4. Copy the `firebaseConfig` object — you'll need these values

### Step 5: Update Firestore Rules

1. Go to **Firestore Database** → **Rules**
2. Delete the existing rules
3. Copy the contents of `firebase/firestore.rules`
4. **REPLACE** `YOUR_ADMIN_UID_HERE` with your actual admin UID (from Step 2)
5. Click **"Publish"**

### Step 6: Create Required Indexes

1. Go to **Firestore Database** → **Indexes**
2. Click **"Add index"**
3. Create these indexes:

   **Index 1:**
   - Collection: `bookings`
   - Fields: `status` (Ascending), `createdAt` (Descending)

   **Index 2:**
   - Collection: `bookings`
   - Fields: `retentionExpiry` (Ascending), `createdAt` (Descending)

Or just click **"Import"** and upload `firebase/firestore.indexes.json`.

---

## Configuration

### Step 1: Edit `src/js/config.js`

Open `src/js/config.js` and replace all the `YOUR_*` placeholders:

```javascript
export const firebaseConfig = {
    apiKey: 'YOUR_API_KEY',
    authDomain: 'YOUR_PROJECT.firebaseapp.com',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_PROJECT.appspot.com',
    messagingSenderId: 'YOUR_SENDER_ID',
    appId: 'YOUR_APP_ID',
};

export const ADMIN_UID = 'YOUR_ADMIN_UID';
```

### Step 2: Customise Branding

Edit the `business` object in `config.js`:

```javascript
export const business = {
    name: 'Your Business Name',
    tagline: 'Your tagline here',
    email: 'contact@yourbusiness.com',
    phone: '+44 1234 567890',
    address: 'Your address',
    // ... opening hours, etc.
};
```

### Step 3: (Optional) Email Notifications

For booking notifications, sign up at [EmailJS](https://www.emailjs.com/) (free tier):

1. Create an EmailJS account
2. Add an email service (Gmail, Outlook, etc.)
3. Create an email template with variables: `{{name}}`, `{{email}}`, `{{phone}}`, `{{date}}`, `{{time}}`, `{{notes}}`, `{{submittedAt}}`
4. Get your **Service ID**, **Template ID**, and **Public Key**
5. Update these in `config.js` under `emailConfig`

---

## Git Workflow

### Recommended Branch Strategy

```
main              ← Production-ready, deployed to Netlify
├── development   ← Integration branch
│   ├── feature/*     ← Feature branches (e.g., feature/payments)
│   └── fix/*         ← Bug fix branches
└── hotfix/*       ← Emergency production fixes
```

### Example Workflow

```bash
# Start a new feature
git checkout -b feature/new-feature development

# Work, commit, push
git add .
git commit -m "feat: add new feature"
git push -u origin feature/new-feature

# Merge to development (via PR)
git checkout development
git merge feature/new-feature

# Release to main
git checkout main
git merge development
git tag v1.0.0
git push origin main --tags
```

### Commit Message Convention

| Type | Purpose | Example |
|---|---|---|
| `feat:` | New feature | `feat: add phone number validation` |
| `fix:` | Bug fix | `fix: correct date validation for leap years` |
| `chore:` | Maintenance | `chore: update firebase config` |
| `docs:` | Documentation | `docs: add deployment guide` |
| `security:` | Security fix | `security: sanitise user input in admin.js` |
| `refactor:` | Code restructuring | `refactor: extract validation module` |

---

## Netlify Deployment Guide

**⚠️ This is the most important part. Follow each step carefully.**

### Step 1: Push to GitHub

1. Create a new repository on GitHub (do NOT initialise with README)
2. Push your code:

```bash
git remote add origin https://github.com/YOUR_USERNAME/booking-system.git
git branch -M main
git push -u origin main
```

### Step 2: Connect Netlify to GitHub

1. Go to [app.netlify.com](https://app.netlify.com/)
2. Click **"Add new site"** → **"Import an existing project"**
3. Click **"Deploy with GitHub"**
4. Authorise Netlify to access your GitHub account
5. Search for your `booking-system` repository
6. Click on it

### Step 3: Configure Deploy Settings

On the configuration page:

1. **Branch to deploy**: `main`
2. **Base directory**: Leave blank
3. **Build command**: Leave blank (this is a static site)
4. **Publish directory**: `public` **(this is critical — must match)**
5. Click **"Deploy site"**

### Step 4: Set Environment Variables

1. After deployment, go to **Site settings** → **Environment variables**
2. Click **"Add environment variable"**
3. Add each variable (or set them in `src/js/config.js` directly for simplicity)

If you're using config.js with hardcoded values (simpler), you can skip this step.

### Step 5: Configure Custom Domain (Optional)

1. Go to **Site settings** → **Domain management**
2. Click **"Add custom domain"**
3. Follow the DNS configuration steps

### Step 6: Verify Deployment

1. Netlify will give you a URL like `https://random-name-123456.netlify.app`
2. Open this URL in your browser
3. You should see the **Booking-System** page with the purple gradient header
4. Test the booking form
5. Visit `/admin` — you should see the login page

### Important: After First Deploy

1. **If you get a blank page**: Check the browser console for errors. Most likely the Firebase config values in `config.js` need updating.
2. **If Firestore permission errors**: Make sure you published the Firestore rules (Firebase Console → Firestore → Rules) with your admin UID.
3. **If login doesn't work**: Verify you created the user in Firebase Authentication → Users tab.

### Troubleshooting Checklist

| Problem | Likely Fix |
|---|---|
| Blank page | Check console for JS errors; update Firebase config |
| "Permission denied" | Update Firestore rules with your admin UID |
| Can't log in | Create admin user in Firebase Auth → Users |
| Forms not submitting | Check Firestore rules allow `create` |
| 404 on admin page | `_redirects` file missing from `public/` folder |
| Styles broken | Internet access required for Tailwind CDN |

---

## Security Decisions

| Decision | Rationale |
|---|---|
| **No `innerHTML`** | Prevents all forms of XSS (stored, reflected, DOM-based) |
| **Firestore rules enforce types** | Server-side validation even if client is compromised |
| **Admin identified by UID** | Simple, no custom claims setup needed |
| **CSP headers** | Blocks inline scripts, restricts external resources |
| **Consent timestamped** | Audit trail for GDPR compliance |
| **Data retention expiry** | Automated identification of records for GDPR deletion |
| **No secrets in client code** | Firebase config is intentionally public; auth secrets stay server-side |
| **EmailJS for notifications** | Free tier, no SMTP credentials exposed in client |

---

## GDPR Compliance

This system includes the following GDPR features:

- ✅ **Consent checkbox** with mandatory agreement before submission
- ✅ **Consent timestamp** stored with each booking
- ✅ **Privacy notice** beside the booking form
- ✅ **Privacy Policy page** (`/privacy.html`) with full data processing information
- ✅ **Data retention expiry** (12 months) stored in each document
- ✅ **`getExpiredBookings()`** function to identify records due for deletion
- ✅ **Admin deletion** capability for right-to-erasure requests
- ✅ **No unnecessary personal data stored** (no IP addresses, no cookies)
- ✅ **Data stored in EU region** (Firestore location setting)

### GDPR Data Flow

1. User submits booking with explicit consent
2. Consent timestamp and 12-month retention expiry stored
3. Admin can view, manage, and delete data
4. After 12 months, records flagged for deletion via `getExpiredBookings()`

---

## Accessibility

This template follows **WCAG 2.2 AA** guidelines:

- ✅ Semantic HTML (`<nav>`, `<main>`, `<section>`, `<form>`, `<table>`)
- ✅ ARIA labels and descriptions
- ✅ Keyboard navigation with visible focus indicators
- ✅ Skip-to-content link
- ✅ Screen reader friendly error messages (`aria-live="polite"`)
- ✅ High contrast colour combinations
- ✅ Responsive design (no horizontal scroll)
- ✅ Error messages associated with inputs via `aria-describedby`

---

## Extensibility Guide

The modular structure makes it easy to add features without major refactoring.

### Adding Payments

1. Create `src/js/payment.js`
2. Import Stripe/PayPal SDK in `index.html`
3. Call payment function after booking submission in `booking.js`

### Adding Google Calendar Integration

1. Create `src/js/calendar.js`
2. Use the Google Calendar API
3. Add a "Add to Calendar" button in the admin booking details modal

### Adding SMS Reminders

1. Use Twilio or a similar service
2. Create a Firebase Cloud Function triggered on booking create
3. Send SMS with appointment details

### Adding Multiple Staff

1. Add a `staff` field to the booking document
2. Add a staff selection dropdown to the booking form
3. Filter available times by staff member's schedule

### Adding Multiple Services

1. Add a `service` field to the booking document
2. Create a services collection in Firestore
3. Add a service selection step to the booking form
4. Vary slot duration based on selected service

### Adding Business Hours / Holiday Closures

1. Create a `settings` collection in Firestore
2. Store opening hours and holiday dates
3. Fetch and apply in the booking form's date/time generation

### Adding Customer Accounts

1. Enable additional Firebase Auth providers (Google, etc.)
2. Create a `customers` collection linked to auth UID
3. Pre-fill booking form with customer data

---

## Project Structure

```
booking-system/
├── .env.example
├── .gitignore
├── package.json
├── README.md
├── firebase/
│   ├── firestore.rules
│   └── firestore.indexes.json
├── netlify/
│   └── netlify.toml
├── public/
│   ├── index.html
│   ├── admin.html
│   ├── privacy.html
│   └── _redirects
└── src/
    ├── css/
    │   └── style.css
    └── js/
        ├── config.js
        ├── validation.js
        ├── firestore.js
        ├── auth.js
        ├── booking.js
        ├── admin.js
        └── ui.js
```

---

## License

MIT — free for commercial and personal use.