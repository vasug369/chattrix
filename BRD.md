# Business Requirements Document — Chattrix

> Version 1.0 · Created 2026-04-25 · Derived from codebase analysis + market positioning

---

## 1. Business Vision

**Chattrix** is a community-first social platform targeting niche creator communities (college campuses, indie developer circles, hobby groups) — a segment underserved by Instagram/Twitter's algorithm-driven feeds. The core value proposition: **your feed shows content from people you chose to follow, in chronological order, with zero algorithmic interference.**

### Positioning Statement
> For small-to-mid community builders who are frustrated by algorithmic feeds and pay-to-reach models, Chattrix is a social platform that guarantees organic reach to followers, combines microblogging with real-time DMs, and monetizes through creator tools — not user attention.

### Competitive Landscape

| Platform | Weakness Chattrix Exploits |
|----------|---------------------------|
| Twitter/X | Algorithmic feed, paid verification, hostile UX |
| Instagram | Reels-first, suppresses text content, requires business account for analytics |
| Discord | Not public-facing, no feed concept, overwhelming for casual users |
| Mastodon | Fragmented servers, confusing onboarding, no DMs done well |

---

## 2. Revenue Model — "Creator-Funded, Not Ad-Funded"

### Guiding Principle
> Users are the community, not the product. Revenue comes from creators who want enhanced tools, not from selling user attention to advertisers.

---

### Tier 1: Free (Core Platform)
**Cost**: ₹0 / $0 — forever free

| Feature | Included |
|---------|----------|
| Account registration + profile | ✅ |
| Create unlimited text posts | ✅ |
| Image uploads (up to 5MB per post) | ✅ |
| Follow/unfollow users | ✅ |
| Chronological feed | ✅ |
| Like + comment on posts | ✅ |
| Real-time DMs (1-on-1) | ✅ |
| Online status indicators | ✅ |

**Purpose**: Build the user base. All social features are free. No feature walls on communication.

---

### Tier 2: Chattrix Pro (₹149/month or ₹1,299/year · ~$1.79/mo or $15.59/yr)
**Target**: Power users, micro-influencers, college community leaders

| Feature | Description |
|---------|-------------|
| 🔵 **Pro Badge** | Verified blue accent ring on avatar across all posts and DMs |
| 📊 **Post Analytics** | Views, engagement rate, follower growth chart, best posting times |
| 📌 **Pinned Posts** | Pin up to 3 posts to top of your profile |
| 🎨 **Custom Profile Themes** | Choose accent color, custom bio section with links |
| 📸 **HD Image Uploads** | Up to 20MB per post, HEIC/RAW support |
| 💬 **Group DMs** | Create group chats (up to 25 members) |
| 🔒 **Exclusive Posts** | Mark posts as "Followers Only" (non-followers see a preview) |
| 📤 **Export Data** | Download your posts, comments, and analytics as CSV |

**Projected conversion**: 3–5% of active users (industry avg for social freemium)

---

### Tier 3: Chattrix for Communities (₹499/month or ₹4,499/year · ~$5.99/mo or $53.99/yr)
**Target**: College clubs, dev communities, hobby groups, small brands

| Feature | Description |
|---------|-------------|
| 🏠 **Community Page** | Branded landing page with custom name, logo, description |
| 👥 **Member Management** | Invite links, approve/reject members, assign moderators |
| 📢 **Announcements** | Broadcast posts to all community members with push notification |
| 📅 **Events** | Create events with RSVP, date/time, location or virtual link |
| 🗳️ **Polls** | Create polls within the community feed |
| 📊 **Community Analytics** | Member growth, top contributors, engagement trends |
| 🔇 **Moderation Tools** | Mute/ban members, content reporting, word filters |
| 🔗 **Custom Invite Links** | Branded `chattrix.app/c/your-community` URLs |

**Projected conversion**: 1–2% of active users / organic community formation

---

### Tier 4: Tipping & Creator Monetization (Platform takes 5% cut)
**Target**: Creators who want to earn from their audience

