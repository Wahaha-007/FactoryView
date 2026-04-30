// api/excel.js  — mirrors api/doc.js but for Excel files
const crypto = require('crypto');

function getCookieValue(header, name) { /* same as other api files */ }
function generateToken(secret, role) {
    return crypto.createHmac('sha256', secret).update(role).digest('hex');
}

const ALLOWED = new Set(['floor1data.xlsx','floor2data.xlsx','floor3data.xlsx',
                         'floor4data.xlsx','systemconfig.xlsx','scenepresets.xlsx']);

module.exports = async function handler(req, res) {
    const cookieHeader = req.headers.cookie;
    const token = getCookieValue(cookieHeader, 'authtoken');
    const roleCookie = getCookieValue(cookieHeader, 'authrole');
    const validRoles = ['admin','editor','viewer'];
    const role = validRoles.includes(roleCookie) ? roleCookie : 'viewer';
    const secret = process.env.AUTHSECRET;
    if (!secret || !token || generateToken(secret, role) !== token)
        return res.status(401).end();

    const filename = (req.query.file || '').replace(/[^a-zA-Z0-9.-]/g, '');
    if (!ALLOWED.has(filename)) return res.status(400).end();

    const blobBase = process.env.BLOB_BASE_URL;
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobBase || !blobToken) return res.status(500).end();

    const blobUrl = `${blobBase}factory/${filename}`;
    const blobRes = await fetch(blobUrl, { headers: { Authorization: `Bearer ${blobToken}` } });
    if (!blobRes.ok) return res.status(blobRes.status).end();

    const buf = await blobRes.arrayBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.send(Buffer.from(buf));
};