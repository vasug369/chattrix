# Backend Context — Chattrix

> Auto-generated from codebase analysis on 2026-04-25. This is the single source of truth for backend architecture decisions.

---

## Stack

| Layer        | Technology               | Version   |
|-------------|--------------------------|-----------|
| Runtime     | Node.js                  | —         |
| Framework   | Express                  | 5.1.0     |
| Database    | MongoDB (Atlas)          | Mongoose 8.14.2 |
| Auth        | JWT (access + refresh)   | jsonwebtoken 9.0.2 |
| Password    | bcryptjs                 | 3.0.2     |
| Realtime    | Socket.io                | 4.8.3     |
| File Upload | Multer + Cloudinary      | multer 2.1.1, cloudinary 1.41.3 |
| Email       | Nodemailer (Mailtrap sandbox) | node-mailer 0.1.1 ⚠️ |
| Module System | ES Modules (`"type": "module"`) | — |

---

## Project Structure

```
backend/
├── .env                    # Environment variables (NEVER commit)
├── .env.sample             # Template for .env
├── package.json
└── src/
    ├── server.js            # HTTP server, Socket.io setup, entry point
    ├── app.js               # Express app, middleware, route mounting
    ├── config/
    │   ├── dbConfig.js      # MongoDB Atlas connection
    │   ├── cloudinaryConfig.js  # Cloudinary + Multer storage
    │   └── nodemailer.js    # SMTP transporter
    ├── models/
    │   ├── user.model.js
    │   ├── post.model.js
    │   ├── conversation.model.js
    │   └── message.model.js
    ├── controllers/
    │   ├── authController.js
    │   ├── userController.js
    │   ├── postController.js
    │   ├── profileController.js
    │   └── messageController.js
    ├── services/
    │   ├── authService.js
    │   ├── userService.js
    │   ├── postService.js
    │   └── profileService.js   # ⚠️ No messageService.js
    ├── middlewares/
    │   └── authMiddleware.js
    └── routes/
        ├── authRoutes.js
        ├── userRoutes.js
        ├── postRoutes.js
        ├── profileRoutes.js
        └── messageRoutes.js
```

---

## Auth Flow

### Token Strategy
- **Access token**: JWT, 15min expiry, stored in `token` httpOnly cookie
- **Refresh token**: JWT, 7 days expiry, stored in `refreshToken` httpOnly cookie
- Cookies: `httpOnly: true`, `secure` in production, `sameSite: 'Lax'`

### Access token payload
```json
{ "id": "<user._id>", "name": "<user.name>", "email": "<user.email>" }
```

### Refresh token payload
```json
{ "id": "<user._id>" }
```

### Auth Middleware (`authMiddleware.js`)
- Reads `token` from `req.cookies.token`
- If valid → attaches `req.user` (full User doc minus password) → calls `next()`
- If expired AND `refreshToken` exists → verifies refresh token → issues new access token cookie → attaches `req.user` → calls `next()`
- If both fail → returns 401

### Route Protection
- Public: `/api/auth/*` — no auth required
- Protected: `/api/post/*`, `/api/user/*`, `/api/myProfile/*`, `/api/messages/*` — all behind `authMiddleware`

---

## Database Schema

### User (`user.model.js`)
| Field              | Type       | Required | Default |
|--------------------|-----------|----------|---------|
| name               | String    | ✅       | —       |
| email              | String    | ✅ unique| —       |
| password           | String    | ✅       | —       |
| pic                | String    | ❌       | default avatar URL |
| followers          | [ObjectId → User] | ❌ | [] |
| following          | [ObjectId → User] | ❌ | [] |
| verifyOtp          | String    | ❌       | ""      |
| verifyOtpExpiry    | Date      | ❌       | 0       |
| isAccountVerified  | Boolean   | ❌       | false   |
| resetOtp           | String    | ❌       | ""      |
| resetOtpExpiry     | Date      | ❌       | 0       |
| createdAt          | Date      | ❌       | Date.now|

