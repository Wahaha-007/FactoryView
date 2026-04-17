/**
 * Vercel Serverless Function — POST /api/auth
 * Validates username + password, sets HMAC auth cookie on success.
 *
 * Required Environment Variables (set in Vercel Dashboard):
 *   ADMIN_PASSWORD   — password for the 'admin' user
 *   EDITOR_PASSWORD  — password for the 'editor' user
 *   VIEWER_PASSWORD  — password for the 'viewer' user
 *   AUTH_SECRET      — a long random secret for HMAC signing (e.g. 64-char hex string)
 */

const crypto = require('crypto');

function generateToken(secret, role) {
  return crypto
    .createHmac('sha256', secret)
    .update(role)
    .digest('hex');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const { username, password } = body || {};
  const AUTH_SECRET = process.env.AUTH_SECRET;

  if (!AUTH_SECRET) {
    console.error('[auth] Missing env var: AUTH_SECRET');
    return res.status(500).json({ error: 'Server is not configured correctly. Check Vercel environment variables.' });
  }

  const USERS = {
    admin:  { password: process.env.ADMIN_PASSWORD,  role: 'admin'  },
    editor: { password: process.env.EDITOR_PASSWORD, role: 'editor' },
    viewer: { password: process.env.VIEWER_PASSWORD, role: 'viewer' },
  };

  const user = USERS[username];

  if (!user || !user.password || user.password !== password) {
    await new Promise(r => setTimeout(r, 600));
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const token  = generateToken(AUTH_SECRET, user.role);
  const maxAge = 60 * 60 * 24 * 7; // 7 days

  res.setHeader('Set-Cookie', [
    `auth_token=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`,
    `auth_role=${user.role}; Path=/; Secure; SameSite=Strict; Max-Age=${maxAge}`,
  ]);

  return res.status(200).json({ success: true, role: user.role });
};
