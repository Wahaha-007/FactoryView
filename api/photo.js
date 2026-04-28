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

// Proxy for private Vercel Blob photos.
// Usage: /api/photo?path=machines/Blender.png
module.exports = async function handler(req, res) {
    // Auth check (mirrors doc.js)
    const cookieHeader = req.headers.cookie || '';
    const token      = getCookieValue(cookieHeader, 'auth_token');
    const roleCookie = getCookieValue(cookieHeader, 'auth_role') || '';
    const validRoles = ['admin', 'editor', 'viewer'];
    const role       = validRoles.includes(roleCookie) ? roleCookie : 'viewer';
    const secret     = process.env.AUTH_SECRET;

    if (!secret || !token || generateToken(secret, role) !== token) {
        return res.status(401).end();
    }

    const rawPath = decodeURIComponent(req.query.path || '');
    if (!rawPath || rawPath.includes('..')) {
        return res.status(400).end();
    }

    const blobBase  = process.env.BLOB_BASE_URL;
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobBase || !blobToken) {
        return res.status(500).json({ error: 'Blob not configured' });
    }

    // BLOB_BASE_URL may point to .public. subdomain; swap to .private. for authenticated access
    const privateBase = blobBase.replace('.public.blob.', '.private.blob.');
    const photoUrl = `${privateBase}/${rawPath}`;

    const blobRes = await fetch(photoUrl, {
        headers: { Authorization: `Bearer ${blobToken}` }
    });

    if (!blobRes.ok) return res.status(blobRes.status).end();

    const contentType = blobRes.headers.get('content-type') || 'image/png';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    const buf = await blobRes.arrayBuffer();
    res.send(Buffer.from(buf));
};
