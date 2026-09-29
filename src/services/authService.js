/**
 * authService — thin axios wrapper for authentication endpoints.
 * When the real backend isn't ready, the stub below returns a resolved
 * promise on valid credentials (admin@microflat.in / admin123).
 *
 * Replace the `loginStub` block with a real API call when the backend is ready:
 *   return axios.post('/api/auth/login', { identifier, password });
 */

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

/* ── Stub credentials (remove once backend is live) ──────────────────────── */
const STUB_USERS = [
  {
    identifier: 'admin@microflat.in',
    password: 'admin123',
    user: { name: 'Admin', email: 'admin@microflat.in', role: 'Super Admin', isFirstLogin: false },
  },
  {
    identifier: 'newuser@microflat.in',
    password: 'welcome123',
    user: { name: 'New Employee', email: 'newuser@microflat.in', role: 'Operator', isFirstLogin: true },
  },
];

export async function login({ identifier, password }) {
  // ── STUB: simulate network delay + credential check ─────────────────────
  if (import.meta.env.VITE_USE_STUB !== 'false') {
    await new Promise((r) => setTimeout(r, 700));
    const matched = STUB_USERS.find(
      (u) =>
        u.identifier.toLowerCase() === identifier.trim().toLowerCase() &&
        u.password === password
    );

    if (matched) {
      return {
        data: {
          token: matched.user.isFirstLogin ? 'temp-first-login-token' : 'stub-jwt-token',
          user: { ...matched.user },
        },
      };
    }
    throw {
      response: {
        status: 401,
        data: { message: 'Invalid email/username or password. Please try again.' },
      },
    };
  }
  // ── REAL: swap in when VITE_USE_STUB=false ───────────────────────────────
  return api.post('/api/auth/login', { identifier, password });
}

export async function forgotPassword({ email }) {
  if (import.meta.env.VITE_USE_STUB !== 'false') {
    await new Promise((r) => setTimeout(r, 700));
    return {
      data: {
        ok: true,
        message: `Password reset link sent to ${email}.`,
      },
    };
  }
  return api.post('/api/auth/forgot-password', { email });
}

export async function forceResetPassword({ email, newPassword }) {
  if (import.meta.env.VITE_USE_STUB !== 'false') {
    await new Promise((r) => setTimeout(r, 800));
    return {
      data: {
        token: 'stub-jwt-token-active',
        user: { name: 'User', email, role: 'Operator', isFirstLogin: false },
        message: 'Password updated successfully.',
      },
    };
  }
  return api.post('/api/auth/force-reset-password', { email, newPassword });
}
