/**
 * usersService.mock.js — Offline mock users service.
 */

import { mockUsers } from '../../mocks/users';
import { userFromApi } from '../../models/users/userModel';

let seedUsers = mockUsers.map((u, idx) => ({
  userId: idx + 1,
  id: u.id,
  firstName: u.firstName,
  lastName: u.lastName,
  email: u.email,
  mobile: u.mobile,
  secondaryPhone: u.secondaryPhone || '',
  address: u.address || '',
  isActive: u.isActive !== false,
  isLockedOut: false,
  mustChangePassword: false,
  temporaryPasswordExpiresOn: null,
  primaryRole: (Array.isArray(u.roles) ? u.roles[0] : u.role) || 'Viewer',
  roles: (Array.isArray(u.roles) ? u.roles : [u.role || 'Viewer']).map((r, rIdx) => ({
    roleId: rIdx + 1,
    roleName: r,
    isPrimary: rIdx === 0,
    isActive: true,
  })),
  createdOn: '2025-01-10T10:00:00Z',
  lastUpdatedOn: null,
}));

let nextMockId = seedUsers.length + 1;

export async function getUsers({ search = '', isActive, roleId, pageNumber = 1, pageSize = 10 } = {}) {
  await new Promise((r) => setTimeout(r, 250));

  let filtered = [...seedUsers];

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter((u) => {
      const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
      const email = (u.email || '').toLowerCase();
      const mobile = u.mobile || '';
      return fullName.includes(q) || email.includes(q) || mobile.includes(q);
    });
  }

  if (typeof isActive === 'boolean') {
    filtered = filtered.filter((u) => u.isActive === isActive);
  }

  if (roleId) {
    filtered = filtered.filter((u) =>
      u.roles.some((r) => r.roleId === Number(roleId))
    );
  }

  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const start = (pageNumber - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize).map(userFromApi);

  return {
    items,
    pageNumber,
    pageSize,
    totalCount,
    totalPages,
  };
}

export async function getUserById(id) {
  await new Promise((r) => setTimeout(r, 150));
  const found = seedUsers.find(
    (u) => String(u.id) === String(id) || String(u.userId) === String(id)
  );
  if (!found) {
    const err = new Error('User not found.');
    err.status = 404;
    throw err;
  }
  return userFromApi(found);
}

export async function createUser(formData) {
  await new Promise((r) => setTimeout(r, 350));
  const newUserId = nextMockId++;
  const roleIds = Array.isArray(formData.roleIds) ? formData.roleIds.map(Number) : [1];
  const primaryRoleId = formData.primaryRoleId ? Number(formData.primaryRoleId) : roleIds[0];
  const mappedRoles = roleIds.map((rid) => ({
    roleId: rid,
    roleName: `Role ${rid}`,
    isPrimary: rid === primaryRoleId,
    isActive: true,
  }));
  const primaryRoleObj = mappedRoles.find((r) => r.isPrimary) || mappedRoles[0];

  const rawUser = {
    userId: newUserId,
    id: `u${newUserId}`,
    firstName: formData.firstName,
    lastName: formData.lastName,
    email: formData.email,
    mobile: formData.mobile,
    secondaryPhone: formData.secondaryPhone || '',
    address: formData.address || '',
    isActive: formData.isActive !== undefined ? Boolean(formData.isActive) : true,
    isLockedOut: false,
    mustChangePassword: true,
    temporaryPasswordExpiresOn: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    primaryRole: primaryRoleObj?.roleName || 'Viewer',
    roles: mappedRoles,
    createdOn: new Date().toISOString(),
    lastUpdatedOn: null,
  };
  seedUsers = [rawUser, ...seedUsers];

  return {
    user: userFromApi(rawUser),
    temporaryPasswordEmailSent: true,
    temporaryPasswordExpiresOn: rawUser.temporaryPasswordExpiresOn,
    message: 'User registered successfully. Temporary password has been sent by email.',
  };
}

