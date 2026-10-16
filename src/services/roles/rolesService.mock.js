/**
 * rolesService.mock.js — Offline mock roles service.
 */

import { ROLE_OPTIONS } from '../../mocks/users';

const MOCK_ROLES = ROLE_OPTIONS.map((opt, idx) => ({
  id: idx + 1,
  roleId: idx + 1,
  name: opt.label,
  roleName: opt.label,
  isActive: true,
  userCount: 3,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: null,
  createdOn: '2025-01-01T00:00:00Z',
  lastUpdatedOn: null,
}));

export async function getRoles({ isActive } = {}) {
  await new Promise((r) => setTimeout(r, 200));
  if (typeof isActive === 'boolean') {
    return MOCK_ROLES.filter((r) => r.isActive === isActive);
  }
  return [...MOCK_ROLES];
}
