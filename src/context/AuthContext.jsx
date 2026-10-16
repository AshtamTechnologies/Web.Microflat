/**
 * AuthContext.jsx — Authentication context & session lifecycle manager.
 *
 * Rules:
 *   - Access token lives in memory only.
 *   - Refresh token lives in localStorage ("Remember me") or sessionStorage.
 *   - On page reload: if refresh token exists, refreshes session and restores user.
 *   - On login: saves tokens, schedules proactive refresh, sets user immediately.
 *   - On logout: revokes server session, clears memory and web storage, clears timers.
 *   - Tracks mustChangePassword for password rotation enforcement.
 */

/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authService } from '../services';
import {
  setAccessToken,
  setRefreshToken,
  hasRefreshToken,
  isRefreshTokenExpired,
  clearTokens,
} from '../axiosConfig/tokenStorage';
import {
  scheduleProactiveRefresh,
  clearProactiveRefresh,
  terminateSession,
  refreshAuthSession,
  registerSessionFailureHandler,
} from '../axiosConfig/sessionManager';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  const navigate = useNavigate();

  // ── Session Restore on initial app mount / reload ─────────────────────────
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      // Register session failure callback from sessionManager
      registerSessionFailureHandler((reason) => {
        if (!isMounted) return;
        setUser(null);
        setMustChangePassword(false);
        if (reason === 'remote_logout') {
          toast('You were signed out in another tab.', { icon: 'ℹ️' });
        }
      });

      if (!hasRefreshToken() || isRefreshTokenExpired()) {
        clearTokens();
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const { user: refreshedUser } = await refreshAuthSession();

        if (isMounted) {
          if (refreshedUser) {
            setUser(refreshedUser);
            setMustChangePassword(Boolean(refreshedUser.mustChangePassword));
          } else {
            // If refresh payload had no user, fetch profile
            const meUser = await authService.getMe();
            setUser(meUser);
            setMustChangePassword(Boolean(meUser?.mustChangePassword));
          }
        }
      } catch {
        // Refresh failed / expired: handled inside sessionManager (tokens cleared)
        if (isMounted) {
          setUser(null);
          setMustChangePassword(false);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // ── Login Action ──────────────────────────────────────────────────────────
  const login = useCallback(
    async ({ email, password, rememberMe = false }) => {
      const { tokens, user: authUser } = await authService.login({ email, password });

      // 1. Keep tokens
      setAccessToken(tokens.accessToken, tokens.accessTokenExpiresOn, tokens.tokenType);
      setRefreshToken(tokens.refreshToken, tokens.refreshTokenExpiresOn, rememberMe);

      // 2. Schedule proactive refresh ~60s before expiry
      scheduleProactiveRefresh(tokens.accessTokenExpiresOn);

      // 3. Fill user state
      setUser(authUser);
      const needsPasswordChange = Boolean(authUser.mustChangePassword);
      setMustChangePassword(needsPasswordChange);

      return { user: authUser, mustChangePassword: needsPasswordChange };
    },
    []
  );

  // ── Logout Action ─────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await terminateSession(() => authService.logout());
    } finally {
      setUser(null);
      setMustChangePassword(false);
      clearProactiveRefresh();
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  // ── Change Password Action ────────────────────────────────────────────────
  const changePassword = useCallback(
    async ({ currentPassword, newPassword, confirmPassword }) => {
      const res = await authService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setMustChangePassword(false);
      if (user) {
        setUser({ ...user, mustChangePassword: false });
      }

      return res;
    },
    [user]
  );

  const value = {
    user,
    setUser,
    loading,
    isAuthenticated: Boolean(user),
    mustChangePassword,
    setMustChangePassword,
    login,
    logout,
    changePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an <AuthProvider>');
  }
  return context;
}