export async function updateUser(id, formData) {
  await new Promise((r) => setTimeout(r, 350));
  const idx = seedUsers.findIndex(
    (u) => String(u.id) === String(id) || String(u.userId) === String(id)
  );
  if (idx === -1) {
    const err = new Error('User not found.');
    err.status = 404;
    throw err;
  }

  let updatedRoles = seedUsers[idx].roles;
  if (Array.isArray(formData.roleIds) && formData.roleIds.length > 0) {
    const roleIds = formData.roleIds.map(Number);
    const primaryRoleId = formData.primaryRoleId ? Number(formData.primaryRoleId) : roleIds[0];
    updatedRoles = roleIds.map((rid) => ({
      roleId: rid,
      roleName: `Role ${rid}`,
      isPrimary: rid === primaryRoleId,
      isActive: true,
    }));
  }

  seedUsers[idx] = {
    ...seedUsers[idx],
    firstName: formData.firstName,
    lastName: formData.lastName,
    email: formData.email,
    mobile: formData.mobile,
    secondaryPhone: formData.secondaryPhone || '',
    address: formData.address || '',
    roles: updatedRoles,
    primaryRole: updatedRoles.find((r) => r.isPrimary)?.roleName || updatedRoles[0]?.roleName || 'Viewer',
    lastUpdatedOn: new Date().toISOString(),
  };

  return userFromApi(seedUsers[idx]);
}

export async function updateUserRoles(id, { roleIds, primaryRoleId }) {
  await new Promise((r) => setTimeout(r, 200));
  const idx = seedUsers.findIndex(
    (u) => String(u.id) === String(id) || String(u.userId) === String(id)
  );
  if (idx === -1) {
    const err = new Error('User not found.');
    err.status = 404;
    throw err;
  }
  const roleList = (roleIds || []).map(Number);
  const pRoleId = primaryRoleId ? Number(primaryRoleId) : roleList[0];
  seedUsers[idx].roles = roleList.map((rid) => ({
    roleId: rid,
    roleName: `Role ${rid}`,
    isPrimary: rid === pRoleId,
    isActive: true,
  }));
  seedUsers[idx].primaryRole =
    seedUsers[idx].roles.find((r) => r.isPrimary)?.roleName || seedUsers[idx].roles[0]?.roleName || 'Viewer';
  return { message: 'Roles updated.' };
}

export async function updateStatus(id, isActive) {
  await new Promise((r) => setTimeout(r, 250));
  const idx = seedUsers.findIndex(
    (u) => String(u.id) === String(id) || String(u.userId) === String(id)
  );
  if (idx === -1) {
    const err = new Error('User not found.');
    err.status = 404;
    throw err;
  }

  seedUsers[idx] = {
    ...seedUsers[idx],
    isActive,
    lastUpdatedOn: new Date().toISOString(),
  };

  return userFromApi(seedUsers[idx]);
}

export async function getMe() {
  await new Promise((r) => setTimeout(r, 150));
  return userFromApi(seedUsers[0]);
}

export async function updateProfile(formData) {
  await new Promise((r) => setTimeout(r, 250));
  if (seedUsers[0]) {
    seedUsers[0] = {
      ...seedUsers[0],
      firstName: formData.firstName,
      lastName: formData.lastName,
      mobile: formData.mobile,
      secondaryPhone: formData.secondaryPhone || '',
      address: formData.address || '',
      lastUpdatedOn: new Date().toISOString(),
    };
    return userFromApi(seedUsers[0]);
  }
  throw new Error('User not found.');
}

export async function getUserSessions(id, { take = 5 } = {}) {
  await new Promise((r) => setTimeout(r, 150));
  return [
    {
      userSessionId: 21,
      loginAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      logoutAt: null,
      logoutType: null,
      isActive: true,
      ipAddress: '127.0.0.1',
      device: 'Mobile',
      browser: 'Safari',
      os: 'iOS',
    },
    {
      userSessionId: 20,
      loginAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      logoutAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      logoutType: 'Manual',
      isActive: false,
      ipAddress: '::1',
      device: 'Desktop',
      browser: 'Chrome',
      os: 'Windows',
    },
  ].slice(0, take);
}

export async function deleteUser(id) {
  await new Promise((r) => setTimeout(r, 200));
  seedUsers = seedUsers.filter(
    (u) => String(u.id) !== String(id) && String(u.userId) !== String(id)
  );
  return { message: 'User deleted.' };
}

export async function sendTemporaryPassword(id) {
  await new Promise((r) => setTimeout(r, 250));
  const idx = seedUsers.findIndex(
    (u) => String(u.id) === String(id) || String(u.userId) === String(id)
  );
  if (idx === -1) {
    const err = new Error('User not found.');
    err.status = 404;
    throw err;
  }
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  seedUsers[idx] = {
    ...seedUsers[idx],
    mustChangePassword: true,
    temporaryPasswordExpiresOn: expiry,
  };
  return {
    message: `Temporary password dispatched to ${seedUsers[idx].email}.`,
    temporaryPasswordEmailSent: true,
    temporaryPasswordExpiresOn: expiry,
  };
}

export const capabilities = {
  delete: true,
  changeRoles: true,
  sort: true,
};
