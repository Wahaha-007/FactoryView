const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');

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
    // 1. Auth check (mirrors middleware.js)
    const cookieHeader = req.headers.cookie || '';
    const token      = getCookieValue(cookieHeader, 'auth_token');
    const roleCookie = getCookieValue(cookieHeader, 'auth_role') || '';
    const validRoles = ['admin', 'editor', 'viewer'];
    const role       = validRoles.includes(roleCookie) ? roleCookie : 'viewer';
    const secret     = process.env.AUTH_SECRET;

    if (!secret || !token || generateToken(secret, role) !== token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // 2. Sanitize path
    const segments = req.query.path || [];
    const relPath  = (Array.isArray(segments) ? segments : [segments]).join('/');
    if (!relPath || relPath.includes('..')) {
        return res.status(400).json({ error: 'Invalid path' });
    }

    // 3a. Local development — read from filesystem
    if (!process.env.VERCEL) {
        const localPath = path.join(process.cwd(), 'assets', 'docs', relPath);
        if (!fs.existsSync(localPath)) return res.status(404).end();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Cache-Control', 'private, max-age=3600');
        return res.send(fs.readFileSync(localPath));
    }

    // 3b. Vercel — fetch from private Blob
    const blobBase  = process.env.BLOB_BASE_URL;
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobBase || !blobToken) {
        return res.status(500).json({ error: 'Blob not configured' });
    }

    const blobUrl = `${blobBase}/docs/${relPath}`;
    const blobRes = await fetch(blobUrl, {
        headers: { Authorization: `Bearer ${blobToken}` }
    });
    if (!blobRes.ok) return res.status(blobRes.status).end();

    const buf = await blobRes.arrayBuffer();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(Buffer.from(buf));
};
