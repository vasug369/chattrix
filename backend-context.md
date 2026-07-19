# Backend Context — Chattrix

> Updated 2026-07-19 after the production-hardening pass. Single source of truth for backend architecture decisions.

---

## Stack

| Layer        | Technology               |
|-------------|---------------------------|
| Runtime     | Node.js                   |
| Framework   | Express 5                 |
| Database    | MongoDB (Mongoose 8)      |
| Auth        | JWT (access + refresh)    |
| Password    | bcryptjs                  |
| Realtime    | Socket.io                 |
| File Upload | Multer (memory storage) + Cloudinary v2 (`upload_stream`) |
| Email       | Nodemailer (Brevo SMTP)   |
| Security    | Helmet, express-rate-limit, express-validator |
| Module System | ES Modules (`"type": "module"`) |

---

## Project Structure

```
backend/
├── .env                     # Environment variables (NEVER commit)
├── .env.sample              # Template — placeholders only
├── package.json
└── src/
    ├── server.js             # HTTP server, Socket.io setup, entry point
    ├── app.js                # Express app, middleware, route mounting
    ├── config/
    │   ├── dbConfig.js       # MongoDB connection (MONGO_URI)
    │   ├── cloudinaryConfig.js  # Cloudinary v2 config + multer memory storage + upload_stream helper
    │   ├── corsConfig.js     # Shared CORS origin list (CORS_ORIGINS)
    │   └── nodemailer.js     # SMTP transporter
    ├── models/
    │   ├── user.model.js
    │   ├── post.model.js
    │   ├── conversation.model.js
    │   ├── message.model.js
    │   └── notification.model.js
    ├── controllers/
    │   ├── authController.js
    │   ├── userController.js
    │   ├── postController.js
    │   ├── profileController.js
    │   ├── messageController.js
    │   └── notificationController.js
    ├── services/
    │   ├── authService.js     # Returns plain result objects — never touches `res`
    │   ├── userService.js
    │   ├── postService.js
    │   ├── profileService.js
    │   ├── messageService.js
    │   └── notificationService.js
    ├── middlewares/
    │   ├── authMiddleware.js
    │   ├── validate.js        # express-validator error formatter
    │   ├── rateLimiter.js
    │   └── errorHandler.js    # Centralized fallback error handler + 404
    ├── utils/
    │   ├── otp.js
    │   └── cookieOptions.js
    └── routes/
        ├── authRoutes.js
        ├── userRoutes.js
        ├── postRoutes.js
        ├── profileRoutes.js
        ├── messageRoutes.js
        └── notificationRoutes.js
```

---

## Auth Flow

### Token Strategy
- **Access token**: JWT, 15min expiry, `token` httpOnly cookie
- **Refresh token**: JWT, 7 days expiry, `refreshToken` httpOnly cookie
- Cookie options (`utils/cookieOptions.js`): `httpOnly: true` always; `secure` + `sameSite: 'None'` in production (required for the cross-site Vercel↔Render deployment); `secure: false` + `sameSite: 'Lax'` in local dev

### Service/Controller Split
Services return `{ status, success, message, data?, cookies?, clearCookies? }` — they never call `res` directly. `authController.js`'s `applyResult` helper applies cookies/clears them, then strips `cookies`/`clearCookies` from the body before sending JSON (tokens must never appear in the response body, only in httpOnly cookies).

### Auth Middleware (`authMiddleware.js`)
- Reads `token` from `req.cookies.token`
- Valid → attaches `req.user` (password/OTP fields excluded) → `next()`
- Expired + valid `refreshToken` present → issues new access token cookie → `next()`
- Any other failure → `401` (every code path returns a response — the old version could silently hang with no response on some failure branches)

### Route Protection
- Public: `/api/auth/register`, `/login`, `/logout`, `/validate`, `/send-reset-otp`, `/reset-password`
- Protected (behind `authMiddleware`): `/api/auth/send-verify-otp`, `/verify-email`, and everything under `/api/post`, `/api/user`, `/api/myProfile`, `/api/messages`, `/api/notifications`

---

## Database Schema

### User (`user.model.js`)
| Field              | Type       | Notes |
|--------------------|-----------|-------|
| name, email, password | String   | email lowercased/trimmed, unique |
| pic                | String    | default `""` — frontend falls back to a letter avatar |
| bio                | String    | max 160 chars |
| followers / following | [ObjectId → User] | |
| verifyOtp / verifyOtpExpireAt | String / Date | |
| isAccountVerified  | Boolean   | |
| resetOtp / resetOtpExpireAt | String / Date | |

