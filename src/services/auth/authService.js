/**
 * authService.js — Real authentication service calling backend API endpoints.
 * Returns mapped model objects and throws normalized ApiError.
 */

import { axiosInstance } from '../../axiosConfig/axiosInstance';
import { AUTH_ENDPOINTS } from './authEndpoints';
import { USERS_ENDPOINTS } from '../users/usersEndpoints';
import { mapLoginResponse } from '../../models/auth/authModel';
import { userFromApi } from '../../models/users/userModel';
import { normalizeApiError } from '../../utils/apiError';

/**
 * Authenticates user credentials with POST /api/auth/login.
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<{ tokens: object, user: import('../../models/users/userModel').UserModel }>}
 */
export async function login({ email, password }) {
  try {
    const response = await axiosInstance.post(AUTH_ENDPOINTS.LOGIN, {
      email: (email || '').trim(),
      password,
    });
    return mapLoginResponse(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Exchanges a valid refresh token for rotated tokens via POST /api/auth/refresh-token.
 * @param {{ refreshToken: string }} payload
 * @returns {Promise<{ tokens: object, user: import('../../models/users/userModel').UserModel }>}
 */
export async function refreshToken({ refreshToken: token }) {
  try {
    const response = await axiosInstance.post(AUTH_ENDPOINTS.REFRESH_TOKEN, {
      refreshToken: token,
    });
    return mapLoginResponse(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Revokes all sessions of the current user on the server via POST /api/auth/logout-all.
 * @returns {Promise<{ message: string }>}
 */
export async function logout() {
  try {
    const response = await axiosInstance.post(AUTH_ENDPOINTS.LOGOUT_ALL);
    return response.data || { message: 'Logged out successfully.' };
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Explicit logout-all alias.
 */
export async function logoutAll() {
  return logout();
}

/**
 * Requests a password reset link via POST /api/auth/forgot-password.
 * Always returns a generic success message per security best practices.
 * @param {{ email: string }} payload
 * @returns {Promise<{ message: string }>}
 */
export async function forgotPassword({ email }) {
  try {
    const response = await axiosInstance.post(AUTH_ENDPOINTS.FORGOT_PASSWORD, {
      email: (email || '').trim(),
    });
    return response.data || { message: 'If an account exists, a password reset link has been sent.' };
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Resets user password via POST /api/auth/reset-password.
 * @param {{ email: string, token: string, newPassword: string, confirmPassword: string }} payload
 * @returns {Promise<{ message: string }>}
 */
export async function resetPassword({ email, token, newPassword, confirmPassword }) {
  try {
    const response = await axiosInstance.post(AUTH_ENDPOINTS.RESET_PASSWORD, {
      email: (email || '').trim(),
      token: (token || '').trim(),
      newPassword,
      confirmPassword,
    });
    return response.data || { message: 'Password has been reset successfully.' };
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Changes password for the currently signed-in user via PUT /api/auth/change-password.
 * @param {{ currentPassword: string, newPassword: string, confirmPassword: string }} payload
 * @returns {Promise<{ message: string }>}
 */
export async function changePassword({ currentPassword, newPassword, confirmPassword }) {
  try {
    const response = await axiosInstance.put(AUTH_ENDPOINTS.CHANGE_PASSWORD, {
      currentPassword,
      newPassword,
      confirmPassword,
    });
    return response.data || { message: 'Password updated successfully.' };
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Retrieves the signed-in user's profile and roles via GET /api/users/me.
 * @returns {Promise<import('../../models/users/userModel').UserModel>}
 */
export async function getMe() {
  try {
    const response = await axiosInstance.get(USERS_ENDPOINTS.USER_ME);
    return userFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}
