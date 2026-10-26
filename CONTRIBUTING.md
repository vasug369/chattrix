# Contributing to Chattrix

Thanks for helping. This guide covers setup, how we work, and what a pull request needs before it can merge.

By taking part you agree to the [Code of Conduct](CODE_OF_CONDUCT.md). Report security issues privately, as described in [SECURITY.md](SECURITY.md), never in a public issue.

## Product rules

Every change respects these. A PR that breaks one will not be merged.

1. **Chronological feed.** No ranking or engagement-based ordering.
2. **No ads, no ad trackers, no data selling.**
3. **Communication is free.** Messaging, privacy controls and data export are never paywalled.
4. **Calm by design.** No streaks or dark patterns.
5. **Safe before big.** Moderation and privacy come before growth features.

## Setup

**Needs:** Node.js 20.19+, npm, and MongoDB (an Atlas cluster or a local `mongod`). Cloudinary and mail are optional; the app runs without them.

```bash
git clone https://github.com/vasug369/chattrix.git
cd chattrix

# backend
cd backend
cp .env.example .env      # set JWT_SECRET and JWT_REFRESH_SECRET (openssl rand -hex 32) and a database
npm install
npm run dev               # http://localhost:3000

# frontend (new terminal)
cd frontend
cp .env.example .env
npm install
npm run dev               # http://localhost:5173
```

The backend checks its config at startup and stops with a clear message if something is missing.

## Workflow

1. **Open or pick an issue** so work is not duplicated. Small fixes can skip this.
2. **Branch from `main`:**

   | Prefix | For |
   |---|---|
   | `feat/` | New user-facing feature |
   | `fix/` | Bug fix |
   | `perf/` | Performance |
   | `docs/` | Documentation only |
   | `test/` | Tests only |
   | `chore/` | Tooling, deps, cleanup |

   Example: `feat/block-user`.
3. **Commit** with [Conventional Commits](https://www.conventionalcommits.org/): `fix: close socket when session is revoked`.
4. **Open a PR** into `main` and fill in the template.
5. The owner reviews and merges. The branch is deleted after merge.

Keep each PR to one topic. Smaller PRs merge faster.

## Code rules

### Backend (`backend/src`)

- Layers: `routes → middlewares → controllers → services → models`.
- **Routes** chain a rate limiter, `validate(schema)` and a controller.
- **Every endpoint has a Zod schema** in `validation/`.
- **Controllers** use `asyncHandler` and reply with `{ success: true, data }`.
- **Services** hold business logic, never touch `req`/`res`, and throw `AppError` helpers for failures.
- **The user id comes from the session**, never from the request body or params.
- **Ownership** is checked on the server for every edit and delete.
- **New env vars** go in `src/config/env.js` and `.env.example`.
- No `console.log` in committed code.

### Frontend (`frontend/src`)

- HTTP only through `src/lib/api.js`.
- Auth from `AuthContext`, sockets from `SocketContext`.
- Logged-in pages are wrapped in `ProtectedRoute`.
- Every data view handles loading, empty and error states. No `alert()`.
- Use the Aurora Glass styles in `src/index.css` and `components/ui/Glass.jsx`.
- Works at 360 px, keyboard-navigable, images have alt text.

### Style

- Match the formatting of the file you are editing.
- Name things for what they do. Comments explain *why*, not *what*.

## Tests

```bash
cd backend
npm test                              # full suite
npx vitest run tests/posts.test.js    # one file
npm run test:coverage
```

- Tests run against an in-memory MongoDB; no setup needed.
- **Every new or changed endpoint needs tests for:**
  - success
  - validation failure (`422`)
  - not signed in (`401`)
  - acting on someone else's data (`403` or `404`), where relevant
- Frontend: run `npm run lint` and `npm run build` before opening a PR.

## Security

- Never commit secrets, `.env` files, tokens or personal data. Check your diff before every commit.
- Stage files by path. Do not use `git add -A` or `git add .`.
- Access is always decided on the server.
- See [SECURITY.md](SECURITY.md) for reporting.

## Pull request checklist

- [ ] One topic, branch named with a prefix above
- [ ] Respects the product rules
- [ ] Backend tests added or updated and `npm test` passes
- [ ] Frontend `npm run lint` and `npm run build` pass
- [ ] Loading, empty and error states handled; works at 360 px
- [ ] No secrets, no `console.log`, no `alert()`
- [ ] README updated if an endpoint, env var or script changed

## Questions

Open a [discussion or issue](https://github.com/vasug369/chattrix/issues).