| Feature | Description |
|---------|-------------|
| 💰 **Tips** | Followers can send ₹10–₹500 tips on any post |
| ⭐ **Supporter Badge** | Tippers get a badge visible on their comments |
| 💳 **Payment Integration** | Razorpay (India) / Stripe (Global) |
| 📊 **Earnings Dashboard** | Track tips received, payout history, top supporters |

**Revenue**: Chattrix takes a **5% platform fee** on every tip. Creator gets 95%.

**Example**: If 1,000 creators average ₹2,000/month in tips → Platform earns ₹1,00,000/month (₹12L/year).

---

## 3. Revenue Projections

### Assumptions (Year 1)
| Metric | Value | Rationale |
|--------|-------|-----------|
| Total registered users (end of Y1) | 50,000 | Organic growth via college communities |
| Monthly active users (MAU) | 15,000 (30%) | Industry avg for new social platforms |
| Pro subscribers | 600 (4% of MAU) | Conservative freemium conversion |
| Community subscribers | 150 (1% of MAU) | Niche but high-value segment |
| Active tipping creators | 200 | Subset of Pro users |
| Avg tips per creator/month | ₹1,500 | Micro-tipping model |

### Year 1 Revenue Estimate

| Stream | Monthly | Annual |
|--------|---------|--------|
| Pro subscriptions (600 × ₹149) | ₹89,400 | ₹10,72,800 |
| Community subscriptions (150 × ₹499) | ₹74,850 | ₹8,98,200 |
| Tipping platform fee (200 × ₹1,500 × 5%) | ₹15,000 | ₹1,80,000 |
| **Total** | **₹1,79,250/mo** | **₹21,51,000/yr** |

> ~$25,800/year in Year 1. Not venture-scale, but **profitable for a bootstrapped MVP** with <₹5,000/month hosting costs (Render free tier + Vercel free tier + MongoDB Atlas free tier).

### Year 2 Scaling Targets (10x users)

| Stream | Annual (projected) |
|--------|-------------------|
| Pro (6,000 users) | ₹1,07,28,000 |
| Communities (1,500 orgs) | ₹89,82,000 |
| Tipping (2,000 creators) | ₹18,00,000 |
| **Total** | **₹2,15,10,000/yr (~$25,800 → $258,000)** |

---

## 4. Cost Structure

### Current (MVP — Near Zero)

| Item | Monthly Cost |
|------|-------------|
| Backend hosting (Render free) | ₹0 |
| Frontend hosting (Vercel free) | ₹0 |
| MongoDB Atlas (free tier, 512MB) | ₹0 |
| Cloudinary (free tier, 25GB bandwidth) | ₹0 |
| Domain (chattrix.app) | ~₹100/mo amortized |
| **Total** | **~₹100/mo** |

### At Scale (10K+ MAU)

| Item | Monthly Cost |
|------|-------------|
| Backend hosting (Render Starter) | ₹600 |
| MongoDB Atlas (M10) | ₹4,200 |
| Cloudinary (Plus plan) | ₹7,500 |
| Email service (Brevo paid) | ₹1,500 |
| Domain + SSL | ₹100 |
| Payment gateway fees (Razorpay) | 2% of tip volume |
| **Total** | **~₹14,000/mo** |

> **Break-even point**: ~100 Pro subscribers (100 × ₹149 = ₹14,900 > ₹14,000 costs)

---

## 5. Implementation Priority for Monetization

### Phase 1 — Foundation (Before any revenue features)
> **Must fix the existing bugs first.** No one pays for a broken product.
> **Status (2026-07-19): Complete.** See PRD.md for the full list of fixes verified in this pass — this went well beyond the five items below (feed correctness bug, OTP/password leaks, cross-site cookie bug, dependency vulnerabilities, email verification, password reset, and more).

