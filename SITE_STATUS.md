# Booking-System — Site Status

## Branches
| Branch | Purpose | Last Commit |
|--------|---------|--------------|
| `business-suite-v2` | Local dev branch (never touch remotely) | `63ae488` — landing page, booking.html, image placeholders |
| `main` | Stable source of truth (do NOT deploy this to Netlify) | `673b83c` — merge commit |
| `netlify` | Auto-deploy branch for Netlify | Should point to `63ae488` (landing page commit) |

## Local Server
- Runs with: `npx serve public -l 3000` while in `business-suite-v2`
- **Do not** stop this while testing

## Netlify Deploy
- Configured to deploy from **GitHub branch `netlify`**
- Publish directory: `public/`
- Landing page: `public/index.html`
- Booking form: `public/booking.html`
- Admin: `public/admin.html`
- Privacy: `public/privacy.html`

## Current Issue
`origin/netlify` shows `673b83c` (merge commit) but landing page code is in `63ae488`. Need to push business-suite-v2 → netlify to get the landing page on the live site.

## What NOT to Do
- Do NOT run `git checkout main`
- Do NOT merge `main` → `netlify` again
- Do NOT stop the local dev server
- Do NOT modify `main` or `netlify` branches directly

## Current Working Directory
`d:/Booking-System` — stay here.

## To Deploy to Netlify (when needed)
```bash
git stash
git checkout netlify
git merge business-suite-v2 --no-ff
git push origin netlify
git checkout business-suite-v2
git stash pop
```

Then in Netlify dashboard: Deploys → Trigger deploy → Deploy site