# Product Requirements Document — Chattrix

> Auto-generated from codebase analysis on 2026-04-25. Reflects what IS built, what SHOULD work, and what's missing.

---

## Product Overview

**Chattrix** is a social media web application that combines microblogging (posts with text + images) with real-time direct messaging. Users can register, create posts, follow/unfollow other users, view a personalized feed, like and comment on posts, and chat in real-time via Socket.io.

**Stage**: MVP In Progress  
**Deployed**: Frontend on Vercel (`chattrix-nmlf.vercel.app`), Backend on Render (`chattrix-2.onrender.com`)

---

## Core Features

### 1. Authentication
| Requirement | Status | Notes |
|------------|--------|-------|
| User registration (name, email, password) | ✅ Built | Welcome email sent via Mailtrap |
| User login with JWT | ✅ Built | Access (15min) + refresh (7d) tokens in httpOnly cookies |
| Logout (clear cookies) | ✅ Built | — |
| Token validation endpoint | ✅ Built | `GET /api/auth/validate` |
| Auto-refresh expired access tokens | ✅ Built | Middleware handles transparent refresh |
| OTP-based email verification | 🔲 Schema exists, not implemented | Fields exist on User model, no routes/UI |
| Password reset via OTP | 🔲 Schema exists, not implemented | Fields exist on User model, no routes/UI |
| Protected routes on frontend | ⚠️ Built but disabled | `ProtectedRoute` component exists, commented out in `App.jsx` |

### 2. Posts / Feed
| Requirement | Status | Notes |
|------------|--------|-------|
| Create post (title, content, optional image) | ✅ Built | Image upload via Cloudinary |
| View all posts | ✅ Built | `GET /api/post/` |
| View personalized feed (posts from followed users) | ✅ Built | `GET /api/post/feed` |
| View single post | ✅ Built | `GET /api/post/:id` |
| Edit own post | ✅ Built | Via `window.prompt()` on Dashboard ⚠️ |
| Delete own post | ✅ Built | With confirmation dialog |
| View own posts on profile | ✅ Built | Grid layout on Profile page |
| Search posts by title/content | ✅ Built | Backend regex search, no frontend UI trigger |
| Client-side search filtering | ✅ Built | Dashboard filters feed by search term |

### 3. Social (Follow System)
| Requirement | Status | Notes |
|------------|--------|-------|
| Follow a user | ✅ Built | `PUT /api/user/:id/follow` |
| Unfollow a user | ✅ Built | `PUT /api/user/:id/unfollow` |
| View followers/following counts | ✅ Built | Displayed on Profile page |
| Follow button on feed posts | ⚠️ Partially | Button exists but `isFollowing` state isn't populated from API |

### 4. Engagement (Likes & Comments)
| Requirement | Status | Notes |
|------------|--------|-------|
| Like a post (toggle) | ✅ Built | Same endpoint for like/unlike |
| Like count display | ✅ Built | — |
| Flying heart animation | ✅ Built | DOM-based animation on like click |
| Dislike button | ⚠️ Misleading | "Dislike" button actually calls the same like toggle endpoint |
| Comment on a post | ✅ Built | With commenter name resolution |
| View comments (expandable) | ✅ Built | Collapsible comment section per post |

### 5. Real-time Messaging
| Requirement | Status | Notes |
|------------|--------|-------|
| View all users for chat | ✅ Built | Sidebar shows all users except self |
| Send direct message | ✅ Built | Creates conversation if none exists |
| Receive messages in real-time | ✅ Built | Socket.io `newMessage` event |
| Online status indicators | ✅ Built | Green dot for online users |
| Message timestamps | ✅ Built | — |
| Auto-scroll to latest message | ✅ Built | `useRef` + `scrollIntoView` |

### 6. User Profile
| Requirement | Status | Notes |
|------------|--------|-------|
| View own profile (name, email, avatar) | ✅ Built | — |
| Post count, follower/following counts | ✅ Built | — |
| Profile picture display | ✅ Built | Falls back to initial letter avatar |
| Edit profile | 🔲 Not built | Backend `PUT /api/user/:id` exists, no UI |
| Delete account | 🔲 Not built | Backend `DELETE /api/user/` exists, no UI |
| View other users' profiles | 🔲 Not built | No route or UI for `/profile/:userId` |

---

## Pages (Frontend)

| Page | Route | Status | Key Issues |
|------|-------|--------|------------|
| Login / Register | `/` | ✅ Working | Points to production URL, not `VITE_API_BASE_URL` |
| Dashboard (Feed) | `/dashboard` | ✅ Working | 562-line monolith, unprotected route |
| Create Post | `/create-post` | ✅ Working | Unprotected route |
| Profile | `/profile` | ✅ Working | Unprotected route, own profile only |
| Messages | `/messages` | ✅ Working | Socket URL hardcoded, unprotected route |

---

## What's NOT Built Yet (Feature Gaps)

1. **Email verification flow** — OTP fields exist in schema but no endpoints or UI
2. **Password reset flow** — Reset OTP fields exist but no endpoints or UI
3. **Edit profile UI** — Backend endpoint exists, no frontend form
4. **View other users' profiles** — No `/profile/:userId` route
5. **Notifications** — No notification system
6. **Delete account UI** — Backend endpoint exists, no frontend confirmation flow
7. **Image in messages** — Messages are text-only
8. **User search** — Can search posts but not users
9. **Post sharing / repost** — Not built
10. **Dark/light mode toggle** — Only dark mode exists

---

## Acceptance Criteria (for future features)

When implementing any new feature, it must:

1. Use the centralized API service (once created) — no direct axios calls in components
2. Have proper loading states (skeleton or spinner)
3. Have proper error handling (toast/banner, not `alert()`)
4. Work on mobile (responsive, sidebar collapses)
5. Follow the existing design system (CSS variables, glass effects, Tailwind utilities)
6. Be behind `ProtectedRoute` if it requires auth
7. Not introduce `console.log` in committed code
