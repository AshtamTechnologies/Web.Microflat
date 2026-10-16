/**
 * sessionManager.js — Single-flight token refresh, proactive refresh timer, and cross-tab session sync.
 *
 * RULES:
 * 1. Single-flight: concurrent 401s share one in-flight refresh promise; no loops.
 * 2. Proactive refresh: scheduled ~60s before accessTokenExpiresOn; rescheduled after every refresh;
 *    cleared on logout.
 * 3. Tab visibility: on document visibilitychange to 'visible', re-check expiry and proactive schedule.
 * 4. Multi-tab logout sync: listens to 'storage' events on localStorage to synchronize logout across tabs.
 * 5. On refresh failure: clears tokens, redirects to /login with the return path, and emits ONE toast.
 * 6. Never decodes JWT in the app. Uses accessTokenExpiresOn for expiry and user.roles for the UI.
 */

import axios from 'axios';
import toast from 'react-hot-toast';
import { API_BASE_URL, TIMEOUT } from './apiConfig';
import {
  setAccessToken,
  getAccessToken,
  getAccessTokenExpiresOn,
  setRefreshToken,
  getRefreshToken,
  isRefreshTokenExpired,
  clearTokens,
} from './tokenStorage';
import { AUTH_ENDPOINTS } from '../services/auth/authEndpoints';

// In-flight refresh promise singleton
let refreshPromise = null;
let proactiveRefreshTimerId = null;
let hasShownExpiryToast = false;
let sessionFailureHandler = null;

/**
 * Registers an optional callback when a session terminates (e.g. to update React AuthContext state).
 * @param {(reason: string) => void} handler
 */
export function registerSessionFailureHandler(handler) {
  sessionFailureHandler = handler;
}

/**
 * Performs token refresh against /api/auth/refresh-token (single-flight).
 * Re-reads the refresh token directly from storage to support multi-tab token rotation.
 * @returns {Promise<string>} Resolves with new accessToken, or rejects with Error.
 */
