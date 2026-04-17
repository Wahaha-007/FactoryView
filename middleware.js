/**
 * Vercel Edge Middleware — Auth Guard
 * Runs before every request (except login page + API).
 * Verifies the HMAC token in the auth_token cookie.
 */

export const config = {
  // Protect everything EXCEPT login.html, /api/, and Vercel internals
  matcher: ['/((?!login\\.html$|api/|_vercel|favicon\\.ico).*)'],
};

// --- Helpers ---

function getCookieValue(cookieHeader, name) {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const k = trimmed.slice(0, eqIdx).trim();
    const v = trimmed.slice(eqIdx + 1).trim();
    if (k === name) return decodeURIComponent(v);
  }
  return null;
}

async function computeExpectedToken(secret, role) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(role));
  return Array.from(new Uint8Array(sigBuf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Constant-time string comparison to prevent timing attacks
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// --- Main Middleware ---

export default async function middleware(request) {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    // Not configured — block access and show a clear error
    return new Response(
      '<h2>Server Error</h2><p>AUTH_SECRET environment variable is not set in Vercel.</p>',
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }

  const cookieHeader = request.headers.get('cookie');
  const token = getCookieValue(cookieHeader, 'auth_token');

  if (!token) {
    return Response.redirect(new URL('/login.html', request.url), 302);
  }

  // Extract role from auth_role cookie; fall back to 'viewer' if missing/invalid
  const validRoles = ['admin', 'editor', 'viewer'];
  const roleCookie = getCookieValue(cookieHeader, 'auth_role') || '';
  const role = validRoles.includes(roleCookie) ? roleCookie : 'viewer';

  const expected = await computeExpectedToken(secret, role);

  if (!timingSafeEqual(token, expected)) {
    return Response.redirect(new URL('/login.html', request.url), 302);
  }

  // ✅ Authenticated — pass through to static file (return nothing = next)
}
