# Security Policy

## Reporting a vulnerability

**Do not open a public issue for a security problem.**

Report it privately through GitHub: go to the repository's **Security** tab and choose **Report a vulnerability**.

Please include:

- what the issue is and where (endpoint, page or file)
- steps to reproduce
- the impact you expect (for example, reading another user's messages)

### What to expect

| Step | Target time |
|---|---|
| Acknowledge your report | 3 days |
| First assessment | 7 days |
| Fix for a confirmed high or critical issue | 30 days |

You will be credited in the fix unless you ask not to be.

### Scope

**In scope:** this repository, `www.chattrix.online` and `api.chattrix.online`.

**Out of scope:**

- denial-of-service or load testing
- social engineering or phishing
- physical attacks
- issues in third-party services (Vercel, MongoDB Atlas, Cloudinary) themselves
- reports from automated scanners without a working proof

Test only against your own accounts. Do not access, change or delete other users' data. Good-faith research within these rules will not face action from us.

## Supported versions

Only the current `main` branch, which is what runs in production, receives security fixes.

## How Chattrix protects users

- **Sessions:** httpOnly, `Secure`, first-party cookies. Short-lived access token, rotating refresh token. Each device is a revocable session; a password reset signs out every device.
- **Authorization:** decided on the server. The user id always comes from the session, never from the request. Ownership is checked on every edit and delete.
- **Input:** every endpoint validates its input with a Zod schema; unknown fields are rejected where data reaches the database.
- **Abuse limits:** rate limits on auth, one-time codes, writes and the whole API.
- **Real-time:** the Socket.io handshake is authenticated by the session cookie, and a revoked session loses its socket.
- **Passwords:** hashed with bcrypt. Google sign-in verifies the token audience and requires a verified email.
- **Headers:** Helmet sets secure HTTP headers. CORS allows only listed origins.
- **Secrets:** read from environment variables only and validated at startup. No credentials in code.

## Rules for contributors

- Never commit secrets, `.env` files, tokens, private keys or personal data. Check every diff before committing.
- A secret that reaches git, even briefly, is treated as leaked and rotated at the provider.
- Every new endpoint ships with authorization tests (unauthenticated and other-user cases).
- New dependencies must be maintained and justified in the PR.
- Changes are checked against the OWASP Top 10 for web and API.
