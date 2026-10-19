/**
 * useUsers.js — Encapsulates state and operations for the Users and Roles feature.
 * Supports both real backend API (server-side paging/filtering) and mock mode.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { userService, roleService, isMockApi } from '../../services';
import { mockUsers } from '../../mocks/users';

/**
 * Resolves a display name for a user ID.
 * Checks API loaded users first, then mock seed users, and falls back safely to the ID.
 * Never crashes on an unknown ID.
 *
 * @param {string|number} id
 * @param {Array<object>} [knownUsers=[]]
 * @returns {string}
 */
export function getUserName(id, knownUsers = []) {
  if (!id) return 'Unassigned';
  const strId = String(id).trim();

  // 1. Check known API users
  const fromKnown = knownUsers.find(
    (u) => String(u.id) === strId || String(u.userId) === strId
  );
  if (fromKnown) {
    const name = `${fromKnown.firstName || ''} ${fromKnown.lastName || ''}`.trim();
    return name || fromKnown.email || strId;
  }

  // 2. Check legacy mock users
  const fromMock = mockUsers.find(
    (u) => String(u.id) === strId || String(u.id) === `u${strId}`
  );
  if (fromMock) {
    const name = `${fromMock.firstName || ''} ${fromMock.lastName || ''}`.trim();
    return name || fromMock.email || strId;
  }

  return strId;
}

/**
 * Hook to load active users for pickers (e.g. assignee, created-by, approved-by).
 * Pages through active users until all are loaded.
 *
 * @returns {{ options: Array<{ value: string|number, label: string, user: object }>, loading: boolean }}
 */
