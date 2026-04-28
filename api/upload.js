const crypto = require('crypto');
const { put }  = require('@vercel/blob');

// Disable Vercel's default body parser — we need the raw binary stream
module.exports.config = { api: { bodyParser: false } };

const ALLOWED_FILES = new Set([
    'floor_1_data.xlsx',
    'floor_2_data.xlsx',
    'system_config.xlsx',
    'scene_presets.xlsx',
]);

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
    if (req.method !== 'POST') return res.status(405).end();

    // Auth check (mirrors doc.js)
    const cookieHeader = req.headers.cookie || '';
    const token      = getCookieValue(cookieHeader, 'auth_token');
    const roleCookie = getCookieValue(cookieHeader, 'auth_role') || '';
    const validRoles = ['admin', 'editor', 'viewer'];
    const role       = validRoles.includes(roleCookie) ? roleCookie : 'viewer';
    const secret     = process.env.AUTH_SECRET;

    if (!secret || !token || generateToken(secret, role) !== token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate filename query param
    const filename = (req.query.file || '').replace(/[^a-zA-Z0-9._-]/g, '');
    if (!ALLOWED_FILES.has(filename)) {
        return res.status(400).json({ error: 'Invalid file name' });
    }

    if (!process.env.VERCEL) {
        return res.status(501).json({ error: 'Upload is only available on Vercel' });
    }

    // Read raw binary body from stream
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    if (buffer.length === 0) {
        return res.status(400).json({ error: 'Empty file' });
    }

    // Upload to Vercel Blob with a stable path (no random suffix)
    const blob = await put(`factory/${filename}`, buffer, {
        access: 'public',
        addRandomSuffix: false,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    res.status(200).json({ url: blob.url, filename });
};
