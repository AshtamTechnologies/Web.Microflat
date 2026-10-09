/**
 * UserSessionsContext.jsx — Session tracking state & helpers for the Users module.
 *
 * Comment: Real logout times only exist when the backend tracks sessions
 * and records an explicit logout; IP comes from the server request
 * (req.ip / X-Forwarded-For); the browser can't supply it. This mock
 * stands in until an API exists.
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getInitialUserSessions } from '../mocks/userSessions';

const UserSessionsContext = createContext(null);
const STORAGE_KEY = 'microflat_user_sessions_v3';

/**
 * Derives the session status object.
 * Session status is DERIVED, never stored:
 *   - logoutAt set + logoutType 'manual' -> "Signed out" (gray tint Badge)
 *   - logoutType 'timeout'               -> "Timed out" (warning tint Badge)
 *   - logoutAt null + logoutType null    -> "Active" (success tint Badge)
 *
 * @param {Object} session
 * @returns {{ label: string, variant: 'success'|'warning'|'neutral' }}
 */
export function getDerivedSessionStatus(session) {
  if (!session) return { label: 'Unknown', variant: 'neutral' };

  if (session.logoutType === 'timeout') {
    return { label: 'Timed out', variant: 'warning' };
  }

  if (session.logoutAt || session.logoutType === 'manual') {
    return { label: 'Signed out', variant: 'neutral' };
  }

  return { label: 'Active', variant: 'success' };
}

export function UserSessionsProvider({ children }) {
  const [sessions, setSessions] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return getInitialUserSessions();
  });

  // Sync with localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch {
      // ignore
    }
  }, [sessions]);

  /**
   * Returns all sessions for a user, sorted newest first by loginAt
   */
  const getSessionsForUser = useCallback(
    (userId) => {
      if (!userId) return [];
      return sessions
        .filter((s) => s.userId === userId)
        .sort((a, b) => new Date(b.loginAt).getTime() - new Date(a.loginAt).getTime());
    },
    [sessions]
  );

  /**
   * Returns the top N most recent sessions for a user
   */
  const getRecentSessions = useCallback(
    (userId, limit = 5) => {
      return getSessionsForUser(userId).slice(0, limit);
    },
    [getSessionsForUser]
  );

  /**
   * Returns the latest loginAt ISO string for a user, or null if no sessions exist
   */
  const getLastLogin = useCallback(
    (userId) => {
      const userSessions = getSessionsForUser(userId);
      if (userSessions.length === 0) return null;
      return userSessions[0].loginAt || null;
    },
    [getSessionsForUser]
  );

  /**
   * Records a new active login session for a user
   */
  const recordLogin = useCallback((userId, meta = {}) => {
    if (!userId) return;
    const now = new Date().toISOString();
    const newSession = {
      sessionId: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId,
      loginAt: now,
      logoutAt: null,
      logoutType: null,
      ipAddress: meta.ipAddress || '192.168.1.105',
      device: meta.device || 'Desktop',
      browser: meta.browser || 'Chrome 128',
      os: meta.os || 'Windows 11',
    };

    setSessions((prev) => [newSession, ...prev]);
    return newSession;
  }, []);

  /**
   * Records a manual logout for the user's current active session
   */
  const recordLogout = useCallback((userId) => {
    if (!userId) return;
    const now = new Date().toISOString();

    setSessions((prev) =>
      prev.map((s) => {
        if (s.userId === userId && !s.logoutAt && !s.logoutType) {
          const loginTime = new Date(s.loginAt).getTime();
          const logoutTime = Math.max(Date.now(), loginTime + 60 * 1000);
          return {
            ...s,
            logoutAt: new Date(logoutTime).toISOString(),
            logoutType: 'manual',
          };
        }
        return s;
      })
    );
  }, []);

  return (
    <UserSessionsContext.Provider
      value={{
        sessions,
        getSessionsForUser,
        getRecentSessions,
        getLastLogin,
        getSessionStatus: getDerivedSessionStatus,
        recordLogin,
        recordLogout,
      }}
    >
      {children}
    </UserSessionsContext.Provider>
  );
}

export function useUserSessions() {
  const context = useContext(UserSessionsContext);
  if (!context) {
    throw new Error('useUserSessions must be used within a UserSessionsProvider');
  }
  return context;
}

export const useUserSessionsContext = useUserSessions;
export default UserSessionsContext;