### Post (`post.model.js`)
| Field     | Type       | Required | Default |
|-----------|-----------|----------|---------|
| title     | String    | ✅       | —       |
| content   | String    | ✅       | —       |
| pic       | String    | ❌       | ""      |
| author    | ObjectId → User | ✅ | —       |
| createdAt | Date      | ❌       | Date.now|
| updatedAt | Date      | ❌       | —       |
| likes     | [ObjectId → User] | ❌ | [] |
| comments  | [{ author: ObjectId, content: String, createdAt: Date, name: String }] | ❌ | [] |

### Conversation (`conversation.model.js`)
| Field        | Type       | Notes |
|-------------|-----------|-------|
| participants | [ObjectId → User] | — |
| messages     | [ObjectId → Message] | — |
| timestamps   | auto (createdAt, updatedAt) | Mongoose `timestamps: true` |

### Message (`message.model.js`)
| Field      | Type       | Required |
|-----------|-----------|----------|
| senderId   | ObjectId → User | ✅ |
| receiverId | ObjectId → User | ✅ |
| message    | String    | ✅       |
| timestamps | auto | Mongoose `timestamps: true` |

---

## API Endpoints

### Auth (`/api/auth`) — PUBLIC
| Method | Path        | Controller      | Description |
|--------|------------|-----------------|-------------|
| POST   | /register  | register        | Create new user, send welcome email, generate OTP |
| POST   | /login     | login           | Authenticate, set JWT cookies |
| GET    | /logout    | logout          | Clear `token` cookie |
| GET    | /validate  | validate        | Check if token is valid |

### Posts (`/api/post`) — PROTECTED
| Method | Path                | Controller    | Description |
|--------|---------------------|--------------|-------------|
| POST   | /create             | createPost   | Create post (multipart, `pic` field) |
| GET    | /currentUser        | getUserPosts | Get logged-in user's posts |
| GET    | /getUserPosts/:userId | getUserPosts | Get any user's posts |
| GET    | /feed               | feedPosts    | Get posts from followed users |
| GET    | /search?q=          | searchPosts  | Search posts by title/content |
| GET    | /                   | getPosts     | Get all posts |
| GET    | /:id                | getPostById  | Get single post |
| PUT    | /update/:id         | updatePost   | Update post |
| PUT    | /:postId/like       | likePost     | Toggle like/unlike |
| POST   | /:postId/comment    | commentPost  | Add comment |
| DELETE | /:id                | deletePost   | Delete post |

### Users (`/api/user`) — PROTECTED
| Method | Path                    | Controller    | Description |
|--------|------------------------|--------------|-------------|
| GET    | /getAllUsers            | getAllUsers   | List all users |
| GET    | /me                    | inline handler | Get logged-in user info |
| GET    | /:id                   | getUser      | Get user by ID |
| PUT    | /:followUserId/follow  | followUser   | Follow a user |
| PUT    | /:unfollowUserId/unfollow | unfollowUser | Unfollow a user |
| PUT    | /:id                   | updateUser   | Update user profile |
| DELETE | /                      | deleteUser   | Delete own account |

### Profile (`/api/myProfile`) — PROTECTED
| Method | Path   | Controller  | Description |
|--------|--------|------------|-------------|
| GET    | /:id   | getProfile | Get user profile |

### Messages (`/api/messages`) — PROTECTED
| Method | Path         | Controller        | Description |
|--------|-------------|-------------------|-------------|
| GET    | /users      | getUsersForSidebar| Get all users (except self) |
| GET    | /:id        | getMessages       | Get conversation messages |
| POST   | /send/:id   | sendMessage       | Send message + emit via socket |

---

## Socket.io Events

| Event           | Direction     | Payload              | Description |
|----------------|--------------|----------------------|-------------|
| connection     | Client → Server | `query: { userId }` | Register user socket |
| disconnect     | Client → Server | —                   | Remove from online map |
| getOnlineUsers | Server → All   | `string[]` (userIds) | Broadcast online users |
| newMessage     | Server → Client | `Message` object    | Push new message to receiver |

---

## Environment Variables

