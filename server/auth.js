const crypto = require('crypto');

const SESSION_SECRET = process.env.SESSION_SECRET || 'insecure-default-secret-change-me';
const TOKEN_LIFETIME_MS = 12 * 60 * 60 * 1000; // 12 hours

function sign(expiry) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(String(expiry)).digest('hex');
}

function issueToken() {
  const expiry = Date.now() + TOKEN_LIFETIME_MS;
  return `${expiry}.${sign(expiry)}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return false;
  const [expiryStr, sig] = token.split('.');
  const expiry = Number(expiryStr);
  if (!Number.isFinite(expiry) || Date.now() > expiry) return false;
  const expected = sign(expiry);
  const sigBuf = Buffer.from(sig, 'hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  if (sigBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expectedBuf);
}

function requireEditToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!verifyToken(token)) {
    return res.status(401).json({ error: 'Invalid or expired edit session. Please log in again.' });
  }
  next();
}

function hashPasscode(passcode, salt) {
  return crypto.scryptSync(passcode, salt, 64);
}

function verifyPasscode(candidate) {
  const hashHex = process.env.EDIT_PASSCODE_HASH;
  const salt = process.env.EDIT_PASSCODE_SALT;
  if (!hashHex || !salt || typeof candidate !== 'string' || !candidate) return false;

  const storedHash = Buffer.from(hashHex, 'hex');
  const candidateHash = hashPasscode(candidate, salt);
  if (storedHash.length !== candidateHash.length) return false;
  return crypto.timingSafeEqual(storedHash, candidateHash);
}

module.exports = { issueToken, verifyToken, requireEditToken, hashPasscode, verifyPasscode };
