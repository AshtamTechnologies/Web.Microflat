/**
 * ProductStandardsEditor.jsx — Sub-component for managing product standards and precision grade mapping.
 *
 * Capabilities:
 * - Link manufacturing and calibration standards (IS 7327, DIN 876, BS 817, ASME B89.3.7, etc.).
 * - Integrates with Task 54's Standard → Grade mapping (StandardsContext).
 * - Displays mapped precision grades for each standard (e.g. Gr-00, Gr-0, Gr-1, Gr-2, Gr-3).
 * - Supports product-level grade applicability: inherit all mapped grades or specify custom allowed grades.
 * - Enforces single primary standard with radio selection and auto-promotion.
 * - Prevents duplicate standard selection across rows.
 */

import React, { useState, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Button,
  SearchableSelect,
  Badge,
  Card,
  TableContainer,
  ConfirmModal,
  Th,
  Td,
} from '../../../components/ui';
import {
  IconAdd,
  IconDelete,
  IconStandards,
  IconCheck,
  IconInfo,
  IconShieldCheck,
  IconRefresh,
} from '../../../constants/icons';
import { useStandardsContext } from '../../../context/StandardsContext';

export default function ProductStandardsEditor({
  standards = [],
  onChange,
  availableStandards = [],
  readOnly = false,
  gradeMapping: propGradeMapping = null,
}) {
  const standardsCtx = useStandardsContext?.() || {};
  const { gradeMapping: contextGradeMapping = [], fetchGradeMapping } = standardsCtx;

  // Active grade mapping from props or context
  const activeGradeMapping = useMemo(() => {
    if (propGradeMapping && Array.isArray(propGradeMapping)) return propGradeMapping;
    if (contextGradeMapping && Array.isArray(contextGradeMapping)) return contextGradeMapping;
    return [];
  }, [propGradeMapping, contextGradeMapping]);

  // Ensure grade mapping is loaded if empty
  useEffect(() => {
    if (activeGradeMapping.length === 0 && typeof fetchGradeMapping === 'function') {
      fetchGradeMapping().catch(() => {});
    }
  }, [activeGradeMapping.length, fetchGradeMapping]);

  // Set of all selected standard IDs to prevent duplicate additions
  const selectedStandardIds = useMemo(() => {
    return new Set(
      standards
        .map((s) => Number(s.standardId || s.id))
        .filter((id) => !isNaN(id) && id > 0)
    );
  }, [standards]);

  // Handler to add a new standard row
  const handleAdd = () => {
    if (standards.length >= availableStandards.length) return;

    // Find the first unselected standard to suggest
    const firstUnused = availableStandards.find((s) => !selectedStandardIds.has(Number(s.id)));
    const isFirst = standards.length === 0;

    const nextList = [
      ...standards,
      {
        standardId: firstUnused ? Number(firstUnused.id) : '',
        standardCode: firstUnused?.standardCode || '',
        isPrimary: isFirst,
        applicableGradeIds: null, // null = inherit all grades mapped to this standard
      },
    ];
    onChange?.(nextList);
  };

  const [indexToDelete, setIndexToDelete] = useState(null);

  // Handler to confirm delete of a standard row
  const handleConfirmDelete = () => {
    if (indexToDelete === null) return;
    const itemToRemove = standards[indexToDelete];
    const nextList = standards.filter((_, i) => i !== indexToDelete);

    // If removed item was primary and there are remaining items, promote the first one to primary
    if (itemToRemove?.isPrimary && nextList.length > 0) {
      nextList[0].isPrimary = true;
    }
    onChange?.(nextList);
    setIndexToDelete(null);
  };

  // Handler to change standard dropdown for a row
  const handleChangeStandard = (index, val) => {
    const rawId = val && typeof val === 'object' && 'target' in val ? val.target.value : val;
    const id = Number(rawId);
    const matched = availableStandards.find((s) => Number(s.id) === id);
    const nextList = [...standards];
    nextList[index] = {
      ...nextList[index],
      standardId: id,
      standardCode: matched?.standardCode || '',
      applicableGradeIds: null, // Reset to inherit all when standard changes
    };
    onChange?.(nextList);
  };

  // Handler to designate standard as primary
  const handleSetPrimary = (index) => {
    const nextList = standards.map((item, i) => ({
      ...item,
      isPrimary: i === index,
    }));
    onChange?.(nextList);
  };

  // Handler to toggle an individual grade for a standard
  const handleToggleGrade = (standardIndex, gradeId, allGradeIds) => {
    if (readOnly) return;
    const item = standards[standardIndex];
    const currentApplicable = item.applicableGradeIds;
    let nextApplicable;

    if (!currentApplicable || !Array.isArray(currentApplicable)) {
      // Currently inheriting all
      if (allGradeIds.length <= 1) {
        toast.error('At least one grade must be selected.');
        return;
      }
      nextApplicable = allGradeIds.filter((id) => id !== gradeId);
    } else {
      const exists = currentApplicable.includes(gradeId);
      if (exists) {
        // At least one grade must remain selected at all times
        if (currentApplicable.length <= 1) {
          toast.error('At least one grade must be selected.');
          return;
        }
        nextApplicable = currentApplicable.filter((id) => id !== gradeId);
      } else {
        nextApplicable = [...currentApplicable, gradeId];
      }
      // If all grades are re-selected, reset back to null (inherit all)
      if (nextApplicable.length === allGradeIds.length) {
        nextApplicable = null;
      }
    }

    const nextList = [...standards];
    nextList[standardIndex] = {
      ...nextList[standardIndex],
      applicableGradeIds: nextApplicable,
    };
    onChange?.(nextList);
  };

  // Handler to reset a standard's grades to inherit all
  const handleResetToAllGrades = (standardIndex) => {
    if (readOnly) return;
    const nextList = [...standards];
    nextList[standardIndex] = {
      ...nextList[standardIndex],
      applicableGradeIds: null,
    };
    onChange?.(nextList);
  };

  return (
    <div className="space-y-3.5">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconStandards size={18} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Applicable Standards & Grades</h3>
          <span className="text-xs text-muted-foreground">({standards.length})</span>
        </div>
        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAdd}
            className="flex items-center gap-1.5"
            disabled={standards.length >= availableStandards.length}
          >
            <IconAdd size={14} />
            <span>Add Standard</span>
          </Button>
        )}
      </div>

      {standards.length === 0 ? (
        <div className="p-6 text-center rounded-lg border border-dashed border-border bg-muted/20 text-muted-foreground text-xs space-y-2">
          <IconStandards size={24} className="mx-auto text-muted-foreground/60" />
          <p>No manufacturing standards linked to this product yet.</p>
          {!readOnly && (
            <Button type="button" variant="outline" size="xs" onClick={handleAdd}>
              <IconAdd size={12} className="mr-1" />
              Link First Standard
            </Button>
          )}
        </div>
      ) : (
        <TableContainer
          className="border border-border rounded-lg overflow-x-auto"
          tableClassName="w-full text-xs table-auto"
        >
          <thead className="bg-surface border-b border-border">
            <tr>
              <Th className="w-16 text-center">Primary</Th>
              <Th className="w-56 min-w-[200px]">Standard</Th>
              <Th className="min-w-[280px]">Allowed Precision Grades</Th>
              {!readOnly && <Th className="w-16 text-center">Action</Th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {standards.map((item, index) => {
              const currentId = item.standardId || item.id ? Number(item.standardId || item.id) : '';

              // Mapped grades for this standard from global standard-grade mapping
              const mapping = activeGradeMapping.find((m) => Number(m.standardId) === currentId);
              const mappedGrades = (mapping?.grades || []).filter((g) => g.isGradeActive !== false);
              const allGradeIds = mappedGrades.map((g) => Number(g.gradeId));

              // Applicability state
              const isAllInherited = !item.applicableGradeIds || !Array.isArray(item.applicableGradeIds);
              const activeGradeIdSet = isAllInherited
                ? new Set(allGradeIds)
                : new Set((item.applicableGradeIds || []).map(Number));

              // Filter available standards dropdown to prevent duplicates
              const standardOptions = availableStandards
                .filter((s) => !selectedStandardIds.has(Number(s.id)) || Number(s.id) === currentId)
                .map((s) => ({
                  value: Number(s.id),
                  label: s.standardCode,
                }));

              return (
                <tr key={index} className="hover:bg-muted/10 transition-colors align-top">
                  {/* Primary Standard Radio / Badge */}
                  <td className="p-3 text-center align-middle">
                    {readOnly ? (
                      item.isPrimary ? (
                        <Badge variant="success" size="sm" className="font-medium">
                          Primary
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <input
                          type="radio"
                          name="primaryStandard"
                          checked={Boolean(item.isPrimary)}
                          onChange={() => handleSetPrimary(index)}
                          className="h-4 w-4 text-primary cursor-pointer accent-primary"
                          title="Set as primary manufacturing standard"
                        />
                        {item.isPrimary && (
                          <span className="text-3xs font-semibold text-primary uppercase">Primary</span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Standard Code Selector / Label */}
                  <td className="p-3">
                    {readOnly ? (
                      <div>
                        <span className="font-mono font-semibold text-sm text-foreground">
                          {item.standardCode ||
                            availableStandards.find((s) => Number(s.id) === currentId)?.standardCode ||
                            `Standard #${currentId}`}
                        </span>
                        {mapping?.description && (
                          <p className="text-2xs text-muted-foreground mt-0.5 line-clamp-1">
                            {mapping.description}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <SearchableSelect
                          value={currentId || ''}
                          onChange={(val) => handleChangeStandard(index, val)}
                          options={standardOptions}
                          placeholder="Select Standard"
                          className="w-full"
                          size="sm"
                        />
                        {mapping?.description && (
                          <p className="text-3xs text-muted-foreground line-clamp-1 pl-1">
                            {mapping.description}
                          </p>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Allowed Precision Grades Column */}
                  <td className="p-3">
                    {!currentId ? (
                      <span className="text-2xs text-muted-foreground italic">
                        Select a standard to view mapped precision grades.
                      </span>
                    ) : mappedGrades.length === 0 ? (
                      <div className="flex items-center gap-1.5 text-2xs text-amber-600 dark:text-amber-400">
                        <IconInfo size={13} className="shrink-0" />
                        <span>No precision grades mapped to this standard in master setup.</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {readOnly ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {mappedGrades.map((grade) => {
                              const isSelected = activeGradeIdSet.has(Number(grade.gradeId));
                              if (!isSelected) return null;
                              return (
                                <Badge
                                  key={grade.gradeId}
                                  variant="neutral"
                                  size="sm"
                                  className="font-mono text-xs font-semibold px-2 py-0.5"
                                  title={`Grade ${grade.gradeCode}`}
                                >
                                  {grade.gradeCode}
                                </Badge>
                              );
                            })}
                          </div>
                        ) : (
                          <>
                            {/* Label Row */}
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-foreground">Allowed Grades:</span>
                              <button
                                type="button"
                                onClick={() => handleResetToAllGrades(index)}
                                className={`text-xs font-medium transition-colors cursor-pointer ${
                                  isAllInherited || activeGradeIdSet.size === mappedGrades.length
                                    ? 'text-muted-foreground'
                                    : 'text-primary hover:underline'
                                }`}
                                title="Select all available grades"
                              >
                                Select All
                              </button>
                            </div>

                            {/* Checkbox List */}
                            <div className="flex flex-wrap items-center gap-3 pt-0.5">
                              {mappedGrades.map((grade) => {
                                const gradeId = Number(grade.gradeId);
                                const isSelected = activeGradeIdSet.has(gradeId);

                                return (
                                  <label
                                    key={grade.gradeId}
                                    className="inline-flex items-center gap-1.5 cursor-pointer select-none text-xs font-mono text-foreground"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => handleToggleGrade(index, gradeId, allGradeIds)}
                                      className="h-4 w-4 rounded border-border text-primary accent-primary cursor-pointer"
                                    />
                                    <span>{grade.gradeCode}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Actions Column */}
                  {!readOnly && (
                    <td className="p-3 text-center align-middle">
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => setIndexToDelete(index)}
                        className="text-danger hover:bg-danger/10"
                        title="Remove standard"
                      >
                        <IconDelete size={14} />
                      </Button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </TableContainer>
      )}



      {/* Confirmation Modal for Standard Removal */}
      <ConfirmModal
        isOpen={indexToDelete !== null}
        onClose={() => setIndexToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Remove Standard"
        message={`Are you sure you want to remove standard "${
          standards[indexToDelete]?.standardCode ||
          availableStandards.find(
            (s) => Number(s.id) === Number(standards[indexToDelete]?.standardId || standards[indexToDelete]?.id)
          )?.standardCode ||
          'Standard'
        }" from this product?`}
        confirmText="Remove"
        variant="danger"
      />
    </div>
  );
}
