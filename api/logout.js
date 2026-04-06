/**
 * Vercel Serverless Function — GET /api/logout
 * Clears the auth cookie and redirects to the login page.
 */
module.exports = function handler(req, res) {
  res.setHeader(
    'Set-Cookie',
    'auth_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'
  );
  res.redirect(302, '/login.html');
};