export async function refreshAuthSession() {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      // 1. Re-read refresh token fresh from storage
      const refreshToken = getRefreshToken();

      if (!refreshToken || isRefreshTokenExpired()) {
        throw new Error('No valid refresh token available.');
      }

      // 2. Call refresh endpoint using raw axios to avoid interceptor recursion
      const response = await axios.post(
        `${API_BASE_URL}${AUTH_ENDPOINTS.REFRESH_TOKEN}`,
        { refreshToken },
        {
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          timeout: TIMEOUT,
        }
      );

      const data = response.data || {};
      const {
        tokenType = 'Bearer',
        accessToken,
        accessTokenExpiresOn,
        refreshToken: newRefreshToken,
        refreshTokenExpiresOn: newRefreshExpiresOn,
        user,
      } = data;

      if (!accessToken) {
        throw new Error('Refresh endpoint did not return an access token.');
      }

      // 3. Update memory access token & persistent refresh token
      setAccessToken(accessToken, accessTokenExpiresOn, tokenType);

      // Preserve existing storage mode (Remember me) when updating refresh token
      const isRemembered = window.localStorage.getItem('mf_remember_me') === 'true';
      setRefreshToken(newRefreshToken || refreshToken, newRefreshExpiresOn, isRemembered);

      // 4. Reset toast guard & schedule next proactive refresh
      hasShownExpiryToast = false;
      scheduleProactiveRefresh(accessTokenExpiresOn);

      return {
        accessToken,
        user,
      };
    } catch (err) {
      handleSessionExpiry();
      throw err;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Schedules a proactive token refresh ~60 seconds before accessTokenExpiresOn.
 * @param {string|null} expiresOnIso
 */
export function scheduleProactiveRefresh(expiresOnIso) {
  clearProactiveRefresh();

  if (!expiresOnIso) return;

  const expiryMs = new Date(expiresOnIso).getTime();
  if (Number.isNaN(expiryMs)) return;

  const nowMs = Date.now();
  // Refresh 60 seconds before expiry, or immediately if remaining time < 60s
  const leadTimeMs = 60 * 1000;
  const delayMs = Math.max(0, expiryMs - nowMs - leadTimeMs);

  proactiveRefreshTimerId = window.setTimeout(async () => {
    try {
      // Re-check before executing
      if (getRefreshToken() && !isRefreshTokenExpired()) {
        await refreshAuthSession();
      }
    } catch {
      // Handled inside refreshAuthSession
    }
  }, delayMs);
}

/**
 * Cancels any pending proactive refresh timer.
 */
export function clearProactiveRefresh() {
  if (proactiveRefreshTimerId) {
    window.clearTimeout(proactiveRefreshTimerId);
    proactiveRefreshTimerId = null;
  }
}

/**
 * Handles expired, invalid, or revoked sessions.
 * Clears storage, shows a single toast notification, and navigates to /login with return path.
 */
export function handleSessionExpiry() {
  clearProactiveRefresh();
  clearTokens();

  if (!hasShownExpiryToast) {
    hasShownExpiryToast = true;
    toast.error('Your session has expired. Please sign in again.');
  }

  if (sessionFailureHandler) {
    try {
      sessionFailureHandler('expired');
    } catch {
      /* ignore */
    }
  }

  // Redirect to /login preserving current pathname if not already on an auth page
  const currentPath = window.location.pathname;
  if (
    !currentPath.startsWith('/login') &&
    !currentPath.startsWith('/forgot-password') &&
    !currentPath.startsWith('/reset-password')
  ) {
    const returnUrl = encodeURIComponent(currentPath + window.location.search);
    window.location.href = `/login?returnUrl=${returnUrl}`;
  }
}

/**
 * Perform a clean logout: revokes server session, clears memory and web storage,
 * and notifies listeners.
 * @param {() => Promise<void>} [apiLogoutFn] - Optional call to POST /api/auth/logout
 */
export async function terminateSession(apiLogoutFn) {
  clearProactiveRefresh();

  try {
    if (typeof apiLogoutFn === 'function') {
      // If access token is already expired but refresh token exists, try quick refresh so server can revoke session
      const tokenExpiresOn = getAccessTokenExpiresOn();
      if (tokenExpiresOn && new Date(tokenExpiresOn).getTime() <= Date.now() && getRefreshToken()) {
        try {
          await refreshAuthSession();
        } catch {
          // Proceed with local logout regardless of refresh failure
        }
      }
      await apiLogoutFn();
    }
  } catch {
    // Always clear locally even if server revocation call fails
  } finally {
    clearTokens();
    if (sessionFailureHandler) {
      try {
        sessionFailureHandler('logout');
      } catch {
        /* ignore */
      }
    }
  }
}

/* ── Tab Visibility Change Listener ────────────────────────────────────────── */
// Background timers in inactive tabs are heavily throttled by browsers.
// When tab regains focus, check if the access token has expired or is nearing expiry.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const expiresOn = getAccessTokenExpiresOn();
      const hasToken = Boolean(getAccessToken());
      const hasRefresh = Boolean(getRefreshToken());

      if (hasRefresh) {
        if (!hasToken || !expiresOn) {
          // Access token not loaded in memory yet (e.g. reload or fresh tab)
          refreshAuthSession().catch(() => {});
        } else {
          const expiryMs = new Date(expiresOn).getTime();
          const nowMs = Date.now();
          // If expired or less than 60s remain, trigger refresh now
          if (expiryMs - nowMs <= 60 * 1000) {
            refreshAuthSession().catch(() => {});
          } else {
            // Re-schedule proactive refresh timer with accurate remaining time
            scheduleProactiveRefresh(expiresOn);
          }
        }
      }
    }
  });
}

/* ── Cross-Tab Storage Event Listener ─────────────────────────────────────── */
// When localStorage is modified in another tab (e.g. logout), synchronize this tab.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'mf_refresh_token' && !event.newValue) {
      // Token was removed in another tab -> logout this tab too
      clearProactiveRefresh();
      clearTokens();
      if (sessionFailureHandler) {
        sessionFailureHandler('remote_logout');
      }
      const currentPath = window.location.pathname;
      if (!currentPath.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
  });
}
