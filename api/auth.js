/**
 * Vercel Serverless Function — POST /api/auth
 * Validates username + password, sets HMAC auth cookie on success.
 *
 * Required Environment Variables (set in Vercel Dashboard):
 *   APP_USERNAME  — the login username
 *   APP_PASSWORD  — the login password
 *   AUTH_SECRET   — a long random secret for HMAC signing (e.g. 64-char hex string)
 */

const crypto = require('crypto');

function generateToken(secret) {
  return crypto
    .createHmac('sha256', secret)
    .update('authenticated')
    .digest('hex');
}

module.exports = async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Parse body — Vercel auto-parses JSON when Content-Type is application/json
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const { username, password } = body || {};

  // Read credentials from env vars
  const APP_USERNAME = process.env.APP_USERNAME;
  const APP_PASSWORD = process.env.APP_PASSWORD;
  const AUTH_SECRET  = process.env.AUTH_SECRET;

  if (!APP_USERNAME || !APP_PASSWORD || !AUTH_SECRET) {
    console.error('[auth] Missing env vars: APP_USERNAME / APP_PASSWORD / AUTH_SECRET');
    return res.status(500).json({ error: 'Server is not configured correctly. Check Vercel environment variables.' });
  }

  const isValid = username === APP_USERNAME && password === APP_PASSWORD;

  if (!isValid) {
    // Small delay to slow brute-force attempts
    await new Promise(r => setTimeout(r, 600));
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  // Generate HMAC token and set HttpOnly cookie (7 days)
  const token = generateToken(AUTH_SECRET);
  const maxAge = 60 * 60 * 24 * 7; // 7 days in seconds

  res.setHeader(
    'Set-Cookie',
    `auth_token=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`
  );

  return res.status(200).json({ success: true });
};
