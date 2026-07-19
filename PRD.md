# Product Requirements Document — Chattrix

> Updated 2026-07-19 after the production-hardening pass and a subsequent UI/UX overhaul. Reflects what IS built and verified end-to-end (browser + local MongoDB), what's partially built, and what's on the roadmap.

---

## UI/UX Overhaul (2026-07-19, second pass)

Researched current (2026) social app UX conventions, then audited the live app at realistic desktop widths (not just mobile) — this surfaced the single highest-impact bug in the project:

**Root cause found**: `index.css` had an unlayered `*, *::before, *::after { margin: 0; padding: 0; }` reset. Under CSS Cascade Layers rules, unlayered styles always outrank anything inside `@layer` — and Tailwind wraps every utility in `@layer utilities`. This meant **every single `p-*`/`m-*` Tailwind class in the entire app had been silently doing nothing**, on every page, since before this project was touched. It's why the app looked sparse/broken at desktop widths: no real padding or centering was ever applied, only whatever spacing came from `gap-*` (a different CSS property, unaffected) or explicit pixel sizing. Fixed by moving the reset into `App.css`'s `@layer base` (the file that actually establishes Tailwind's layer order via `@import "tailwindcss"`) — confirmed via `getComputedStyle` before/after and screenshots across every page.

Built on top of that fix:
- **Right rail** ("Who to follow") on the dashboard using real suggested-user data, filling the dead space a 3-column social layout expects and adding genuine discovery value
- **Sidebar**: mini profile card (avatar + name + "View profile") at top, clear active-state (accent-gradient left bar, not just a faint background tint)
- **Inline quick composer** at the top of the feed ("What's on your mind?") — posts without leaving the page, expands on click
- **Pagination**: "Load more" wired to the backend's existing (previously unused by the frontend) `page`/`hasMore` response shape, on both the feed and profile post grids
- **Contrast fix**: `--text-muted` was 4.12:1 against the primary background and 3.80:1 against the sidebar — both fail WCAG AA's 4.5:1 for normal text (a documented glassmorphism/dark-UI risk). Bumped to a value that passes with margin while staying visually secondary
- **Focus-visible ring** added globally for keyboard navigation (custom-styled buttons/inputs can otherwise lose the default outline)
- **Accessibility**: `aria-label`s on all remaining icon-only buttons (hamburger, notification bell, avatar/profile button, back button, remove-image button), `aria-current="page"` on the active nav item
- **Skeleton loading state** for the profile page matching its eventual layout, replacing a plain "Loading..." string

---

## Product Overview

**Chattrix** is a social media web application that combines microblogging (posts with text + images) with real-time direct messaging. Users register, verify their email, create posts, follow/unfollow other users, view a personalized chronological feed, like and comment on posts, get notified of activity, message in real time, and manage their profile/account.

**Stage**: Production-hardened MVP. Core bugs fixed, security issues closed, all PRD-gap features from the previous audit are now implemented and verified via automated browser testing against a local database.

---

## Core Features

### 1. Authentication & Account Security
| Requirement | Status |
|------------|--------|
| Register (name, email, password) | ✅ |
| Login with JWT (access 15m + refresh 7d, httpOnly cookies) | ✅ |
| Logout | ✅ |
| Token validation + transparent refresh | ✅ |
| Email verification via OTP | ✅ Send + verify endpoints, dedicated `/verify-email` UI |
| Password reset via OTP | ✅ `/forgot-password` two-step UI |
| Protected routes (frontend) | ✅ Enforced via `AuthContext` + `ProtectedRoute` |
| Rate limiting on auth endpoints | ✅ `express-rate-limit`, 30 req/15min |
| Cross-site cookie compatibility (Vercel ↔ Render) | ✅ `sameSite: 'None'` + `secure` in production |

### 2. Posts / Feed
| Requirement | Status |
|------------|--------|
| Create post (title, content, optional image ≤5MB) | ✅ Cloudinary upload via memory buffer, no unmaintained wrapper dep |
| Chronological feed (own + followed users' posts) | ✅ Single indexed query, paginated |
| View all posts / single post / user's posts | ✅ Paginated |
| Edit own post | ✅ In-app modal (no more `window.prompt`) |
| Delete own post | ✅ With confirmation |
| Like / unlike | ✅ Notifies post author |
| Comment | ✅ Notifies post author; comment authors populated consistently across all endpoints |
| Search posts | ✅ |

### 3. Social (Follow System)
| Requirement | Status |
|------------|--------|
| Follow / unfollow | ✅ Notifies the followed user |
| Followers/following counts | ✅ Shown on profile |
| Follow state reflected correctly in feed & search | ✅ Derived from `AuthContext`, no stale state |
| Find people (user search) | ✅ Dedicated `/search` page |

### 4. Real-time Messaging
| Requirement | Status |
|------------|--------|
| Sidebar of other users, online indicators | ✅ |
| Send / receive messages in real time (Socket.io) | ✅ Verified bidirectional in-browser |
| Deep-link to a conversation from a profile's "Message" button | ✅ |
| New-message notification | ✅ |

### 5. Notifications
| Requirement | Status |
|------------|--------|
| In-app notifications for follow / like / comment / message | ✅ New `Notification` model + `/api/notifications` |
| Unread badge (header bell + sidebar) | ✅ Polled every 20s |
| Mark single / all as read | ✅ |

### 6. User Profile
| Requirement | Status |
|------------|--------|
| View own profile (stats, bio, avatar) | ✅ |
| View other users' profiles (`/profile/:userId`) | ✅ Follow/Message actions, follower/following/post counts |
| Edit profile (name, bio, avatar) | ✅ `/settings` |
| Delete account | ✅ Type-to-confirm; cascades posts, follow relations, notifications |

---

## Fixed From Previous Audit (all verified)

- Double-response bug in auth controllers (services no longer touch `res`)
- `register` missing `res` param crash
- `JWT_REFRESH_SECRET` missing / refresh verifying with the wrong secret
- Auth middleware silently hanging on some expired-token paths (no response sent)
- Feed endpoint building a **nested array** instead of a flat list (`allPost.push(posts)` bug) — replaced with a single indexed `$in` query
- `getUserPosts/:userId` ignoring the `:userId` param and always returning the caller's own posts
- Comment `createdAt` shared across all comments (`Date.now()` vs `Date.now`)
- Password hashes and **OTP codes** leaking in `getAllUsers` / search / sidebar responses (`select` now excludes them everywhere)
- Refresh/access tokens leaking in the JSON response body (not just the cookie) from the auth `applyResult` refactor — caught and fixed during this pass
- Hardcoded Cloudinary/SMTP credentials in source — moved to `.env`, removed insecure fallbacks
- `cookie sameSite: 'Lax'` breaking auth on the real cross-site Vercel↔Render deployment
- Default avatar URL not hotlinkable → broken `<img>` overflowing the UI; now empty by default with a letter-avatar fallback and an `onError` guard
- Dead code removed: `Dashboard2.jsx`, `FollowButton.jsx`
- `VITE_API_BASE_URL` now actually used everywhere via a centralized `src/api/axios.js` client (no more hardcoded `localhost:3000` / production URLs scattered across components)
- `.env.local` was silently pointing local dev at the **production** backend due to Vite's env precedence — split into `.env` (dev) / `.env.production` (build)
- `multer-storage-cloudinary` (pinned to vulnerable Cloudinary v1) replaced with memory storage + `cloudinary.uploader.upload_stream`, unblocking a safe upgrade to Cloudinary v2
- `npm audit`: 0 vulnerabilities (was 15)

---

## Architecture Notes

- **Frontend**: `AuthContext` (single source of truth for the logged-in user, including `following` for O(1) follow-state checks), `ToastContext` (replaces `alert()`), shared `AppLayout` (header/sidebar previously duplicated across 4 pages), centralized `api/axios.js`.
- **Backend**: services return plain result objects (`{status, success, message, data, cookies}`) instead of calling `res` directly; controllers apply cookies/status. `helmet`, rate limiting, and a centralized error handler are wired in `app.js`. Local dev runs against `mongodb://127.0.0.1:27017/chattrix_dev`, isolated from the production Atlas cluster.

---

## Not Built (Roadmap — see BRD.md for monetization tiers)

These were intentionally out of scope for this pass — they're substantial, separate initiatives, not bug fixes or MVP gaps:

1. **Payments / tipping** (Razorpay/Stripe integration) — needs real payment credentials and PCI-adjacent care
2. **Communities** (branded pages, moderation, invite links) — a distinct product surface
3. **Pro tier features** (badges, pinned posts, analytics, themes) — monetization-gated, not core social functionality
4. Group DMs, image messages, post sharing/repost, dark/light theme toggle

## Acceptance Criteria (for future features)

1. Use `src/api/axios.js` — no direct axios calls with hardcoded URLs
2. Use `AuthContext` / `ToastContext` — no ad-hoc auth fetches or `alert()`
3. Loading states for async data; errors surfaced via toast, not `alert()`
4. Mobile-responsive (sidebar collapses — already the pattern in `AppLayout`)
5. Behind `ProtectedRoute` if it requires auth
6. Backend: services return result objects, controllers own `res`; validate input with `express-validator`; never `select` password/OTP fields into a client-facing response
7. No `console.log` in committed code (only intentional operational logs: server start, DB connect, socket connect/disconnect)
