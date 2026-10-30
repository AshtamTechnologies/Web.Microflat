/**
 * useClients.js — Core state management and CRUD operations for the Clients module.
 * MicroFlat ERP: Client registration with nested addresses and contacts.
 * Integrated with real backend Client APIs (Oct 30, 2026).
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { clientService, isMockApi } from '../../services';
import { mockClients } from '../../mocks/clients';
import { getActiveClientVersion, toIntegerVersionId } from '../../utils/clientVersions';

export function useClients() {
  const location = useLocation();
  const [hasRequestedClients, setHasRequestedClients] = useState(false);
  const isClientsRoute = Boolean(location?.pathname?.startsWith('/clients'));
  const shouldFetch = isClientsRoute || hasRequestedClients;

  const ensureClientsLoaded = useCallback(() => {
    setHasRequestedClients(true);
  }, []);

  const [clients, setClients] = useState(isMockApi ? mockClients : []);
  const [summary, setSummary] = useState({ total: 0, active: 0, inactive: 0, notYetEffective: 0, scheduledChanges: 0 });
  const [lookups, setLookups] = useState({
    contactTypes: ['Customer', 'Distributor', 'Dealer', 'Agency'],
    addressTypes: ['Billing', 'Shipping', 'Registered Office', 'Works'],
    paymentTerms: [],
    countries: [],
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'
  const [contactTypeFilter, setContactTypeFilter] = useState('ALL'); // 'ALL' | 'Customer' | ...
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(!isMockApi);

  /* ── Load Lookups lazily ── */
  const loadLookups = useCallback(async () => {
    try {
      const data = await clientService.getClientLookups();
      if (data) {
        setLookups(data);
      }
    } catch (err) {
      console.warn('Could not load client lookups:', err);
    }
  }, []);

  useEffect(() => {
    if (!shouldFetch) return;
    loadLookups();
  }, [shouldFetch, loadLookups]);

  /* ── Load Paged Clients & Summary lazily from API ── */
  const loadClients = useCallback(async () => {
    setIsLoading(true);
    try {
      const [listRes, summaryRes] = await Promise.allSettled([
        clientService.listClients({
          search,
          contactType: contactTypeFilter,
          isActive: statusFilter,
          pageNumber,
          pageSize,
        }),
        clientService.getClientSummary(),
      ]);

      if (listRes.status === 'fulfilled' && listRes.value) {
        setClients(listRes.value.items || []);
        setTotalCount(listRes.value.totalCount ?? 0);
        setTotalPages(listRes.value.totalPages ?? 1);
      } else if (listRes.status === 'rejected') {
        console.warn('Could not fetch clients from API:', listRes.reason);
      }

      if (summaryRes.status === 'fulfilled' && summaryRes.value) {
        setSummary(summaryRes.value);
      }
    } catch (err) {
      console.warn('Error loading clients/summary:', err);
    } finally {
      setIsLoading(false);
    }
  }, [search, contactTypeFilter, statusFilter, pageNumber, pageSize]);

  useEffect(() => {
    if (!shouldFetch) return;
    loadClients();
  }, [shouldFetch, loadClients]);

  /* ── Reset filters helper ── */
  const resetFilters = useCallback(() => {
    setSearch('');
    setStatusFilter('ALL');
    setContactTypeFilter('ALL');
    setPageNumber(1);
  }, []);

  /* ── Augmented clients list with activeVersion spread for UI compatibility ── */
  const augmentedClients = useMemo(() => {
    return clients.map((c) => {
      const activeVersion = getActiveClientVersion(c);
      const effDate =
        c.effectiveDate ||
        activeVersion?.effectiveDate ||
        (c.createdAt ? String(c.createdAt).slice(0, 10) : '');

      return {
        ...c,
        ...(activeVersion
          ? {
              effectiveDate: effDate,
              companyName: activeVersion.companyName || c.clientName || c.companyName,
              billingName: activeVersion.billingName || c.billingName,
              contactTypeId: activeVersion.contactTypeId || c.contactType || c.contactTypeId,
              email: activeVersion.email || c.officialEmail || c.email,
              gstNo: activeVersion.gstNo || c.gstNo,
              paymentTerms: activeVersion.paymentTerms || c.paymentTerms,
              deliveryTerms: activeVersion.deliveryTerms || c.deliveryTerms,
              comments: activeVersion.comments || c.comments,
              contacts: activeVersion.contacts || c.contacts || [],
              addresses: activeVersion.addresses || c.addresses || [],
            }
          : {
              effectiveDate: effDate,
              companyName: c.clientName || c.companyName,
              contactTypeId: c.contactType || c.contactTypeId,
              email: c.officialEmail || c.email,
            }),
        activeVersion,
        effectiveDate: effDate,
        effectiveVersions: c.effectiveVersions || c.versions || (activeVersion ? [activeVersion] : []),
        id: c.clientId || c.id,
      };
    });
  }, [clients]);

  /* ── Filtered clients (for in-memory search fallback if needed) ── */
  const filteredClients = augmentedClients;

  /* ── Find single client by ID (Local cache or helper) ── */
  const getClientById = useCallback(
    (id) => {
      if (!id) return null;
      return augmentedClients.find((c) => String(c.clientId) === String(id) || String(c.id) === String(id)) || null;
    },
    [augmentedClients]
  );

  /* ── Fetch single client with full details & timeline from API ── */
  const fetchClientDetail = useCallback(async (id) => {
    if (!id) return null;
    try {
      const data = await clientService.getClientById(id);
      return data;
    } catch (err) {
      console.error('Failed to fetch client detail:', err);
      toast.error(err?.message || 'Could not load client details');
      return null;
    }
  }, []);

  /* ── Fetch one version in full ── */
  const fetchVersionDetail = useCallback(async (versionId) => {
    if (!versionId) return null;
    const numId = toIntegerVersionId(versionId, null);
    if (!numId) {
      console.warn('Skipping fetchVersionDetail: invalid versionId', versionId);
      return null;
    }
    try {
      const data = await clientService.getClientVersionById(numId);
      return data;
    } catch (err) {
      console.error('Failed to fetch client version detail:', err);
      toast.error(err?.message || 'Could not load client version');
      return null;
    }
  }, []);

  /* ── Add new client (Register first version) ── */
  const addClient = useCallback(async (formData) => {
    setIsLoading(true);
    try {
      const created = await clientService.createClient(formData);
      toast.success('Client registered successfully');
      await loadClients();
      return created;
    } catch (err) {
      const errorMsg = err?.message || 'Failed to create client';
      toast.error(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadClients]);

  /* ── Update existing client / version ── */
  const updateClient = useCallback(async (id, formData) => {
    setIsLoading(true);
    try {
      // If versionId is provided, call PUT /api/client-versions/{versionId}
      const rawVersionId = formData.clientDetailId || formData.versionId;
      const versionId = rawVersionId ? toIntegerVersionId(rawVersionId, null) : null;
      let result;
      if (versionId) {
        result = await clientService.updateClientVersion(versionId, formData);
      } else {
        // Fallback: update status if only status changed
        if (formData.isActive !== undefined) {
          result = await clientService.updateClientStatus(id, formData.isActive);
        }
      }
      toast.success('Client updated successfully');
      await loadClients();
      return result;
    } catch (err) {
      const errorMsg = err?.message || 'Failed to update client';
      toast.error(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadClients]);

  /* ── Add a new version (Today or future) ── */
  const addClientVersion = useCallback(async (clientId, formData) => {
    setIsLoading(true);
    try {
      const res = await clientService.addClientVersion(clientId, formData);
      toast.success('New client version created successfully');
      await loadClients();
      return res;
    } catch (err) {
      const errorMsg = err?.message || 'Failed to create client version';
      toast.error(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadClients]);

  /* ── Update an existing version ── */
  const updateClientVersion = useCallback(async (versionId, formData) => {
    setIsLoading(true);
    try {
      const numId = toIntegerVersionId(versionId) || Number(versionId);
      const res = await clientService.updateClientVersion(numId, formData);
      toast.success('Client revision updated successfully');
      await loadClients();
      return res;
    } catch (err) {
      const errorMsg = err?.message || 'Failed to update client revision';
      toast.error(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadClients]);

  /* ── Delete a scheduled version ── */
  const deleteClientVersion = useCallback(async (versionId) => {
    setIsLoading(true);
    try {
      const numId = toIntegerVersionId(versionId) || Number(versionId);
      await clientService.deleteClientVersion(numId);
      toast.success('Scheduled revision deleted successfully');
      await loadClients();
      return true;
    } catch (err) {
      const errorMsg = err?.message || 'Failed to delete client revision';
      toast.error(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadClients]);

  /* ── Update Client Versions directly (Backwards compatibility) ── */
  const updateClientVersions = useCallback(async (clientId, newVersionsArray) => {
    setClients((prev) =>
      prev.map((c) => {
        if (String(c.clientId) !== String(clientId) && String(c.id) !== String(clientId)) return c;
        return {
          ...c,
          effectiveVersions: newVersionsArray,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  }, []);

  /* ── Delete client and all versions (Admin only) ── */
  const deleteClient = useCallback(async (id) => {
    setIsLoading(true);
    try {
      await clientService.deleteClient(id);
      toast.success('Client deleted successfully');
      await loadClients();
      return true;
    } catch (err) {
      const errorMsg = err?.message || 'Failed to delete client';
      toast.error(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadClients]);

  /* ── Toggle client active status (Admin only) ── */
  const toggleClientActive = useCallback(async (id, currentIsActive) => {
    const nextActive = currentIsActive !== undefined ? !currentIsActive : true;
    try {
      await clientService.updateClientStatus(id, nextActive);
      toast.success(`Client marked as ${nextActive ? 'Active' : 'Inactive'}`);
      await loadClients();
      return true;
    } catch (err) {
      const errorMsg = err?.message || 'Failed to change client status';
      toast.error(errorMsg);
      throw err;
    }
  }, [loadClients]);

  return {
    clients: augmentedClients,
    filteredClients,
    summary,
    lookups,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    contactTypeFilter,
    setContactTypeFilter,
    pageNumber,
    setPageNumber,
    pageSize,
    setPageSize,
    totalCount,
    totalPages,
    isLoading,
    loadClients,
    loadLookups,
    ensureClientsLoaded,
    resetFilters,
    getClientById,
    fetchClientDetail,
    fetchVersionDetail,
    addClient,
    updateClient,
    addClientVersion,
    updateClientVersion,
    deleteClientVersion,
    updateClientVersions,
    deleteClient,
    toggleClientActive,
  };
}