export function useUserOptions() {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadAllActiveUsers() {
      setLoading(true);
      try {
        let allItems = [];
        let page = 1;
        let totalPages = 1;

        // Paging until done (up to safety limit of 10 pages)
        while (page <= totalPages && page <= 10) {
          const res = await userService.getUsers({
            isActive: true,
            pageNumber: page,
            pageSize: 100,
          });

          const items = res.items || [];
          allItems = allItems.concat(items);
          totalPages = res.totalPages || 1;
          page += 1;
          if (items.length === 0) break;
        }

        if (isMounted) {
          const opts = allItems.map((u) => ({
            value: u.id,
            label: `${u.firstName} ${u.lastName}`.trim() || u.email,
            user: u,
          }));
          setOptions(opts);
        }
      } catch {
        // Fallback to active mock users on failure
        if (isMounted) {
          const fallbackOpts = mockUsers
            .filter((u) => u.isActive !== false)
            .map((u) => ({
              value: u.id,
              label: `${u.firstName} ${u.lastName}`,
              user: u,
            }));
          setOptions(fallbackOpts);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadAllActiveUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  return { options, loading };
}

export function useUsers() {
  // Current page items
  const [users, setUsers] = useState([]);
  // Cached list of all loaded users (for cross-module consumers like Inquiries/Vendors)
  const [allUsers, setAllUsers] = useState([]);

  // Search input & debounced search (~400ms)
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Filters
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Pagination state
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Loading & roles state
  const [loading, setLoading] = useState(true);
  const [rolesList, setRolesList] = useState([]);
  const debounceTimerRef = useRef(null);

  // Debounce search input by 400ms
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPageNumber(1); // Reset to page 1 on new search
    }, 400);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [search]);

  // Load roles list for dropdowns & filters
  useEffect(() => {
    let isMounted = true;
    async function fetchRoles() {
      try {
        const roles = await roleService.getRoles({ isActive: true });
        if (isMounted) {
          setRolesList(roles);
        }
      } catch {
        // Role service error handled gracefully
      }
    }
    fetchRoles();
    return () => {
      isMounted = false;
    };
  }, []);

  // Main data fetcher
  useEffect(() => {
    let ignore = false;

    async function runFetch() {
      try {
        const isActiveParam =
          statusFilter === 'ACTIVE' ? true : statusFilter === 'INACTIVE' ? false : undefined;

        const roleIdParam = roleFilter !== 'ALL' ? roleFilter : undefined;

        const result = await userService.getUsers({
          search: debouncedSearch,
          isActive: isActiveParam,
          roleId: roleIdParam,
          pageNumber,
          pageSize,
        });

        if (!ignore) {
          const items = result.items || [];
          setUsers(items);
          setTotalCount(result.totalCount || items.length);
          setTotalPages(result.totalPages || 1);
          setLoading(false);

          // Accumulate into allUsers cache for lookup
          setAllUsers((prev) => {
            const map = new Map();
            prev.forEach((u) => map.set(String(u.id), u));
            items.forEach((u) => map.set(String(u.id), u));
            return Array.from(map.values());
          });
        }
      } catch (err) {
        if (!ignore) {
          const msg = err?.message || 'Failed to load users list.';
          toast.error(msg);
          setUsers([]);
          setLoading(false);
        }
      }
    }

    runFetch();

    return () => {
      ignore = true;
    };
  }, [debouncedSearch, statusFilter, roleFilter, pageNumber, pageSize]);

  // Manual refresh helper
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const isActiveParam =
        statusFilter === 'ACTIVE' ? true : statusFilter === 'INACTIVE' ? false : undefined;
      const roleIdParam = roleFilter !== 'ALL' ? roleFilter : undefined;

      const result = await userService.getUsers({
        search: debouncedSearch,
        isActive: isActiveParam,
        roleId: roleIdParam,
        pageNumber,
        pageSize,
      });

      const items = result.items || [];
      setUsers(items);
      setTotalCount(result.totalCount || items.length);
      setTotalPages(result.totalPages || 1);

      setAllUsers((prev) => {
        const map = new Map();
        prev.forEach((u) => map.set(String(u.id), u));
        items.forEach((u) => map.set(String(u.id), u));
        return Array.from(map.values());
      });
    } catch (err) {
      const msg = err?.message || 'Failed to load users list.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, roleFilter, pageNumber, pageSize]);

  // Reset filters
  const resetFilters = useCallback(() => {
    setSearch('');
    setDebouncedSearch('');
    setRoleFilter('ALL');
    setStatusFilter('ALL');
    setPageNumber(1);
  }, []);

  // Get single user by ID
  const getUserById = useCallback(
    async (id) => {
      if (id === 'me') {
        const fetchedMe = await userService.getMe();
        if (fetchedMe) {
          setAllUsers((prev) => {
            const map = new Map(prev.map((u) => [String(u.id), u]));
            map.set(String(fetchedMe.id), fetchedMe);
            return Array.from(map.values());
          });
        }
        return fetchedMe;
      }

      const fetched = await userService.getUserById(id);
      if (fetched) {
        setAllUsers((prev) => {
          const map = new Map(prev.map((u) => [String(u.id), u]));
          map.set(String(fetched.id), fetched);
          return Array.from(map.values());
        });
      }
      return fetched;
    },
    []
  );

  // Update Signed-In User Profile via PUT /api/users/me
  const updateProfile = useCallback(
    async (formData) => {
      try {
        const updated = await userService.updateProfile(formData);
        toast.success('Profile updated successfully.');
        setUsers((prev) => prev.map((u) => (String(u.id) === String(updated.id) ? updated : u)));
        setAllUsers((prev) => prev.map((u) => (String(u.id) === String(updated.id) ? updated : u)));
        return { ok: true, user: updated };
      } catch (err) {
        const msg = err?.message || 'Failed to update profile.';
        toast.error(msg);
        throw err;
      }
    },
    []
  );

  // Create User
  const createUser = useCallback(
    async (formData) => {
      try {
        const res = await userService.createUser(formData);
        toast.success('User created successfully.');
        await fetchUsers();
        return { ok: true, data: res };
      } catch (err) {
        const msg = err?.message || 'Failed to create user.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchUsers]
  );

  // Update User
  const updateUser = useCallback(
    async (id, formData) => {
      try {
        const updated = await userService.updateUser(id, formData);
        toast.success('User updated successfully.');
        // Update local state
        setUsers((prev) => prev.map((u) => (String(u.id) === String(id) ? updated : u)));
        setAllUsers((prev) => prev.map((u) => (String(u.id) === String(id) ? updated : u)));
        return { ok: true, user: updated };
      } catch (err) {
        const msg = err?.message || 'Failed to update user.';
        toast.error(msg);
        throw err;
      }
    },
    []
  );

  // Update User Roles via PUT /api/users/{id}/roles
  const updateUserRoles = useCallback(
    async (id, { roleIds, primaryRoleId }) => {
      try {
        await userService.updateUserRoles(id, { roleIds, primaryRoleId });
        toast.success('User roles updated successfully.');
        const updated = await userService.getUserById(id);
        setUsers((prev) => prev.map((u) => (String(u.id) === String(id) ? updated : u)));
        setAllUsers((prev) => prev.map((u) => (String(u.id) === String(id) ? updated : u)));
        return { ok: true, user: updated };
      } catch (err) {
        const msg = err?.message || 'Failed to update user roles.';
        toast.error(msg);
        throw err;
      }
    },
    []
  );

  // Toggle or Update Status
  const toggleStatus = useCallback(
    async (id, nextActive) => {
      try {
        const targetUser = users.find((u) => String(u.id) === String(id));
        const newStatus = typeof nextActive === 'boolean' ? nextActive : !targetUser?.isActive;

        const updated = await userService.updateStatus(id, newStatus);
        const name = `${updated.firstName || ''} ${updated.lastName || ''}`.trim() || 'User';
        toast.success(`${name} marked ${updated.isActive ? 'Active' : 'Inactive'}.`);

        setUsers((prev) => prev.map((u) => (String(u.id) === String(id) ? updated : u)));
        setAllUsers((prev) => prev.map((u) => (String(u.id) === String(id) ? updated : u)));
        return { ok: true, user: updated };
      } catch (err) {
        const msg = err?.message || 'Failed to update user status.';
        toast.error(msg);
        throw err;
      }
    },
    [users]
  );

  // Delete User (hidden in API mode)
  const deleteUser = useCallback(
    async (id) => {
      if (!userService.capabilities.delete) {
        toast.error('Deleting users is not supported by the backend API.');
        return;
      }

      try {
        await userService.deleteUser(id);
        toast.success('User deleted.');
        setUsers((prev) => prev.filter((u) => String(u.id) !== String(id)));
        setAllUsers((prev) => prev.filter((u) => String(u.id) !== String(id)));
      } catch (err) {
        const msg = err?.message || 'Failed to delete user.';
        toast.error(msg);
      }
    },
    []
  );

  // Send Temporary Password via POST /api/users/{id}/temporary-password
  const sendTemporaryPassword = useCallback(
    async (id) => {
      try {
        const res = await userService.sendTemporaryPassword(id);
        const msg = res?.message || 'Temporary password has been dispatched by email.';
        toast.success(msg);
        const updated = await userService.getUserById(id).catch(() => null);
        if (updated) {
          setUsers((prev) => prev.map((u) => (String(u.id) === String(id) ? updated : u)));
          setAllUsers((prev) => prev.map((u) => (String(u.id) === String(id) ? updated : u)));
        }
        return { ok: true, data: res, user: updated };
      } catch (err) {
        const msg = err?.message || 'Failed to send temporary password.';
        toast.error(msg);
        throw err;
      }
    },
    []
  );

  // Reset Password (generates temporary password in API mode)
  const resetPassword = useCallback(
    async (id) => {
      return sendTemporaryPassword(id);
    },
    [sendTemporaryPassword]
  );

  // Safe user lookup by ID
  const resolveUserName = useCallback(
    (id) => getUserName(id, allUsers),
    [allUsers]
  );

  return {
    users,
    allUsers,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
    pageNumber,
    setPageNumber,
    pageSize,
    setPageSize,
    totalCount,
    totalPages,
    loading,
    rolesList,
    capabilities: userService.capabilities,
    isMockApi,
    resetFilters,
    fetchUsers,
    getUserById,
    getUserName: resolveUserName,
    createUser,
    updateUser,
    updateUserRoles,
    updateProfile,
    toggleStatus,
    deleteUser,
    resetPassword,
    sendTemporaryPassword,
  };
}
