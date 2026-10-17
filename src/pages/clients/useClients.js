/**
 * useClients.js — Core state management and CRUD operations for the Clients module.
 *
 * MicroFlat ERP: Client registration with nested addresses and contacts.
 */

import { useState, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { mockClients } from '../../mocks/clients';
import { getActiveClientVersion } from '../../utils/clientVersions';

let nextClientNumber = mockClients.length + 1;

export function useClients() {
  const [clients, setClients] = useState(mockClients);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'
  const [contactTypeFilter, setContactTypeFilter] = useState('ALL'); // 'ALL' | 'Customer' | ...

  /* ── Augmented clients list with activeVersion spread ── */
  const augmentedClients = useMemo(() => {
    return clients.map((c) => {
      const activeVersion = getActiveClientVersion(c);
      const effDate =
        c.effectiveDate ||
        activeVersion?.effectiveDate ||
        (c.createdAt ? c.createdAt.slice(0, 10) : '');

      return {
        ...c,
        ...(activeVersion
          ? {
              effectiveDate: effDate,
              companyName: activeVersion.companyName || c.companyName,
              billingName: activeVersion.billingName || c.billingName,
              contactTypeId: activeVersion.contactTypeId || c.contactTypeId,
              email: activeVersion.email || c.email,
              gstNo: activeVersion.gstNo || c.gstNo,
              paymentTerms: activeVersion.paymentTerms || c.paymentTerms,
              deliveryTerms: activeVersion.deliveryTerms || c.deliveryTerms,
              comments: activeVersion.comments || c.comments,
              contacts: activeVersion.contacts || c.contacts || [],
              addresses: activeVersion.addresses || c.addresses || [],
            }
          : {
              effectiveDate: effDate,
            }),
        activeVersion,
        effectiveDate: effDate,
        effectiveVersions: c.effectiveVersions || (activeVersion ? [activeVersion] : []),
        id: c.clientId || c.id,
      };
    });
  }, [clients]);

  /* ── Filtered clients list ── */
  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();

    return augmentedClients.filter((client) => {
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
  }, [augmentedClients, search, statusFilter, contactTypeFilter]);

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
      return augmentedClients.find((c) => c.clientId === id || c.id === id) || null;
    },
    [augmentedClients]
  );

  /* ── Add new client ── */
  const addClient = useCallback((formData) => {
    const padded = String(nextClientNumber++).padStart(3, '0');
    const newClientId = `cli-${padded}`;
    const now = new Date().toISOString();
    const effectiveDate = formData.effectiveDate || now.slice(0, 10);

    const initialVersion = {
      id: `ver_${newClientId}_1`,
      effectiveDate,
      companyName: formData.companyName || '',
      billingName: formData.billingName || '',
      contactTypeId: formData.contactTypeId || 'Customer',
      email: formData.email || '',
      gstNo: formData.gstNo || '',
      isActive: formData.isActive !== false,
      paymentTerms: Array.isArray(formData.paymentTerms) ? formData.paymentTerms : [],
      deliveryTerms: formData.deliveryTerms || '',
      comments: formData.comments || '',
      addresses: Array.isArray(formData.addresses) ? formData.addresses : [],
      contacts: Array.isArray(formData.contacts) ? formData.contacts : [],
      createdOn: now,
    };

    const newRecord = {
      ...formData,
      clientId: newClientId,
      id: newClientId,
      effectiveDate,
      effectiveVersions: Array.isArray(formData.effectiveVersions) && formData.effectiveVersions.length > 0
        ? formData.effectiveVersions
        : [initialVersion],
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
          const effectiveDate = formData.effectiveDate || c.effectiveDate || now.slice(0, 10);
          const currentVersions = Array.isArray(c.effectiveVersions) && c.effectiveVersions.length > 0
            ? [...c.effectiveVersions]
            : [
                {
                  id: `ver_${id}_orig`,
                  effectiveDate: c.effectiveDate || (c.createdAt ? c.createdAt.slice(0, 10) : now.slice(0, 10)),
                  companyName: c.companyName || '',
                  billingName: c.billingName || '',
                  contactTypeId: c.contactTypeId || 'Customer',
                  email: c.email || '',
                  gstNo: c.gstNo || '',
                  isActive: c.isActive !== false,
                  paymentTerms: c.paymentTerms || [],
                  deliveryTerms: c.deliveryTerms || '',
                  comments: c.comments || '',
                  addresses: c.addresses || [],
                  contacts: c.contacts || [],
                  createdOn: c.createdAt || now,
                },
              ];

          // Check if version with this effectiveDate already exists
          const existingIdx = currentVersions.findIndex(
            (v) => (v.effectiveDate || '').slice(0, 10) === effectiveDate
          );

          const updatedVersionPayload = {
            id: existingIdx >= 0 ? currentVersions[existingIdx].id : `ver_${id}_${Date.now()}`,
            effectiveDate,
            companyName: formData.companyName !== undefined ? formData.companyName : c.companyName,
            billingName: formData.billingName !== undefined ? formData.billingName : c.billingName,
            contactTypeId: formData.contactTypeId !== undefined ? formData.contactTypeId : c.contactTypeId,
            email: formData.email !== undefined ? formData.email : c.email,
            gstNo: formData.gstNo !== undefined ? formData.gstNo : c.gstNo,
            isActive: formData.isActive !== undefined ? formData.isActive : c.isActive,
            paymentTerms: formData.paymentTerms !== undefined ? formData.paymentTerms : c.paymentTerms,
            deliveryTerms: formData.deliveryTerms !== undefined ? formData.deliveryTerms : c.deliveryTerms,
            comments: formData.comments !== undefined ? formData.comments : c.comments,
            addresses: Array.isArray(formData.addresses) ? formData.addresses : c.addresses || [],
            contacts: Array.isArray(formData.contacts) ? formData.contacts : c.contacts || [],
            updatedAt: now,
          };

          let newVersions;
          if (existingIdx >= 0) {
            newVersions = [...currentVersions];
            newVersions[existingIdx] = { ...currentVersions[existingIdx], ...updatedVersionPayload };
          } else {
            newVersions = [updatedVersionPayload, ...currentVersions];
          }

          updatedRecord = {
            ...c,
            ...formData,
            clientId: c.clientId || id,
            id: c.id || id,
            effectiveDate,
            effectiveVersions: formData.effectiveVersions || newVersions,
            updatedAt: now,
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

  /* ── Update Client Versions directly ── */
  const updateClientVersions = useCallback((clientId, newVersionsArray) => {
    const now = new Date().toISOString();
    setClients((prev) =>
      prev.map((c) => {
        if (c.clientId !== clientId && c.id !== clientId) return c;
        return {
          ...c,
          effectiveVersions: newVersionsArray,
          updatedAt: now,
        };
      })
    );
    toast.success('Revisions updated successfully');
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
    clients: augmentedClients,
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
    updateClientVersions,
    deleteClient,
    toggleClientActive,
  };
}
