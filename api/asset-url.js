const crypto = require('crypto');

function getCookieValue(header, name) {
    if (!header) return null;
    for (const part of header.split(';')) {
        const eq = part.trim().indexOf('=');
        if (eq === -1) continue;
        if (part.trim().slice(0, eq).trim() === name)
            return decodeURIComponent(part.trim().slice(eq + 1).trim());
    }
    return null;
}

function generateToken(secret, role) {
    return crypto.createHmac('sha256', secret).update(role).digest('hex');
}

// Returns the Vercel Blob base URL so the client can construct and try blob URLs.
// Returns null if blob is not configured (local dev).
module.exports = async function handler(req, res) {
    const cookieHeader = req.headers.cookie || '';
    const token      = getCookieValue(cookieHeader, 'auth_token');
    const roleCookie = getCookieValue(cookieHeader, 'auth_role') || '';
    const validRoles = ['admin', 'editor', 'viewer'];
    const role       = validRoles.includes(roleCookie) ? roleCookie : 'viewer';
    const secret     = process.env.AUTH_SECRET;

    if (!secret || !token || generateToken(secret, role) !== token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const blobBase = process.env.BLOB_BASE_URL || null;
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.json({ blobBase });
};
