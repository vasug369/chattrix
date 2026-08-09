# Chattrix

A social platform combining microblogging with real-time messaging, built with React 19 and Node.js/Express 5.

---

## Tech Stack

| Layer       | Technology |
|------------|------------|
| Frontend   | React 19, Vite 6, Tailwind CSS v4, React Router v7, Axios, Socket.io-client |
| Backend    | Node.js, Express 5, Mongoose 8, JWT, Socket.io, Cloudinary, Nodemailer |
| Validation | Zod (every endpoint) |
| Testing    | Vitest + Supertest + mongodb-memory-server (169 tests) |
| Database   | MongoDB Atlas |
| Deployment | Frontend: Vercel · Backend: Render |

---

## Project Structure

```
chattrix/
├── backend/
│   ├── src/
│   │   ├── server.js         # Entry point — the only file that binds a port
│   │   ├── app.js            # Express app, middleware chain, route mounting
│   │   ├── config/           # env (validated), DB, Cloudinary, Nodemailer
│   │   ├── models/           # Mongoose schemas
│   │   ├── controllers/      # HTTP layer: read request, send response
│   │   ├── services/         # Business logic; returns values, throws AppError
│   │   ├── middlewares/      # auth, validate, errorHandler, rateLimiters
│   │   ├── validation/       # Zod schemas per resource
│   │   ├── realtime/         # Socket.io registry (decoupled from server.js)
│   │   ├── routes/           # Route definitions
│   │   └── utils/            # AppError, asyncHandler, otp, sanitize
│   ├── tests/                # Integration suites
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Router + providers
│   │   ├── index.css         # "Aurora Glass" design system
│   │   ├── lib/api.js        # The single axios instance
│   │   ├── context/          # AuthContext, SocketContext
│   │   └── components/
│   │       └── ui/           # Glass primitives, Aurora background
│   ├── .env.example
│   └── package.json
└── PRD.md / BRD.md / *-context.md
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (Atlas cluster or local `mongod`)
- Cloudinary account (optional — uploads are disabled without it, everything else works)

### Backend

```bash
cd backend
cp .env.example .env
# Fill in JWT_SECRET and JWT_REFRESH_SECRET at minimum:
#   openssl rand -hex 32
npm install
npm run dev        # nodemon, port 3000
```

The server validates its configuration at boot and refuses to start with a
precise error if anything is missing, rather than failing later with an
opaque 500.

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev        # Vite, port 5173
```

### Tests

```bash
cd backend
npm test           # 169 integration tests, ~5s
npm run test:watch
npm run test:coverage
```

Tests run against a real MongoDB started in-process by `mongodb-memory-server`.
If the machine already has a `mongod`, it is reused (see `tests/globalSetup.js`)
rather than downloading one; override with `MONGOMS_SYSTEM_BINARY`.

---

## Architecture Notes

**Services return, controllers respond.** Services never touch `res`; they
return values or throw an `AppError` carrying an HTTP status. A single
`errorHandler` turns anything thrown into a response, so no handler echoes raw
Mongoose messages back to clients.

**Validation is a boundary, not a suggestion.** Every route runs its payload
through a Zod schema that *replaces* `req.body` / `req.params` with the parsed
result, so downstream code only ever sees coerced, trimmed, whitelisted data.
Query strings land on `req.validatedQuery` (Express 5 makes `req.query`
read-only). Profile updates use `.strict()`, so unknown fields are rejected
outright rather than silently reaching a Mongoose update.

**Sockets are decoupled from the HTTP server.** Handlers import
`realtime/socket.js`, never `server.js`. Importing a route therefore does not
start a listener or open a database connection, which is what makes the app
testable with Supertest.

**Sessions are revocable at two granularities.** A `tokenVersion` on the user
kills every session at once — the right hammer for a password reset. Each login
also writes a `Session` row and stamps its `jti` into both tokens, so a single
device can be signed out without disturbing the others. The cost is one indexed
lookup per request; `lastSeenAt` is only written when it is more than a minute
stale, so reads do not silently become writes.

**The socket handshake is authenticated.** Identity comes from the session
cookie the browser already sends with the handshake, verified in
`realtime/socketAuth.js`. It previously came from `handshake.query.userId`,
which the client controls — so anyone could connect as anyone and receive their
notifications and direct messages.

**Secrets come from the environment only.** No credential has a hardcoded
fallback. Where a service is unconfigured (mail, Cloudinary) the app degrades
loudly and predictably instead of pointing at somebody else's account.

---

## API

All routes are under `/api`. Everything except `/api/auth/*` and
`/api/health` requires a session cookie.

