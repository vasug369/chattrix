const isProd = () => process.env.NODE_ENV === 'production';

// Frontend (Vercel) and backend (Render) live on different domains in production,
// so cookies must be sameSite:'None' + secure to survive a cross-site request.
// Locally both run on localhost, where 'Lax' + non-secure works over http.
export const accessTokenCookieOptions = () => ({
    httpOnly: true,
    secure: isProd(),
    sameSite: isProd() ? 'None' : 'Lax',
    maxAge: 15 * 60 * 1000, // 15 min
});

export const refreshTokenCookieOptions = () => ({
    httpOnly: true,
    secure: isProd(),
    sameSite: isProd() ? 'None' : 'Lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});