| Variable               | Used In           | Status |
|-----------------------|-------------------|--------|
| PORT                  | server.js         | ✅ Defined |
| DB_Host               | dbConfig.js       | ✅ Defined |
| DB_Pass               | dbConfig.js       | ✅ Defined |
| DB_Name               | dbConfig.js       | ✅ Defined |
| JWT_SECRET            | authService, authMiddleware | ✅ Defined |
| JWT_REFRESH_SECRET    | authService, authMiddleware | ⚠️ **MISSING FROM .env** |
| NODE_ENV              | authService, authMiddleware | ✅ Defined |
| SMTP_USER             | authService       | ✅ Defined |
| SMTP_PASS             | .env only         | ✅ Defined but unused (nodemailer.js hardcodes Mailtrap) |
| SMTP_PORT             | .env only         | ✅ Defined but unused |
| SENDER_EMAIL          | .env only         | ✅ Defined but unused |
| CLOUDINARY_CLOUD_NAME | cloudinaryConfig  | ⚠️ **MISSING** (has hardcoded fallback) |
| CLOUDINARY_API_KEY    | cloudinaryConfig  | ⚠️ **MISSING** (has hardcoded fallback) |
| CLOUDINARY_API_SECRET | cloudinaryConfig  | ⚠️ **MISSING** (has hardcoded fallback) |

---

## Known Issues & Bugs (Critical)

### 🔴 P0 — Will Cause Errors

1. **Double response in auth controllers**: `authService.js` sends responses directly via `res.status().json()`, but `authController.js` also calls `res.status(result.status).json(result)`. This causes "Cannot set headers after they are sent" errors for login/logout/validate.

2. **`register` missing `res` param**: `authController.js` line 4 calls `registerUser(req.body)` but the service signature is `registerUser({ name, email, password, pic }, res)`. The service tries to call `res.status()` on `undefined`.

3. **`JWT_REFRESH_SECRET` missing from `.env`**: `authMiddleware.js` and `authService.js` use `process.env.JWT_REFRESH_SECRET` to sign/verify refresh tokens, but it's never defined. Refresh token operations will fail.

4. **`refreshAccessToken` verifies with wrong secret**: `authService.js` line 154 uses `JWT_SECRET` instead of `JWT_REFRESH_SECRET`.

5. **`post.model.js` comment `createdAt` bug**: Line 51 uses `Date.now()` (immediately invoked) instead of `Date.now` (function reference). All comments will share the same timestamp from server boot.

### 🟡 P1 — Security

6. **Hardcoded credentials in source**: `cloudinaryConfig.js` has API keys as fallback values. `nodemailer.js` has Mailtrap credentials hardcoded.

7. **`.env.sample` contains real credentials**: Should contain placeholder values only.

8. **`authMiddleware.js` logs entire `req` object**: Line 6 (`console.log(req)`) will dump massive output on every protected request.

### 🟠 P2 — Code Quality

9. **Duplicate bcrypt packages**: Both `bcrypt` and `bcryptjs` in dependencies. Only `bcryptjs` is imported.

10. **Wrong nodemailer package**: `node-mailer` (0.1.1) is installed instead of `nodemailer`. The import `import nodemailer from 'nodemailer'` likely resolves to the wrong package or fails.

11. **No message service**: `messageController.js` has DB queries directly — breaks the service layer pattern.

12. **`userController.js` line 30**: Template literal syntax error `$\`post for...\`` — should be backtick template literal.

13. **`console.log` in production paths**: 20+ instances across controllers, services, and middleware.

14. **CORS origins hardcoded in two places**: `app.js` and `server.js` both define CORS origins separately.

---

## Patterns in Use

| Pattern                    | Status |
|---------------------------|--------|
| Controller → Service → Model | ✅ Mostly followed (except messageController) |
| Route files per domain     | ✅ Followed |
| Auth via middleware         | ✅ Followed |
| ES Module imports          | ✅ Consistent |
| Named exports in services  | ✅ Consistent |
| Default export for models  | ✅ Consistent |
| camelCase naming           | ✅ Consistent |
| File naming: camelCase     | ✅ Consistent (except models use dot notation: `user.model.js`) |

---

## Code Style

- **Quotes**: Single quotes for strings
- **Semicolons**: Inconsistent (most files use them, some don't)
- **Indentation**: 4 spaces in models/services, 2 spaces in some controllers
- **Trailing commas**: Inconsistent
- **Exports**: Services use named exports, models/config use default exports