- [x] Fix auth controller/service double-response bug
- [x] Add `JWT_REFRESH_SECRET` to `.env`
- [x] Create centralized API service on frontend
- [x] Re-enable `ProtectedRoute`
- [x] Remove hardcoded credentials from source

### Phase 2 — Pro Tier (Month 1–2)
Backend + frontend work needed:

| Feature | Backend Changes | Frontend Changes |
|---------|----------------|-----------------|
| Pro badge | Add `isPro: Boolean` + `proExpiresAt: Date` to User schema | Render badge on avatar component |
| Pinned posts | Add `isPinned: Boolean` to Post schema, limit 3 per user | Pin/unpin button on own posts, pinned section on profile |
| Post analytics | New `PostView` model, track views via middleware | Analytics dashboard component |
| Custom profile themes | Add `themeColor: String` to User schema | Color picker in profile edit |

### Phase 3 — Tipping (Month 2–3)
| Feature | Work Required |
|---------|--------------|
| Razorpay integration | New `payment/` route + service, Razorpay SDK |
| Tip button on posts | New component, payment modal |
| Earnings dashboard | New `Tip` model, aggregation queries |
| Payout system | Manual initially (bank transfer), automate later |

### Phase 4 — Communities (Month 3–5)
| Feature | Work Required |
|---------|--------------|
| Community model | New `Community` schema (name, logo, members, admins, settings) |
| Community feed | Filtered post queries by community membership |
| Invite system | Unique invite links, join/leave flow |
| Moderation | Report model, admin actions (mute/ban/delete) |

---

## 6. Business Rules & Constraints

### Non-Negotiable Rules

| Rule | Rationale |
|------|-----------|
| No algorithmic feed — always chronological | Core differentiator. The moment we add an algorithm, we become another Instagram. |
| No ads — ever | Trust signal. "We don't sell your attention" is the brand. |
| Free tier must include ALL social features | Communication is the moat. Gate tools, not connections. |
| Creator tips: 95% to creator, 5% to platform | Competitive with YouTube (70/30) and Patreon (88-95/5-12). |
| No data selling | Privacy-first positioning. Explicitly state in ToS. |
| GDPR/IT Act compliant data handling | Required for India + EU markets |

### Content Policy (to be enforced)

| Category | Policy |
|----------|--------|
| Hate speech | Zero tolerance, permanent ban |
| NSFW content | Not allowed in MVP (no age verification system) |
| Spam / bot accounts | Rate limiting + manual review |
| Copyright infringement | DMCA takedown process required before scaling |
| Data retention | Users can delete account + all data (GDPR right to erasure) |

---

## 7. Key Metrics to Track

### North Star Metric
**Daily Active Conversations** (messages sent + comments posted) — measures real engagement, not vanity.

### Supporting Metrics

| Category | Metric | Target (Y1) |
|----------|--------|-------------|
| Growth | Monthly signups | 4,000/mo by month 12 |
| Activation | % who post within 24h of signup | >25% |
| Retention | Day-7 return rate | >40% |
| Engagement | Avg posts per active user/week | >2 |
| Engagement | Avg messages per active user/day | >5 |
| Revenue | Monthly recurring revenue (MRR) | ₹1.5L by month 12 |
| Revenue | Pro conversion rate | >3% of MAU |
| Revenue | Churn rate (Pro) | <8%/month |

---

## 8. Stakeholder Decisions Needed

| Decision | Options | Recommendation |
|----------|---------|----------------|
| Payment gateway | Razorpay vs Stripe vs both | **Razorpay first** (India focus), add Stripe for global in Phase 4 |
| Mobile app | React Native vs PWA vs native | **PWA first** (zero extra code, Vite supports it), native later |
| Community hosting | Same DB vs separate tenant DBs | **Same DB** with community ID filtering (simpler, MVP-appropriate) |
| Moderation at scale | Manual vs AI-assisted | **Manual first**, add AI content moderation API when >10K MAU |
| Pricing currency | INR-only vs multi-currency | **INR for India launch**, auto-convert via Stripe for international |
