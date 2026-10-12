/**
 * useClients.js — Core state management and CRUD operations for the Clients module.
 *
 * MicroFlat ERP: Client registration with nested addresses and contacts.
 */

import { useState, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { mockClients } from '../../mocks/clients';

let nextClientNumber = mockClients.length + 1;

export function useClients() {
  const [clients, setClients] = useState(mockClients);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'
  const [contactTypeFilter, setContactTypeFilter] = useState('ALL'); // 'ALL' | 'Customer' | ...

  /* ── Filtered clients list ── */
  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();

    return clients.filter((client) => {
      // 1. Text Search across company, billing, email, GST, city, and contacts
      if (q) {
        const matchesCompany = client.companyName?.toLowerCase().includes(q);
        const matchesBilling = client.billingName?.toLowerCase().includes(q);
        const matchesEmail = client.email?.toLowerCase().includes(q);
        const matchesGst = client.gstNo?.toLowerCase().includes(q);

        // Search address cities
        const matchesCity = (client.addresses || []).some((a) =>
          a.city?.toLowerCase().includes(q)
        );

        // Search contact persons (names or mobile numbers)
        const matchesContact = (client.contacts || []).some((c) => {
          const fullName = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase();
          return (
            fullName.includes(q) ||
            c.mobile1?.toLowerCase().includes(q) ||
            c.mobile2?.toLowerCase().includes(q)
          );
        });

        if (!matchesCompany && !matchesBilling && !matchesEmail && !matchesGst && !matchesCity && !matchesContact) {
          return false;
        }
      }

      // 2. Status Filter
      if (statusFilter === 'ACTIVE' && !client.isActive) return false;
      if (statusFilter === 'INACTIVE' && client.isActive) return false;

      // 3. Contact Type Filter
      if (contactTypeFilter !== 'ALL' && client.contactTypeId !== contactTypeFilter) {
        return false;
      }

      return true;
    });
  }, [clients, search, statusFilter, contactTypeFilter]);

  /* ── Reset filters helper ── */
  const resetFilters = useCallback(() => {
    setSearch('');
    setStatusFilter('ALL');
    setContactTypeFilter('ALL');
  }, []);

  /* ── Find single client by ID ── */
  const getClientById = useCallback(
    (id) => {
      if (!id) return null;
      return clients.find((c) => c.clientId === id || c.id === id) || null;
    },
    [clients]
  );

  /* ── Add new client ── */
  const addClient = useCallback((formData) => {
    const padded = String(nextClientNumber++).padStart(3, '0');
    const newClientId = `cli-${padded}`;
    const now = new Date().toISOString();

    const newRecord = {
      ...formData,
      clientId: newClientId,
      id: newClientId,
      createdAt: now,
      updatedAt: null,
      addresses: Array.isArray(formData.addresses) ? formData.addresses : [],
      contacts: Array.isArray(formData.contacts) ? formData.contacts : [],
    };

    setClients((prev) => [newRecord, ...prev]);
    toast.success('Client created successfully');
    return newRecord;
  }, []);

  /* ── Update existing client ── */
  const updateClient = useCallback((id, formData) => {
    const now = new Date().toISOString();
    let updatedRecord = null;

    setClients((prev) =>
      prev.map((c) => {
        if (c.clientId === id || c.id === id) {
          updatedRecord = {
            ...c,
            ...formData,
            clientId: c.clientId || id,
            id: c.id || id,
            updatedAt: now,
            // Replaces nested arrays directly
            addresses: Array.isArray(formData.addresses) ? formData.addresses : c.addresses || [],
            contacts: Array.isArray(formData.contacts) ? formData.contacts : c.contacts || [],
          };
          return updatedRecord;
        }
        return c;
      })
    );

    toast.success('Client updated successfully');
    return updatedRecord;
  }, []);

  /* ── Delete client ── */
  const deleteClient = useCallback((id) => {
    // Note: In real system, verify if client has active Inquiries or Sales Orders before deletion
    setClients((prev) => prev.filter((c) => c.clientId !== id && c.id !== id));
    toast.success('Client deleted');
  }, []);

  /* ── Toggle client active status ── */
  const toggleClientActive = useCallback((id) => {
    const now = new Date().toISOString();

    setClients((prev) =>
      prev.map((c) => {
        if (c.clientId === id || c.id === id) {
          const nextActive = !c.isActive;
          toast.success(`Client marked as ${nextActive ? 'Active' : 'Inactive'}`);
          return {
            ...c,
            isActive: nextActive,
            updatedAt: now,
          };
        }
        return c;
      })
    );
  }, []);

  return {
    clients,
    filteredClients,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    contactTypeFilter,
    setContactTypeFilter,
    resetFilters,
    getClientById,
    addClient,
    updateClient,
    deleteClient,
    toggleClientActive,
  };
}
