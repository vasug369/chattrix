# Frontend Context — Chattrix

> Auto-generated from codebase analysis on 2026-04-25. This is the single source of truth for frontend architecture decisions.

---

## Stack

| Layer        | Technology               | Version   |
|-------------|--------------------------|-----------|
| Framework   | React                    | 19.1.0    |
| Build Tool  | Vite                     | 6.3.5     |
| Routing     | React Router DOM         | 7.6.0     |
| Styling     | Tailwind CSS v4 + CSS Variables | 4.1.6 |
| HTTP Client | Axios                    | 1.9.0     |
| Realtime    | socket.io-client         | 4.8.3     |
| Module System | ES Modules             | —         |

---

## Project Structure

```
frontend/
├── .env                    # Production API URL
├── .env.local              # Local dev overrides
├── index.html              # Entry HTML (Google Fonts loaded here)
├── vite.config.js          # Vite + React + Tailwind plugins
├── package.json
└── src/
    ├── main.jsx             # React root render
    ├── App.jsx              # Router + route definitions
    ├── App.css              # Tailwind import + custom font classes
    ├── index.css            # Design system (CSS variables, glass, animations)
    ├── assets/              # Static assets
    └── components/
        ├── Login.jsx        # Auth page (sign in / sign up toggle)
        ├── Dashboard.jsx    # Feed page (main, 562 lines ⚠️)
        ├── Dashboard2.jsx   # ⚠️ DEAD CODE — unused prototype
        ├── CreatePost.jsx   # Post creation form with image upload
        ├── Profile.jsx      # User profile + their posts
        ├── Messages.jsx     # Real-time chat interface
        ├── FollowButton.jsx # ⚠️ UNUSED — standalone follow component
        └── ProtectedRoutes.jsx # Auth guard (exists but DISABLED in App.jsx)
```

---

## Routing

| Path           | Component   | Protected | Notes |
|---------------|-------------|-----------|-------|
| `/`           | Login       | No        | — |
| `/dashboard`  | Dashboard   | ⚠️ Disabled | `<ProtectedRoute>` commented out |
| `/create-post`| CreatePost  | ⚠️ Disabled | `<ProtectedRoute>` commented out |
| `/profile`    | Profile     | ⚠️ Disabled | `<ProtectedRoute>` commented out |
| `/messages`   | Messages    | ⚠️ Disabled | `<ProtectedRoute>` commented out |

---

## Design System (`index.css`)

### Color Palette (CSS Variables)
```
--bg-primary:       #0a0a1b       (deep navy)
--bg-secondary:     #13132e       (sidebar)
--bg-card:          rgba(255,255,255,0.05)
--bg-card-hover:    rgba(255,255,255,0.08)
--bg-input:         rgba(255,255,255,0.07)
--bg-input-focus:   rgba(255,255,255,0.12)
--accent-primary:   #7c3aed       (purple)
--accent-secondary: #3b82f6       (blue)
--accent-gradient:  linear-gradient(135deg, #7c3aed, #3b82f6)
--text-primary:     #f1f5f9
--text-secondary:   #94a3b8
--text-muted:       #64748b
--border-color:     rgba(255,255,255,0.12)
--danger:           #ef4444
--success:          #22c55e
```

### Typography
- Primary: `Poppins` (Google Fonts, weights 300–900)
- Accent: `Cedarville Cursive` (decorative)
- Utility classes: `.font-poppins`, `.font-credera`

### Reusable Classes
- `.glass` — Glassmorphism card (blur 20px, border, rounded-16px)
- `.glass-strong` — Heavy glass (blur 40px, rounded-20px)
- `.animate-fade-in-up` — 0.6s fade + translate Y
- `.animate-fade-in` — 0.4s opacity
- `.animate-slide-in` — 0.5s slide from left
- `.stagger-children` — Delays children 0–320ms
- `.flying-heart` — Like animation (floats up and fades)

---

## Styling Pattern

**Hybrid: Tailwind CSS v4 utilities + CSS custom properties + inline `style={}`**

- Layout and spacing → Tailwind classes (`className`)
- Theme colors → CSS variables via `style={{ color: 'var(--text-primary)' }}`
- Interactive states (hover/focus) → `onMouseEnter`/`onMouseLeave` handlers mutating `e.target.style`
- Glass effects → `.glass` / `.glass-strong` utility classes

> **Note**: This is an unusual pattern. Hover effects should use CSS `:hover` instead of JS event handlers. The inline style approach is used consistently, so follow it for consistency until a refactor is approved.

---

## Environment Variables

| Variable           | File       | Used In  | Status |
|-------------------|-----------|----------|--------|
| VITE_API_BASE_URL | .env      | Nowhere  | ⚠️ **DEFINED BUT NEVER IMPORTED** |
| VITE_API_BASE_URL | .env.local| Nowhere  | ⚠️ **DEFINED BUT NEVER IMPORTED** |

---

## Known Issues & Gaps

### 🔴 P0 — Broken Functionality

1. **Hardcoded base URLs everywhere**: Every component has its own `const baseURL = 'http://localhost:3000'` or the render.com production URL. The `VITE_API_BASE_URL` env var exists but is **never used**. `Login.jsx` points to production (`https://chattrix-2.onrender.com`), while all other components point to `localhost:3000`.

2. **ProtectedRoute is disabled**: All routes in `App.jsx` have `<ProtectedRoute>` commented out. Any unauthenticated user can navigate directly to `/dashboard`, `/messages`, etc.

3. **No centralized API service**: Every component calls `axios.get/post` directly with its own hardcoded URL. There is no `src/services/api.js`.

### 🟡 P1 — Architecture Gaps

4. **No AuthContext**: Auth state (user ID, name, email, token validity) is fetched independently in each component via `GET /api/auth/validate`. There is no shared auth state.

5. **No form validation library**: All forms use raw `useState` + manual validation. No React Hook Form, no Zod schemas.

6. **No error handling strategy**: Errors are caught with `console.log` or raw `alert()`. No toast system, no error boundaries.

7. **Dashboard.jsx is 562 lines**: Contains header, sidebar, feed, post cards, comments, actions — all in one component. Should be decomposed.

### 🟠 P2 — Code Quality

8. **Dead code**: `Dashboard2.jsx` is a prototype with placeholder data, not imported anywhere. `FollowButton.jsx` uses relative API paths and inline styles (doesn't match project style), not imported anywhere.

9. **Unused imports**: `App.jsx` imports `useState`, `reactLogo`, `viteLogo` — none are used. Has unused `count`/`setCount` state.

10. **Socket.io URL hardcoded**: `Messages.jsx` line 38 hardcodes `http://localhost:3000` for the socket connection.

11. **No loading/skeleton states**: Components show plain text "Loading..." or nothing while fetching.

12. **Inline nav items array duplicated**: The `navItems` array is copy-pasted identically in Dashboard, CreatePost, Profile, and Messages.

---

## Component Patterns

| Pattern                    | Status |
|---------------------------|--------|
| Functional components only | ✅ Consistent |
| Hooks for state            | ✅ Consistent |
| Single-file components     | ✅ Consistent (no separation of logic/view) |
| Direct axios in components | ❌ Should use centralized service |
| PascalCase component files | ✅ Consistent |
| Default exports            | ✅ Consistent |
| JSX extension (.jsx)       | ✅ Consistent |

---

## Code Style

- **Quotes**: Single quotes
- **Semicolons**: Yes (consistent)
- **Indentation**: 2 spaces
- **Imports**: React at top, then libraries, then local
- **Component pattern**: `function ComponentName() { ... }` (function declarations, not arrow)
- **Export style**: `export default ComponentName` at bottom
