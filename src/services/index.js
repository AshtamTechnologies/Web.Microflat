/**
 * services/index.js — Unified service provider.
 *
 * Switches between real API services and offline mock services based on:
 *   import.meta.env.VITE_USE_MOCK_API === 'true' (default: false).
 *
 * Each service exports capabilities indicating supported features.
 */

import * as realAuth from './auth/authService';
import * as mockAuth from './auth/authService.mock';

import * as realUsers from './users/usersService';
import * as mockUsers from './users/usersService.mock';

import * as realRoles from './roles/rolesService';
import * as mockRoles from './roles/rolesService.mock';

const useMock = import.meta.env.VITE_USE_MOCK_API === 'true';

export const authService = useMock ? mockAuth : realAuth;
export const userService = useMock ? mockUsers : realUsers;
export const roleService = useMock ? mockRoles : realRoles;
export const isMockApi = useMock;
