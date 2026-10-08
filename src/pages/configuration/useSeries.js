/**
 * useSeries.js — State management and CRUD operations for Document Series Setup.
 */

import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { mockSeries } from '../../mocks/series';
import {
  getActiveSeries,
  getSeriesStatus,
  formatAuditTimestamp,
  normalizeDateString,
} from '../../utils/seriesUtils';
import { getSeriesTypeByKey } from '../../config/seriesTypes';

let nextSeriesSeq = 100;

export function useSeries(initialSeries = mockSeries) {
  const [seriesList, setSeriesList] = useState(initialSeries);

  /**
   * Retrieves all versions for a given document type, sorted by effectiveDate descending.
   * @param {string} docType
   * @returns {Array<object>}
   */
  const getVersionsFor = useCallback(
    (docType) => {
      if (!docType) return [];
      const normalized = docType.toLowerCase();

      const matched = seriesList.filter(
        (s) => (s.docType || '').toLowerCase() === normalized
      );

      // Sort by effectiveDate descending
      return [...matched].sort((a, b) => {
        if (b.effectiveDate !== a.effectiveDate) {
          return b.effectiveDate.localeCompare(a.effectiveDate);
        }
        return String(b.id || '').localeCompare(String(a.id || ''));
      });
    },
    [seriesList]
  );

  /**
   * Returns the currently active series version for a docType.
   * @param {string} docType
   * @param {Date|string} asOf
   * @returns {object|null}
   */
  const getActiveVersion = useCallback(
    (docType, asOf = new Date()) => {
      const versions = getVersionsFor(docType);
      return getActiveSeries(versions, asOf);
    },
    [getVersionsFor]
  );

  /**
   * Adds a new series version for a document type.
   * @param {string} docType
   * @param {object} formData
   * @returns {Promise<{ ok: boolean, error?: string, version?: object }>}
   */
  const addVersion = useCallback(
    async (docType, formData) => {
      const typeInfo = getSeriesTypeByKey(docType);
      const docTypeKey = (docType || typeInfo.key).toLowerCase();
      const existingVersions = seriesList.filter(
        (s) => (s.docType || '').toLowerCase() === docTypeKey
      );

      const effectiveDateStr = normalizeDateString(formData.effectiveDate);

      // Check for duplicate effectiveDate
      const hasDuplicateDate = existingVersions.some(
        (v) => normalizeDateString(v.effectiveDate) === effectiveDateStr
      );

      if (hasDuplicateDate) {
        const msg = `A series version with effective date ${effectiveDateStr} already exists for ${typeInfo.label}.`;
        toast.error(msg);
        return { ok: false, error: msg };
      }

      // Check for backdating (cannot be earlier than today)
      const todayStr = normalizeDateString(new Date());
      if (effectiveDateStr < todayStr) {
        const msg = 'Effective Date cannot be earlier than today.';
        toast.error(msg);
        return { ok: false, error: msg };
      }

      // Simulate network latency
      await new Promise((r) => setTimeout(r, 500));

      const newVersion = {
        id: `ser_${docTypeKey}_${Date.now()}_${nextSeriesSeq++}`,
        docType: docTypeKey,
        prefix: (formData.prefix || typeInfo.defaultPrefix || 'DOC').trim().toUpperCase(),
        separator: formData.separator === 'None' ? '' : (formData.separator ?? '-'),
        yearFormat: formData.yearFormat || 'YYYY',
        numberLength: Math.max(3, Math.min(10, Number(formData.numberLength) || 6)),
        startingNumber: Math.max(1, Number(formData.startingNumber) || 1),
        resetCounter: formData.resetCounter || 'Yearly',
        effectiveDate: effectiveDateStr,
        createdBy: 'Ian Chesnut',
        createdOn: formatAuditTimestamp(),
      };

      setSeriesList((prev) => [newVersion, ...prev]);

      const typeShort = typeInfo.shortLabel || typeInfo.label;
      toast.success(`${typeShort} series added`);

      return { ok: true, version: newVersion };
    },
    [seriesList]
  );

  /**
   * Updates an existing series version.
   * @param {string} versionId
   * @param {object} formData
   * @returns {Promise<{ ok: boolean, error?: string, version?: object }>}
   */
  const updateVersion = useCallback(
    async (versionId, formData) => {
      const target = seriesList.find((s) => s.id === versionId);
      if (!target) {
        toast.error('Series version not found.');
        return { ok: false, error: 'Not found' };
      }

      const typeInfo = getSeriesTypeByKey(target.docType);
      const effectiveDateStr = normalizeDateString(formData.effectiveDate || target.effectiveDate);

      // Check if duplicate date with another version (excluding this one)
      const duplicate = seriesList.find(
        (s) =>
          s.id !== versionId &&
          (s.docType || '').toLowerCase() === target.docType.toLowerCase() &&
          normalizeDateString(s.effectiveDate) === effectiveDateStr
      );

      if (duplicate) {
        const msg = `Another series version with effective date ${effectiveDateStr} already exists.`;
        toast.error(msg);
        return { ok: false, error: msg };
      }

      // Simulate slight latency
      await new Promise((r) => setTimeout(r, 300));

      const updated = {
        ...target,
        prefix: (formData.prefix || target.prefix || 'DOC').trim().toUpperCase(),
        separator: formData.separator === 'None' ? '' : (formData.separator ?? target.separator ?? '-'),
        yearFormat: formData.yearFormat || target.yearFormat || 'YYYY',
        numberLength: Math.max(3, Math.min(10, Number(formData.numberLength) || target.numberLength || 6)),
        startingNumber: Math.max(1, Number(formData.startingNumber) || target.startingNumber || 1),
        resetCounter: formData.resetCounter || target.resetCounter || 'Yearly',
        effectiveDate: effectiveDateStr,
      };

      setSeriesList((prev) => prev.map((s) => (s.id === versionId ? updated : s)));

      const typeShort = typeInfo.shortLabel || typeInfo.label;
      toast.success(`${typeShort} series version updated`);

      return { ok: true, version: updated };
    },
    [seriesList]
  );

  return {
    allSeries: seriesList,
    getVersionsFor,
    getActiveVersion,
    addVersion,
    updateVersion,
    getSeriesStatus: (version, docType, asOf) =>
      getSeriesStatus(version, getVersionsFor(docType || version?.docType), asOf),
  };
}
