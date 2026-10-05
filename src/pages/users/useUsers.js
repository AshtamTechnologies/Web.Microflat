/**
 * useUsers — encapsulates all CRUD logic for the Users feature.
 */

import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { mockUsers } from '../../mocks/users';

let nextId = mockUsers.length + 1;

export function useUsers() {
  const [users, setUsers] = useState(mockUsers);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  /* ── Filtered list ── */
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();

    return users.filter((u) => {
      // 1. Text Search Filter
      if (q) {
        const userRolesStr = Array.isArray(u.roles) ? u.roles.join(' ') : u.role || '';
        const matchesQuery =
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          (u.mobile && u.mobile.includes(q)) ||
          (u.secondaryPhone && u.secondaryPhone.includes(q)) ||
          (u.address && u.address.toLowerCase().includes(q)) ||
          userRolesStr.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      // 2. Role Filter
      if (roleFilter !== 'ALL') {
        const hasRole = Array.isArray(u.roles)
          ? u.roles.includes(roleFilter)
          : u.role === roleFilter;
        if (!hasRole) {
          return false;
        }
      }

      // 3. Status Filter
      if (statusFilter !== 'ALL') {
        const isActiveExpected = statusFilter === 'ACTIVE';
        if (u.isActive !== isActiveExpected) {
          return false;
        }
      }

      return true;
    });
  }, [users, search, roleFilter, statusFilter]);

  /* ── Reset all filters ── */
  function resetFilters() {
    setSearch('');
    setRoleFilter('ALL');
    setStatusFilter('ALL');
  }

  /* ── Get single user by id ── */
  function getUserById(id) {
    return users.find((u) => u.id === id);
  }

  /* ── Create (mock async) ── */
  async function createUser(formData) {
    await new Promise((r) => setTimeout(r, 600));
    const normalizedRoles = Array.isArray(formData.roles) && formData.roles.length > 0
      ? formData.roles
      : formData.role
      ? [formData.role]
      : [];

    const newUser = {
      id: `u${nextId++}`,
      secondaryPhone: formData.secondaryPhone || '',
      address: formData.address || '',
      ...formData,
      roles: normalizedRoles,
      role: normalizedRoles[0] || 'Viewer',
    };
    setUsers((prev) => [newUser, ...prev]);
    toast.success('User created successfully.');
    return { ok: true, user: newUser };
  }

  /* ── Update (mock async) ── */
  async function updateUser(id, formData) {
    await new Promise((r) => setTimeout(r, 600));
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        const normalizedRoles = Array.isArray(formData.roles)
          ? formData.roles
          : formData.role
          ? [formData.role]
          : u.roles || [u.role || 'Admin'];

        return {
          ...u,
          ...formData,
          roles: normalizedRoles,
          role: normalizedRoles[0] || u.role || 'Admin',
        };
      })
    );
    toast.success('User updated successfully.');
    return { ok: true };
  }

  /* ── Toggle isActive ── */
  function toggleStatus(id) {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        const next = { ...u, isActive: !u.isActive };
        toast.success(
          `${next.firstName} ${next.lastName} marked ${next.isActive ? 'Active' : 'Inactive'}.`
        );
        return next;
      })
    );
  }

  /* ── Delete ── */
  function deleteUser(id) {
    const user = users.find((u) => u.id === id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
    if (user) {
      toast.success(`${user.firstName} ${user.lastName} deleted.`);
    }
  }

  /* ── Reset Password ── */
  function resetPassword(id) {
    const user = users.find((u) => u.id === id);
    if (user) {
      toast.success(`Password reset link sent to ${user.email}`);
    }
  }

  return {
    users: filteredUsers,
    allUsers: users,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
    resetFilters,
    getUserById,
    createUser,
    updateUser,
    toggleStatus,
    deleteUser,
    resetPassword,
  };
}
