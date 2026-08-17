// Minimal JWT decoder for client-side session restoration.
// Decoding here is ONLY for reading claims (sub, scope, exp) to drive UI/session state.
// This is NOT a security verification — the backend is the only source of truth.
// Signature verification happens on the backend (see user-service CustomJwtDecoder).

function base64UrlDecode(input) {
  if (!input) return '';
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4;
  const full = pad ? padded + '='.repeat(4 - pad) : padded;
  if (typeof atob === 'function') {
    try {
      return decodeURIComponent(
        atob(full)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    } catch (e) {
      return '';
    }
  }
  return '';
}

export function decodeJwt(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const payload = base64UrlDecode(parts[1]);
  if (!payload) return null;
  try {
    return JSON.parse(payload);
  } catch (e) {
    return null;
  }
}

// Returns true when the token has expired (exp is in seconds).
// Tokens without an exp claim are treated as valid (caller decides).
export function isJwtExpired(claims, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!claims || typeof claims.exp !== 'number') return false;
  return claims.exp <= nowSeconds;
}
