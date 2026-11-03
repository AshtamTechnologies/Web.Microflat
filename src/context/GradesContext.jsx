/**
 * src/context/GradesContext.jsx — Grades context wired to backend APIs.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { gradesService } from '../services';

const GradesContext = createContext(null);

export function GradesProvider({ children }) {
  const location = useLocation();
  const [hasRequested, setHasRequested] = useState(false);
  const isRelevantRoute = Boolean(
    location?.pathname?.startsWith('/configuration/grades') ||
    location?.pathname?.startsWith('/inquiries')
  );
  const shouldFetch = isRelevantRoute || hasRequested;

  const ensureGradesLoaded = useCallback(() => {
    setHasRequested(true);
  }, []);

  const [gradesList, setGradesList] = useState([]);
  const [pagination, setPagination] = useState({
    pageNumber: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFilters, setLastFilters] = useState({});
  const initialFetchDone = useRef(false);

  /**
   * Fetches paged grades from GET /api/grades with search, isActive, pageNumber, pageSize.
   */
  const fetchGrades = useCallback(async (filters = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      initialFetchDone.current = true;
      const res = await gradesService.listGrades(filters);
      setGradesList(res.items || []);
      setPagination({
        pageNumber: res.pageNumber || 1,
        pageSize: res.pageSize || 10,
        totalCount: res.totalCount || 0,
        totalPages: res.totalPages || 1,
      });
      setLastFilters(filters);
      return res;
    } catch (err) {
      const msg = err.message || 'Failed to load grades.';
      setError(msg);
      return { items: [], totalCount: 0, pageNumber: 1, pageSize: 10, totalPages: 1 };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load when relevant route is visited or requested
  useEffect(() => {
    if (!shouldFetch) return;
    if (!initialFetchDone.current) {
      fetchGrades({ pageNumber: 1, pageSize: 10 });
    }
  }, [shouldFetch, fetchGrades]);

  /**
   * Synchronous helper to find a grade by ID in current loaded state.
   */
  const getGradeById = useCallback(
    (id) => {
      return gradesList.find((g) => String(g.id) === String(id)) || null;
    },
    [gradesList]
  );

  /**
   * Fetches fresh single Grade from GET /api/grades/{id}.
   */
  const fetchGradeById = useCallback(async (id) => {
    try {
      const data = await gradesService.getGrade(id);
      return data;
    } catch (err) {
      const msg = err.message || 'Failed to fetch grade details.';
      toast.error(msg);
      throw err;
    }
  }, []);

  /**
   * Creates a new Grade via POST /api/grades.
   */
  const addGrade = useCallback(
    async (formData) => {
      try {
        const created = await gradesService.createGrade(formData);
        toast.success('Grade added successfully');
        await fetchGrades(lastFilters);
        return created;
      } catch (err) {
        const msg = err.message || 'Failed to create grade.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchGrades, lastFilters]
  );

  /**
   * Updates an existing Grade via PUT /api/grades/{id}.
   */
  const updateGrade = useCallback(
    async (id, formData) => {
      try {
        const updated = await gradesService.updateGrade(id, formData);
        toast.success('Grade updated successfully');
        await fetchGrades(lastFilters);
        return updated;
      } catch (err) {
        const msg = err.message || 'Failed to update grade.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchGrades, lastFilters]
  );

  /**
   * Updates Grade status via PATCH /api/grades/{id}/status.
   */
  const updateGradeStatus = useCallback(
    async (id, isActive) => {
      const nextActive = Boolean(isActive);

      // Optimistic update
      setGradesList((prev) =>
        prev.map((g) => {
          if (String(g.id) === String(id)) {
            return { ...g, isActive: nextActive };
          }
          return g;
        })
      );

      try {
        await gradesService.updateGradeStatus(id, nextActive);
        toast.success(nextActive ? 'Grade activated' : 'Grade deactivated');
        await fetchGrades(lastFilters);
      } catch (err) {
        // Rollback
        setGradesList((prev) =>
          prev.map((g) => {
            if (String(g.id) === String(id)) {
              return { ...g, isActive: !nextActive };
            }
            return g;
          })
        );
        const msg = err.message || 'Failed to update grade status.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchGrades, lastFilters]
  );

  const value = {
    gradesList,
    pagination,
    isLoading,
    error,
    lastFilters,
    fetchGrades,
    getGradeById,
    fetchGradeById,
    addGrade,
    updateGrade,
    updateGradeStatus,
    ensureGradesLoaded,
  };

  return <GradesContext.Provider value={value}>{children}</GradesContext.Provider>;
}

export function useGradesContext() {
  const ctx = useContext(GradesContext);
  if (!ctx) {
    throw new Error('useGradesContext must be used within a GradesProvider');
  }
  return ctx;
}

