# Frontend Context — Chattrix

> Updated 2026-07-19 after the production-hardening pass. Single source of truth for frontend architecture decisions.

---

## Stack

| Layer        | Technology        |
|-------------|--------------------|
| Framework   | React 19           |
| Build Tool  | Vite 6             |
| Routing     | React Router DOM 7 |
| Styling     | Tailwind CSS v4 + CSS custom properties |
| HTTP Client | Axios (centralized instance) |
| Realtime    | socket.io-client    |

---

## Project Structure

```
frontend/
├── .env                    # Local dev API URL (VITE_API_BASE_URL=http://localhost:3000)
├── .env.production          # Production build API URL (Render backend)
├── vite.config.js
├── package.json
└── src/
    ├── main.jsx
    ├── App.jsx              # Router + route definitions, wraps AuthProvider/ToastProvider
    ├── api/
    │   └── axios.js         # Centralized axios instance — baseURL from VITE_API_BASE_URL, withCredentials
    ├── context/
    │   ├── AuthContext.jsx  # Single source of truth for the logged-in user; login/logout/refreshUser/isFollowing
    │   └── ToastContext.jsx # Toast notifications — replaces alert()
    ├── index.css            # Design system (unchanged)
    └── components/
        ├── layout/
        │   └── AppLayout.jsx    # Shared header + sidebar + notification bell for every authenticated page
        ├── Login.jsx
        ├── ForgotPassword.jsx   # New — two-step OTP reset flow
        ├── VerifyEmail.jsx      # New
        ├── Dashboard.jsx        # Feed
        ├── EditPostModal.jsx    # New — replaces window.prompt() editing
        ├── CreatePost.jsx
        ├── Profile.jsx          # Now handles both /profile and /profile/:userId
        ├── Settings.jsx         # New — edit profile + delete account
        ├── Search.jsx           # New — find people
        ├── Notifications.jsx    # New
        ├── Messages.jsx
        ├── NotFound.jsx         # New — 404 fallback
        └── ProtectedRoutes.jsx  # Now reads AuthContext instead of its own fetch
```

**Removed** (dead code): `Dashboard2.jsx`, `FollowButton.jsx` — unreferenced prototypes.

---

## Routing

| Path | Component | Protected |
|------|-----------|-----------|
| `/` | Login | No |
| `/forgot-password` | ForgotPassword | No |
| `/verify-email` | VerifyEmail | Yes |
| `/dashboard` | Dashboard | Yes |
| `/create-post` | CreatePost | Yes |
| `/profile`, `/profile/:userId` | Profile | Yes |
| `/messages` | Messages | Yes |
| `/search` | Search | Yes |
| `/notifications` | Notifications | Yes |
| `/settings` | Settings | Yes |
| `*` | NotFound | No |

`ProtectedRoute` reads `status` from `AuthContext` (`'loading' | 'authenticated' | 'unauthenticated'`) — no more per-component `validate` fetches.

---

## State Management

- **`AuthContext`**: fetches `/api/user/me` on mount (includes `following`/`followers` arrays), exposes `login()`, `logout()`, `refreshUser()`, and `isFollowing(userId)` — used everywhere a follow button needs to know its state, instead of each page tracking it independently.
- **`ToastContext`**: `showToast(message, type)` — used in place of `alert()` for all error/success feedback across the app.

---

## Design System (`index.css`) — unchanged

Same glassmorphism / purple-blue gradient system as before: CSS variables (`--bg-primary`, `--accent-gradient`, etc.), `.glass` / `.glass-strong` utility classes, fade/slide animations, `.flying-heart` like animation. All new pages (Settings, Search, Notifications, ForgotPassword, VerifyEmail) follow this exact pattern — no new design system was introduced.

---

## Styling Pattern — unchanged

Hybrid: Tailwind utilities for layout/spacing, CSS variables via inline `style={}` for theme colors, `.glass` classes for cards. Followed consistently in all new components for visual continuity with the original app.

---

## Environment Variables

| File | Used by | Value |
|------|---------|-------|
| `.env` | `npm run dev` | `http://localhost:3000` |
| `.env.production` | `npm run build` | Deployed Render backend URL |

Both consumed via `import.meta.env.VITE_API_BASE_URL` in `src/api/axios.js` and `Messages.jsx` (Socket.io connection) — no component hardcodes a backend URL anymore.

> **Previous bug**: `.env.local` was pointing local dev at the *production* backend due to Vite's env-file precedence (`.env.local` always wins over `.env`). Removed; the dev/prod split now lives in `.env` / `.env.production` where it belongs.

---

## Component Patterns

| Pattern                    | Status |
|---------------------------|--------|
| Functional components, hooks | ✅ |
| Centralized API client (`api/axios.js`) | ✅ — no more direct `axios.get/post` with hardcoded URLs |
| Shared layout (`AppLayout`) | ✅ — eliminated the header/sidebar/`navItems` duplication that previously existed identically across 4 files |
| Auth state via context | ✅ |
| Toasts instead of `alert()` | ✅ |
| PascalCase component files, default exports | ✅ |

## Code Style

Single quotes, semicolons, 2-space indentation — unchanged from the original codebase conventions.
