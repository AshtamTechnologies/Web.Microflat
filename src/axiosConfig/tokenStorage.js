/**
 * tokenStorage.js — Secure token storage boundary.
 *
 * RULES:
 * 1. The ACCESS TOKEN and its expiry (accessTokenExpiresOn) live in MEMORY ONLY.
 *    They are NEVER stored in localStorage or sessionStorage.
 * 2. The REFRESH TOKEN and its expiry (refreshTokenExpiresOn) live in:
 *    - localStorage (if "Remember me" was enabled at login)
 *    - sessionStorage (if "Remember me" was disabled)
 * 3. SECURITY NOTE:
 *    Using an httpOnly, SameSite=Strict cookie set by the backend server for the
 *    refresh token is the recommended and safer long-term architectural pattern.
 *    Until the backend supports cookie-based refresh tokens, this isolated module
 *    minimizes exposure by keeping access tokens purely in memory and restricting
 *    web storage strictly to the refresh token.
 */

const REFRESH_TOKEN_KEY = 'mf_refresh_token';
const REFRESH_EXPIRES_KEY = 'mf_refresh_expires_on';
const REMEMBER_ME_KEY = 'mf_remember_me';

// In-memory access token cache
let inMemoryAccessToken = null;
let inMemoryAccessTokenExpiresOn = null;
let inMemoryTokenType = 'Bearer';

/**
 * Sets access token and metadata in memory only.
 * @param {string|null} token
 * @param {string|null} expiresOn - ISO date-time string
 * @param {string} [tokenType='Bearer']
 */
export function setAccessToken(token, expiresOn, tokenType = 'Bearer') {
  inMemoryAccessToken = token || null;
  inMemoryAccessTokenExpiresOn = expiresOn || null;
  inMemoryTokenType = tokenType || 'Bearer';
}

/**
 * Gets the current in-memory access token.
 * @returns {string|null}
 */
export function getAccessToken() {
  return inMemoryAccessToken;
}

/**
 * Gets the in-memory access token expiry ISO string.
 * @returns {string|null}
 */
export function getAccessTokenExpiresOn() {
  return inMemoryAccessTokenExpiresOn;
}

/**
 * Gets the in-memory token type.
 * @returns {string}
 */
export function getTokenType() {
  return inMemoryTokenType;
}


/**
 * Saves the refresh token and its expiry.
 * @param {string} refreshToken
 * @param {string} refreshTokenExpiresOn - ISO date-time string
 * @param {boolean} [rememberMe=false]
 */
export function setRefreshToken(refreshToken, refreshTokenExpiresOn, rememberMe = false) {
  // Clear any existing tokens from opposite storage
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_EXPIRES_KEY);
  window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  window.sessionStorage.removeItem(REFRESH_EXPIRES_KEY);

  if (!refreshToken) {
    window.localStorage.removeItem(REMEMBER_ME_KEY);
    return;
  }

  const storage = rememberMe ? window.localStorage : window.sessionStorage;
  storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  if (refreshTokenExpiresOn) {
    storage.setItem(REFRESH_EXPIRES_KEY, refreshTokenExpiresOn);
  }
  if (rememberMe) {
    window.localStorage.setItem(REMEMBER_ME_KEY, 'true');
  } else {
    window.localStorage.removeItem(REMEMBER_ME_KEY);
  }
}

/**
 * Retrieves the refresh token from whichever storage currently holds it.
 * Re-reads from storage each time to catch tokens rotated in another tab.
 * @returns {string|null}
 */
export function getRefreshToken() {
  const local = window.localStorage.getItem(REFRESH_TOKEN_KEY);
  if (local) return local;
  return window.sessionStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Retrieves the refresh token expiry ISO date-time.
 * @returns {string|null}
 */
export function getRefreshTokenExpiresOn() {
  const local = window.localStorage.getItem(REFRESH_EXPIRES_KEY);
  if (local) return local;
  return window.sessionStorage.getItem(REFRESH_EXPIRES_KEY);
}

/**
 * Checks whether a valid (non-empty) refresh token exists in storage.
 * @returns {boolean}
 */
export function hasRefreshToken() {
  return Boolean(getRefreshToken());
}

/**
 * Checks if the stored refresh token has already expired based on its timestamp.
 * @returns {boolean}
 */
export function isRefreshTokenExpired() {
  const expiresOn = getRefreshTokenExpiresOn();
  if (!expiresOn) return false;
  const expiryTime = new Date(expiresOn).getTime();
  if (Number.isNaN(expiryTime)) return false;
  return Date.now() >= expiryTime;
}

/**
 * Clears all tokens from memory and both web storages.
 */
export function clearTokens() {
  inMemoryAccessToken = null;
  inMemoryAccessTokenExpiresOn = null;
  inMemoryTokenType = 'Bearer';

  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_EXPIRES_KEY);
  window.localStorage.removeItem(REMEMBER_ME_KEY);

  window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  window.sessionStorage.removeItem(REFRESH_EXPIRES_KEY);
}
