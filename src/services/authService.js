/**
 * authService.js — Backward compatibility adapter.
 * Re-exports from src/services/index.js (or src/services/auth).
 */

import { authService } from './index';

export const login = ({ identifier, email, password }) =>
  authService.login({ email: email || identifier, password });

export const forgotPassword = (payload) => authService.forgotPassword(payload);

export const forceResetPassword = (payload) => authService.resetPassword(payload);

export const resetPassword = (payload) => authService.resetPassword(payload);

export const changePassword = (payload) => authService.changePassword(payload);

export const logout = () => authService.logout();

export const getMe = () => authService.getMe();

export default authService;
