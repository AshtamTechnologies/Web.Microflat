/**
 * useSeries.js — State management and API operations for Document Series Setup (Module-based).
 */

import { useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { documentSeriesService } from '../../services';
import {
  getActiveSeries,
  getSeriesStatus,
  normalizeDateString,
} from '../../utils/seriesUtils';

export function useSeries() {
  // Map of moduleId -> Array of series versions
  const [seriesByModule, setSeriesByModule] = useState({});
  // Map of moduleId -> active series version
  const [activeSeriesByModule, setActiveSeriesByModule] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // In-flight request tracker to prevent duplicate fetches
  const fetchingRef = useRef({});

  /**
   * Fetches all series versions for a module.
   * @param {number|string} moduleId
   * @param {boolean} [force=false]
   * @returns {Promise<Array<object>>}
   */
  const fetchVersionsForModule = useCallback(async (moduleId, force = false) => {
    if (!moduleId) return [];
    const moduleKey = String(moduleId);

    if (!force && fetchingRef.current[moduleKey]) {
      return fetchingRef.current[moduleKey];
    }

    const fetchPromise = (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await documentSeriesService.listSeries(moduleId);
        setSeriesByModule((prev) => ({
          ...prev,
          [moduleKey]: data,
        }));
        return data;
      } catch (err) {
        console.error('Failed to load series versions:', err);
        setError(err.message || 'Failed to load series history.');
        return [];
      } finally {
        setIsLoading(false);
        delete fetchingRef.current[moduleKey];
      }
    })();

    fetchingRef.current[moduleKey] = fetchPromise;
    return fetchPromise;
  }, []);

  /**
   * Fetches the current active series version for a module.
   * @param {number|string} moduleId
   * @returns {Promise<object|null>}
   */
  const fetchActiveVersion = useCallback(async (moduleId) => {
    if (!moduleId) return null;
    const moduleKey = String(moduleId);
    try {
      const active = await documentSeriesService.getCurrentSeries(moduleId);
      setActiveSeriesByModule((prev) => ({
        ...prev,
        [moduleKey]: active,
      }));
      return active;
    } catch (err) {
      console.error('Failed to load active series:', err);
      return null;
    }
  }, []);

  /**
   * Synchronously retrieves cached versions for a module.
   * @param {number|string} moduleId
   * @returns {Array<object>}
   */
  const getVersionsFor = useCallback(
    (moduleId) => {
      if (!moduleId) return [];
      const list = seriesByModule[String(moduleId)] || [];
      // Sort newest effectiveDate first
      return [...list].sort((a, b) => {
        const dateA = normalizeDateString(a.effectiveDate);
        const dateB = normalizeDateString(b.effectiveDate);
        if (dateB !== dateA) {
          return dateB.localeCompare(dateA);
        }
        return Number(b.id || 0) - Number(a.id || 0);
      });
    },
    [seriesByModule]
  );

  /**
   * Synchronously returns cached active version for a module.
   * @param {number|string} moduleId
   * @returns {object|null}
   */
  const getActiveVersion = useCallback(
    (moduleId) => {
      if (!moduleId) return null;
      const cached = activeSeriesByModule[String(moduleId)];
      if (cached) return cached;
      const versions = seriesByModule[String(moduleId)] || [];
      return getActiveSeries(versions, new Date());
    },
    [activeSeriesByModule, seriesByModule]
  );

  /**
   * Adds a new series version for a module.
   * @param {number|string} moduleId
   * @param {object} formData
   * @returns {Promise<{ ok: boolean, error?: string, status?: number, version?: object }>}
   */
  const addVersion = useCallback(
    async (moduleId, formData) => {
      try {
        const payload = {
          ...formData,
          moduleId: Number(moduleId),
        };
        const created = await documentSeriesService.createSeries(payload);

        toast.success('Series version saved successfully');

        // Refresh list and active version
        await fetchVersionsForModule(moduleId, true);
        await fetchActiveVersion(moduleId);

        return { ok: true, version: created };
      } catch (err) {
        const msg = err.message || 'Failed to save series version.';
        toast.error(msg);
        return {
          ok: false,
          error: msg,
          status: err.status,
          fieldErrors: err.fieldErrors,
        };
      }
    },
    [fetchVersionsForModule, fetchActiveVersion]
  );

  /**
   * Updates an existing series version.
   * @param {number|string} seriesId
   * @param {object} formData
   * @param {number|string} [moduleId]
   * @returns {Promise<{ ok: boolean, error?: string, status?: number, version?: object }>}
   */
  const updateVersion = useCallback(
    async (seriesId, formData, moduleId) => {
      try {
        const payload = {
          ...formData,
          moduleId: Number(moduleId || formData.moduleId),
        };
        const updated = await documentSeriesService.updateSeries(seriesId, payload);

        toast.success('Series version updated successfully');

        const mId = moduleId || updated.moduleId;
        if (mId) {
          await fetchVersionsForModule(mId, true);
          await fetchActiveVersion(mId);
        }

        return { ok: true, version: updated };
      } catch (err) {
        const msg = err.message || 'Failed to update series version.';
        toast.error(msg);
        return {
          ok: false,
          error: msg,
          status: err.status,
          fieldErrors: err.fieldErrors,
        };
      }
    },
    [fetchVersionsForModule, fetchActiveVersion]
  );

  /**
   * Deletes an unused series version.
   * @param {number|string} seriesId
   * @param {number|string} [moduleId]
   * @returns {Promise<{ ok: boolean, error?: string }>}
   */
  const deleteVersion = useCallback(
    async (seriesId, moduleId) => {
      try {
        await documentSeriesService.deleteSeries(seriesId);
        toast.success('Series version deleted successfully');

        if (moduleId) {
          await fetchVersionsForModule(moduleId, true);
          await fetchActiveVersion(moduleId);
        }

        return { ok: true };
      } catch (err) {
        const msg = err.message || 'Failed to delete series version.';
        toast.error(msg);
        return { ok: false, error: msg, status: err.status };
      }
    },
    [fetchVersionsForModule, fetchActiveVersion]
  );

  return {
    isLoading,
    error,
    fetchVersionsForModule,
    fetchVersionsForType: fetchVersionsForModule, // alias
    fetchActiveVersion,
    getVersionsFor,
    getActiveVersion,
    addVersion,
    updateVersion,
    deleteVersion,
    getSeriesStatus: (version, versions, asOf) =>
      getSeriesStatus(version, versions, asOf),
  };
}
