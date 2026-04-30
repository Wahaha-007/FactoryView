const crypto  = require('crypto');
const { list, put } = require('@vercel/blob');

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

module.exports = async function handler(req, res) {
    // Auth check
    const cookieHeader = req.headers.cookie || '';
    const token      = getCookieValue(cookieHeader, 'auth_token');
    const roleCookie = getCookieValue(cookieHeader, 'auth_role') || '';
    const validRoles = ['admin', 'editor', 'viewer'];
    const role       = validRoles.includes(roleCookie) ? roleCookie : 'viewer';
    const secret     = process.env.AUTH_SECRET;

    if (!secret || !token || generateToken(secret, role) !== token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = { token: false, read: false, write: false, writeUrl: null, error: null };

    result.token = !!process.env.BLOB_READ_WRITE_TOKEN;
    if (!result.token) {
        result.error = 'BLOB_READ_WRITE_TOKEN environment variable is not set';
        return res.status(200).json(result);
    }

    // Read test
    try {
        await list({ prefix: 'settings/', limit: 1 });
        result.read = true;
    } catch (e) {
        result.error = `Read failed: ${e.message}`;
        return res.status(200).json(result);
    }

    // Write test
    try {
        const blob = await put('settings/.keep', 'ok', {
            access: 'public',
            addRandomSuffix: false,
            contentType: 'text/plain',
        });
        result.write = true;
        result.writeUrl = blob.url;
    } catch (e) {
        result.error = `Write failed: ${e.message}`;
    }

    res.status(200).json(result);
};
