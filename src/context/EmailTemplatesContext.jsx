/**
 * src/context/EmailTemplatesContext.jsx — Email Templates state management wired to real API service.
 * Conforms to Section 5.4i of Frontend-API-Guide 1.md.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { emailTemplatesService } from '../services';

const EmailTemplatesContext = createContext(null);

export function EmailTemplatesProvider({ children }) {
  const location = useLocation();
  const [hasRequested, setHasRequested] = useState(false);

  const isRelevantRoute = Boolean(
    location?.pathname?.startsWith('/configuration/email-templates')
  );
  const shouldFetch = isRelevantRoute || hasRequested;

  const ensureTemplatesLoaded = useCallback(() => {
    setHasRequested(true);
  }, []);

  const [templates, setTemplates] = useState([]);
  const [modules, setModules] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const modulesLoaded = useRef(false);

  /**
   * Fetches the list of email templates with optional filters.
   *
   * @param {{ search?: string, moduleName?: string, status?: string, pageNumber?: number, pageSize?: number }} [filters]
   */
  const fetchTemplates = useCallback(async (filters = {}) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await emailTemplatesService.listEmailTemplates(filters);
      const items = result.items || [];
      setTemplates(items);
      setTotalCount(result.totalCount ?? items.length);
      setPageNumber(result.pageNumber ?? 1);
      setPageSize(result.pageSize ?? 10);
      setTotalPages(result.totalPages ?? 1);

      return result;
    } catch (err) {
      const msg = err.message || 'Failed to load email templates.';
      setError(msg);
      return { items: [], totalCount: 0, pageNumber: 1, pageSize: 10, totalPages: 1 };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetches active modules for the module dropdown.
   */
  const fetchModules = useCallback(async () => {
    try {
      const data = await emailTemplatesService.listModules({ isActive: true });
      if (Array.isArray(data) && data.length > 0) {
        setModules(data);
      }
      return data;
    } catch (err) {
      console.warn('Failed to load modules:', err);
      return [];
    }
  }, []);

  /**
   * Fetches a single email template by ID.
   */
  const getTemplateById = useCallback(async (id) => {
    try {
      return await emailTemplatesService.getEmailTemplate(id);
    } catch (err) {
      const msg = err.message || 'Failed to fetch email template details.';
      toast.error(msg);
      throw err;
    }
  }, []);

  /**
   * Fetches a single email template by code.
   */
  const getTemplateByCode = useCallback(async (code) => {
    try {
      return await emailTemplatesService.getEmailTemplateByCode(code);
    } catch (err) {
      const msg = err.message || `Failed to fetch template '${code}'.`;
      toast.error(msg);
      throw err;
    }
  }, []);

  /**
   * Automatically load modules when navigating into the Email Templates section.
   */
  useEffect(() => {
    if (!shouldFetch) return;
    if (!modulesLoaded.current) {
      modulesLoaded.current = true;
      fetchModules();
    }
  }, [shouldFetch, fetchModules]);

  /**
   * Creates a new email template (Admin only).
   */
  const createTemplate = useCallback(
    async (formData) => {
      try {
        setIsLoading(true);
        const created = await emailTemplatesService.createEmailTemplate(formData);
        if (created) {
          setTemplates((prev) => [created, ...prev]);
          setTotalCount((c) => c + 1);
          toast.success(`Email template '${created.templateName}' created successfully.`);
        }
        return created;
      } catch (err) {
        const msg = err.message || 'Failed to create email template.';
        toast.error(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Updates an existing email template (Admin only).
   */
  const updateTemplate = useCallback(
    async (id, formData) => {
      try {
        setIsLoading(true);
        const updated = await emailTemplatesService.updateEmailTemplate(id, formData);
        if (updated) {
          setTemplates((prev) =>
            prev.map((t) => (String(t.id) === String(id) ? updated : t))
          );
          toast.success(`Email template '${updated.templateName}' updated successfully.`);
        }
        return updated;
      } catch (err) {
        const msg = err.message || 'Failed to update email template.';
        toast.error(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Updates the Active / Inactive status of an email template via PATCH /api/email-templates/{id}/status.
   */
  const toggleStatus = useCallback(
    async (id, statusOrCurrent) => {
      const newStatus =
        statusOrCurrent === 'Active' || statusOrCurrent === 'Inactive'
          ? statusOrCurrent
          : String(statusOrCurrent).toLowerCase() === 'active'
          ? 'Inactive'
          : 'Active';

      try {
        await emailTemplatesService.changeEmailTemplateStatus(id, newStatus);
        setTemplates((prev) =>
          prev.map((t) =>
            String(t.id) === String(id)
              ? { ...t, status: newStatus, isActive: newStatus === 'Active' }
              : t
          )
        );
        toast.success(`Template status set to ${newStatus}.`);
        return true;
      } catch (err) {
        const msg = err.message || 'Failed to update template status.';
        toast.error(msg);
        throw err;
      }
    },
    []
  );

  /**
   * Deletes an email template.
   * Catches 409 Conflict if the template has already been used in email logs.
   */
  const deleteTemplate = useCallback(
    async (id, templateName = '') => {
      try {
        await emailTemplatesService.deleteEmailTemplate(id);
        setTemplates((prev) => prev.filter((t) => String(t.id) !== String(id)));
        setTotalCount((c) => Math.max(0, c - 1));
        toast.success(
          templateName
            ? `Email template '${templateName}' deleted.`
            : 'Email template deleted successfully.'
        );
        return true;
      } catch (err) {
        if (err.status === 409 || err.statusCode === 409) {
          toast.error(
            'Cannot delete this template because it has already been used in email logs. You can deactivate it instead.'
          );
        } else {
          const msg = err.message || 'Failed to delete email template.';
          toast.error(msg);
        }
        throw err;
      }
    },
    []
  );

  /**
   * Live preview with substituted values.
   */
  const previewTemplate = useCallback(async (id, values = {}) => {
    try {
      return await emailTemplatesService.previewEmailTemplate(id, values);
    } catch (err) {
      const msg = err.message || 'Failed to generate preview.';
      toast.error(msg);
      throw err;
    }
  }, []);

  /**
   * Ad-hoc test send email template.
   */
  const sendTemplate = useCallback(async (payload) => {
    try {
      const result = await emailTemplatesService.sendEmailTemplate(payload);
      toast.success('Test email dispatched successfully.');
      return result;
    } catch (err) {
      const msg = err.message || 'Failed to send email.';
      toast.error(msg);
      throw err;
    }
  }, []);

  const value = {
    templates,
    modules,
    totalCount,
    pageNumber,
    pageSize,
    totalPages,
    isLoading,
    error,
    ensureTemplatesLoaded,
    fetchTemplates,
    fetchModules,
    getTemplateById,
    getTemplateByCode,
    createTemplate,
    updateTemplate,
    toggleStatus,
    deleteTemplate,
    previewTemplate,
    sendTemplate,
  };

  return (
    <EmailTemplatesContext.Provider value={value}>
      {children}
    </EmailTemplatesContext.Provider>
  );
}

export function useEmailTemplates() {
  const context = useContext(EmailTemplatesContext);
  if (!context) {
    throw new Error('useEmailTemplates must be used within an EmailTemplatesProvider');
  }
  return context;
}

