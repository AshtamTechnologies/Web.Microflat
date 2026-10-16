/**
 * authService.mock.js — Offline mock authentication service.
 */

import { mapLoginResponse } from '../../models/auth/authModel';

const STUB_USERS = [
  {
    userId: 1,
    email: 'admin@microflat.in',
    password: 'admin123',
    firstName: 'Admin',
    lastName: 'User',
    primaryRole: 'Super Admin',
    roles: ['Super Admin'],
    mustChangePassword: false,
  },
  {
    userId: 2,
    email: 'newuser@microflat.in',
    password: 'welcome123',
    firstName: 'New',
    lastName: 'Employee',
    primaryRole: 'Operator',
    roles: ['Operator'],
    mustChangePassword: true,
  },
];

export async function login({ email, password }) {
  await new Promise((r) => setTimeout(r, 400));
  const normalizedEmail = (email || '').trim().toLowerCase();
  const matched = STUB_USERS.find(
    (u) => u.email.toLowerCase() === normalizedEmail && u.password === password
  );

  if (matched) {
    const rawDto = {
      tokenType: 'Bearer',
      accessToken: 'mock-access-token-xyz',
      accessTokenExpiresOn: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      refreshToken: 'mock-refresh-token-abc',
      refreshTokenExpiresOn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      user: {
        userId: matched.userId,
        firstName: matched.firstName,
        lastName: matched.lastName,
        email: matched.email,
        primaryRole: matched.primaryRole,
        roles: matched.roles,
        mustChangePassword: matched.mustChangePassword,
      },
    };
    return mapLoginResponse(rawDto);
  }

  const err = new Error('Invalid email or password.');
  err.status = 401;
  throw err;
}

export async function refreshToken({ refreshToken: token }) {
  await new Promise((r) => setTimeout(r, 200));
  if (!token || token.includes('invalid')) {
    const err = new Error('Invalid or expired refresh token.');
    err.status = 401;
    throw err;
  }

  const rawDto = {
    tokenType: 'Bearer',
    accessToken: 'mock-access-token-refreshed',
    accessTokenExpiresOn: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    refreshToken: 'mock-refresh-token-rotated',
    refreshTokenExpiresOn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    user: {
      userId: 1,
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@microflat.in',
      primaryRole: 'Super Admin',
      roles: ['Super Admin'],
      mustChangePassword: false,
    },
  };
  return mapLoginResponse(rawDto);
}

export async function logout() {
  await new Promise((r) => setTimeout(r, 200));
  return { message: 'Logged out successfully.' };
}

export async function forgotPassword({ email }) {
  await new Promise((r) => setTimeout(r, 400));
  return {
    message: `If an account exists for ${email}, a password reset link has been sent.`,
  };
}

export async function resetPassword({ email, newPassword }) {
  await new Promise((r) => setTimeout(r, 400));
  const user = STUB_USERS.find((u) => u.email.toLowerCase() === (email || '').toLowerCase());
  if (user) {
    user.password = newPassword;
    user.mustChangePassword = false;
  }
  return { message: 'Password has been reset successfully. Please sign in.' };
}

export async function changePassword({ currentPassword, newPassword }) {
  await new Promise((r) => setTimeout(r, 400));
  const admin = STUB_USERS[0];
  if (admin.password !== currentPassword) {
    const err = new Error('Current password does not match.');
    err.status = 400;
    throw err;
  }
  admin.password = newPassword;
  admin.mustChangePassword = false;
  return { message: 'Password changed successfully.' };
}

export async function getMe() {
  await new Promise((r) => setTimeout(r, 200));
  const admin = STUB_USERS[0];
  return {
    user: {
      id: String(admin.userId),
      userId: admin.userId,
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
      primaryRole: admin.primaryRole,
      roles: [{ roleId: 1, roleName: 'Super Admin', isPrimary: true, isActive: true }],
      role: 'Super Admin',
      isActive: true,
      isLockedOut: false,
      mustChangePassword: false,
    },
  };
}