**Never select** `password`, `verifyOtp`, `verifyOtpExpireAt`, `resetOtp`, `resetOtpExpireAt` into any client-facing response — `userService.PUBLIC_USER_EXCLUDE` is the shared exclusion string, used across `getUserService`, `getAllUsersService`, `searchUsersService`, and `messageService.getUsersForSidebarService`.

### Post (`post.model.js`)
Same shape as before (title, content, pic, author, likes[], comments[]), with `comments.createdAt` correctly defaulting to `Date.now` (function reference, not an invoked timestamp shared across all comments). Indexed on `{ author: 1, createdAt: -1 }`.

### Notification (`notification.model.js`) — new
| Field | Type |
|-------|------|
| recipient / sender | ObjectId → User |
| type | enum: `follow`, `like`, `comment`, `message` |
| post | ObjectId → Post (optional) |
| read | Boolean |

Created via `notificationService.createNotification` — no-ops on self-notifications (e.g. liking your own post).

### Conversation / Message
Unchanged, indexed on `participants`.

---

## API Endpoints

### Auth (`/api/auth`)
| Method | Path | Protected | Description |
|--------|------|-----------|-------------|
| POST | /register | No | Rate-limited, validated |
| POST | /login | No | Rate-limited, validated |
| GET | /logout | No | |
| GET | /validate | No | |
| POST | /send-verify-otp | Yes | |
| POST | /verify-email | Yes | body: `{ otp }` |
| POST | /send-reset-otp | No | Rate-limited, body: `{ email }` |
| POST | /reset-password | No | Rate-limited, body: `{ email, otp, newPassword }` |

### Posts (`/api/post`) — all protected, paginated list endpoints return `{ posts, page, limit, total, hasMore }`
| Method | Path | Description |
|--------|------|-------------|
| POST | /create | multipart, field `pic` |
| GET | /currentUser | caller's own posts |
| GET | /getUserPosts/:userId | any user's posts (fixed — used to ignore `:userId`) |
| GET | /feed | own + followed users' posts, single indexed query (fixed — used to build a nested array) |
| GET | /search?q= | |
| GET | / | all posts |
| GET | /:id | single post |
| PUT | /update/:id | author-only, optional new `pic` |
| PUT | /:postId/like | toggles, notifies author |
| POST | /:postId/comment | notifies author |
| DELETE | /:id | author-only |

### Users (`/api/user`)
| Method | Path | Description |
|--------|------|-------------|
| GET | /getAllUsers | |
| GET | /me | includes `following`/`followers` for client-side follow-state checks |
| GET | /search?q= | |
| GET | /:id | |
| PUT | /:followUserId/follow | notifies |
| PUT | /:unfollowUserId/unfollow | |
| PUT | /:id | self-only, whitelisted fields (`name`, `bio`, `pic`), optional avatar upload |
| DELETE | / | cascades: deletes own posts, pulls self from others' follow lists, deletes own notifications |

### Profile (`/api/myProfile`)
| Method | Path | Description |
|--------|------|-------------|
| GET | /:id | aggregated stats: `followersCount`, `followingCount`, `postsCount`, `isFollowing`, `isSelf` |

### Messages (`/api/messages`) — unchanged endpoints, logic moved into `messageService.js`

### Notifications (`/api/notifications`) — new
| Method | Path | Description |
|--------|------|-------------|
| GET | / | latest 50, populated sender + post |
| GET | /unread-count | |
| PUT | /read-all | |
| PUT | /:id/read | |

---

## Socket.io Events

Unchanged: `connection` (query `userId`), `getOnlineUsers` broadcast, `newMessage` to the receiver's socket, `disconnect`.

---

## Environment Variables

See `README.md` and `.env.sample` for the full list. Key points:
- `MONGO_URI` replaces the old `DB_Host`/`DB_Pass`/`DB_Name` SRV-string assembly — a single standard connection string, works for both local (`mongodb://127.0.0.1:27017/chattrix_dev`) and Atlas.
- `CORS_ORIGINS` is comma-separated, shared between Express CORS and Socket.io CORS via `config/corsConfig.js`.
- No credential has a hardcoded fallback in source anymore.

---

## Patterns in Use

| Pattern                    | Status |
|---------------------------|--------|
| Controller → Service → Model | ✅ All domains, including messages/notifications |
| Services never call `res`  | ✅ |
| Route files per domain     | ✅ |
| Field-level `select()` exclusion for sensitive fields | ✅ Shared constant, applied everywhere |
| Rate limiting on auth      | ✅ |
| Centralized error handler + 404 | ✅ |
| Pagination on list endpoints | ✅ |

## Code Style

Single quotes, 4-space indentation in models/services, ES modules, named exports for services, default exports for models/config.
