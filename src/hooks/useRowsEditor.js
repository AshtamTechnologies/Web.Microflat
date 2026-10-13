/**
 * useRowsEditor.js — Shared State Machine for Child Row Editors (Addresses, Contacts, etc.)
 *
 * Implements the standard "form above, grid below, edit-in-place" pattern:
 *   - Form fields controlled by `formState`
 *   - Track `editingId` (null when in Add mode)
 *   - Add appends with temporary ID and resets form
 *   - Edit loads row into form, switches action button to Update + Cancel
 *   - Remove deletes row immediately (clearing edit state if currently editing)
 *   - Row-level Active status toggling
 */

import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export function useRowsEditor({
  rows = [],
  onChange,
  initialFormValues = {},
  idField = 'id',
  rowName = 'Row',
  validateRow,
  canRemove = () => true,
}) {
  const [formState, setFormState] = useState({ ...initialFormValues });
  const [editingId, setEditingId] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const editingIndex = editingId
    ? rows.findIndex((row) => (row[idField] || row.id) === editingId)
    : -1;

  const isEditing = editingIndex !== -1;

  // Generic form field updater
  const handleFieldChange = useCallback((field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      if (prev[field]) {
        const next = { ...prev };
        delete next[field];
        return next;
      }
      return prev;
    });
  }, []);

  // Cancel edit mode and reset form
  const handleCancelEdit = useCallback(() => {
    setFormState({ ...initialFormValues });
    setEditingId(null);
    setFieldErrors({});
  }, [initialFormValues]);

  // Add or Update row
  const handleAddOrUpdate = useCallback(() => {
    if (typeof validateRow === 'function') {
      const errors = validateRow(formState);
      if (errors && Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        const firstErr = Object.values(errors)[0];
        toast.error(firstErr || `Please fill all required ${rowName.toLowerCase()} fields`);
        return false;
      }
    }

    setFieldErrors({});

    if (isEditing) {
      // Update in place
      const updatedRow = {
        ...rows[editingIndex],
        ...formState,
        updatedAt: new Date().toISOString(),
      };

      const nextRows = [...rows];
      nextRows[editingIndex] = updatedRow;

      if (typeof onChange === 'function') {
        onChange(nextRows);
      }

      toast.success(`${rowName} updated`);
      setFormState({ ...initialFormValues });
      setEditingId(null);
      return true;
    } else {
      // Append new row with temporary local ID
      const newId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const newRow = {
        ...formState,
        [idField]: newId,
        id: newId,
        createdAt: new Date().toISOString(),
        updatedAt: null,
      };

      const nextRows = [...rows, newRow];
      if (typeof onChange === 'function') {
        onChange(nextRows);
      }

      toast.success(`${rowName} added`);
      setFormState({ ...initialFormValues });
      return true;
    }
  }, [formState, isEditing, rows, editingIndex, idField, initialFormValues, onChange, rowName, validateRow]);

  // Start editing a specific row
  const handleStartEdit = useCallback(
    (row) => {
      const rowId = row[idField] || row.id;
      setEditingId(rowId);
      setFormState({ ...row });
      setFieldErrors({});
    },
    [idField]
  );

  // Remove a row immediately
  const handleRemove = useCallback(
    (rowId) => {
      const targetRow = rows.find((r) => (r[idField] || r.id) === rowId);
      if (targetRow && typeof canRemove === 'function' && !canRemove(targetRow)) {
        toast.error(`Cannot remove this ${rowName.toLowerCase()}`);
        return;
      }

      const nextRows = rows.filter((r) => (r[idField] || r.id) !== rowId);
      if (typeof onChange === 'function') {
        onChange(nextRows);
      }
      toast.success(`${rowName} removed`);

      // If removing currently edited row, reset form
      if (editingId === rowId) {
        handleCancelEdit();
      }
    },
    [canRemove, editingId, handleCancelEdit, idField, onChange, rowName, rows]
  );

  // Remove multiple rows
  const handleRemoveMultiple = useCallback(
    (rowIds) => {
      if (!Array.isArray(rowIds) || rowIds.length === 0) return;
      const filteredIds = rowIds.filter((id) => {
        const r = rows.find((row) => (row[idField] || row.id) === id);
        return !r || (typeof canRemove === 'function' ? canRemove(r) : true);
      });

      if (filteredIds.length === 0) {
        toast.error(`Selected ${rowName.toLowerCase()}s cannot be removed`);
        return;
      }

      const idSet = new Set(filteredIds);
      const nextRows = rows.filter((r) => !idSet.has(r[idField] || r.id));
      if (typeof onChange === 'function') {
        onChange(nextRows);
      }
      toast.success(
        `${filteredIds.length} ${
          filteredIds.length === 1 ? rowName.toLowerCase() : `${rowName.toLowerCase()}s`
        } removed`
      );

      // If removing currently edited row, reset form
      if (editingId && idSet.has(editingId)) {
        handleCancelEdit();
      }
    },
    [canRemove, editingId, handleCancelEdit, idField, onChange, rowName, rows]
  );

  // Toggle active status of a single row
  const handleToggleRowActive = useCallback(
    (rowId) => {
      const nextRows = rows.map((r) => {
        if ((r[idField] || r.id) === rowId) {
          const nextActive = !r.isActive;
          toast.success(`${rowName} marked as ${nextActive ? 'Active' : 'Inactive'}`);
          return {
            ...r,
            isActive: nextActive,
            updatedAt: new Date().toISOString(),
          };
        }
        return r;
      });

      if (typeof onChange === 'function') {
        onChange(nextRows);
      }
    },
    [idField, onChange, rowName, rows]
  );

  return {
    formState,
    setFormState,
    handleFieldChange,
    fieldErrors,
    setFieldErrors,
    editingId,
    isEditing,
    editingIndex,
    handleAddOrUpdate,
    handleStartEdit,
    handleCancelEdit,
    handleRemove,
    handleRemoveMultiple,
    handleToggleRowActive,
    canRemove,
  };
}