### Auth
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/register` | Create an account; sends a verification code |
| POST | `/auth/login` | Sets httpOnly access + refresh cookies |
| POST | `/auth/logout` | Clears both cookies |
| GET  | `/auth/validate` | Session probe |
| POST | `/auth/refresh` | Rotate tokens |
| POST | `/auth/send-verify-otp` | (Re)issue an email verification code |
| POST | `/auth/verify-email` | Redeem a verification code |
| POST | `/auth/forgot-password` | Issue a password-reset code |
| POST | `/auth/reset-password` | Redeem it; revokes all existing sessions |
| GET  | `/auth/sessions` | List active devices, flagging the current one |
| DELETE | `/auth/sessions/:id` | Sign out one device |
| DELETE | `/auth/sessions` | Sign out every *other* device |

### Posts
`POST /post/create` · `GET /post` · `GET /post/feed` · `GET /post/search?q=`
· `GET /post/currentUser` · `GET /post/getUserPosts/:userId` · `GET /post/:id`
· `PUT /post/update/:id` · `PUT /post/:postId/like` · `POST /post/:postId/comment`
· `DELETE /post/:id`

Edit and delete require ownership. All list endpoints are paginated
(`?page=&limit=`, limit capped at 50).

### Users
`GET /user/me` · `PATCH /user/me` · `DELETE /user/me` · `GET /user/getAllUsers`
· `GET /user/search?q=` · `GET /user/:id` · `GET /user/is-following/:id`
· `PUT /user/:id/follow` · `PUT /user/:id/unfollow`

### Messages & Notifications
`GET /messages/users` · `GET /messages/:id` · `POST /messages/send/:id`

`GET /notifications` · `GET /notifications/unread-count`
· `PATCH /notifications/:id/read` · `PATCH /notifications/read-all`

### Socket events
Server emits `getOnlineUsers`, `newMessage`, `messagesRead`,
`notification:new`, `notification:count`, `typing`, `stopTyping`.
Client emits `typing`, `stopTyping`.

Connections are rejected at the handshake unless they carry a cookie naming a
live session, so a remotely signed-out device loses its socket as well as its
HTTP access.

---

## Design System

The frontend uses a glassmorphism system defined entirely in `src/index.css`,
built from three layers:

1. **Canvas** — a deep violet-black base
2. **Aurora** — four large, heavily blurred colour blobs drifting on 24–34s cycles
3. **Glass** — translucent panels with a gradient fill, a 1px specular top edge, and `backdrop-filter`

Glass only reads as glass when something colourful and uneven sits behind it,
which is why the aurora layer exists and why panels use gradient fills rather
than flat greys. The aurora renders once in the app shell, so navigating does
not restart its animation.

Utilities: `.glass`, `.glass-strong`, `.glass-panel`, `.glass-hover`,
`.glass-ring`, `.gl-btn`, `.gl-input`, `.gl-skeleton`, `.gl-gradient-text`.
Components in `src/components/ui/Glass.jsx` wrap these.

Both `prefers-reduced-motion` (stops the drift) and a
`@supports not (backdrop-filter)` fallback (opaque panels) are handled.

---

## Available Scripts

### Backend
| Command | Description |
|---------|-------------|
| `npm run dev` | nodemon, auto-reload |
| `npm start` | Production start |
| `npm test` | Run the test suite |
| `npm run test:watch` | Watch mode |
| `npm run test:coverage` | Coverage report |

### Frontend
| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server (port 5173) |
| `npm run build` | Production build |
| `npm run preview` | Preview the build |
| `npm run lint` | ESLint |

---

## Operational Notes

- **Rotate the leaked credentials.** Cloudinary keys and Mailtrap credentials
  were previously hardcoded in `src/config/*.js` and are in the git history.
  They have been moved to `.env`, but anything committed must be treated as
  compromised and rotated at the provider.
- **`JWT_SECRET` must be at least 16 characters.** Boot validation enforces
  this. Rotating it invalidates all existing sessions, which is expected.
- **`frontend/.env.local` overrides `frontend/.env` in Vite.** If `.env.local`
  points at the production API, `npm run dev` talks to production.
- **Production config lives in `frontend/.env.production`, which is committed.**
  `.env` and `.env.local` are gitignored, so a Vercel build never sees them and
  falls back to the localhost default in `src/lib/api.js` — which once shipped a
  bundle asking every visitor's own machine for the API. Vite loads
  `.env.[mode]` only in that mode and it outranks `.env.local`, so this affects
  `npm run build` and leaves `npm run dev` alone.
- **Two mail providers are supported, both over HTTPS.** Resend can only
  deliver to the account owner until a domain is verified; Brevo verifies a
  single sender address instead, so it reaches any recipient without owning a
  domain. `MAIL_PROVIDER` forces a choice when both are configured.
- **Mail goes through an HTTPS API, not SMTP.** Managed hosts often
  filter outbound SMTP ports; that presents as an ~8s connection timeout rather
  than an auth error, and previously added that delay to every registration.
  Until a domain is verified at resend.com/domains, Resend accepts only
  `onboarding@resend.dev` as the sender and delivers only to the Resend account
  owner's address. The startup log states which provider is live.
- **Mail is queued, never awaited.** `queueMail()` hands off without blocking,
  so a dead provider cannot slow a signup. Registration went from 9.6s to 0.2s.
- **`CORS_ORIGINS` entries must be bare origins** — `scheme://host[:port]`, no
  trailing slash, no quotes, no path. A malformed entry matches nothing and
  fails silently: the request returns 200 with no CORS header and the browser
  blocks it client-side. The startup log prints the parsed list so this is
  visible in the deploy log.

---

## Documentation

| Document | Purpose |
|----------|---------|
| [PRD.md](./PRD.md) | Product requirements and feature status |
| [BRD.md](./BRD.md) | Business model and projections |
| [backend-context.md](./backend-context.md) | Backend architecture reference |
| [frontend-context.md](./frontend-context.md) | Frontend architecture reference |
