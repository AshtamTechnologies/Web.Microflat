/**
 * ProductFilterBar.jsx — Responsive, comfortable filter toolbar for products matching Swagger Image 1.
 */

import React, { useMemo } from 'react';
import {
  Input,
  SearchableSelect,
  Button,
  FilterBar,
} from '../../../components/ui';
import {
  IconSearch,
  IconReset,
  IconClose,
} from '../../../constants/icons';
import { ApprovalStatus } from '../../../constants/approvalStatus';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

function extractVal(e) {
  if (e && typeof e === 'object' && 'target' in e) {
    return e.target?.value;
  }
  return e;
}

export default function ProductFilterBar({
  search,
  setSearch,
  categoryId,
  setCategoryId,
  materialId,
  setMaterialId,
  uomId,
  setUomId,
  approvalStatus,
  setApprovalStatus,
  statusFilter,
  setStatusFilter,
  lookups,
  hasActiveFilters,
  onReset,
}) {
  // Category dropdown options
  const categoryOptions = useMemo(() => {
    const list = (lookups?.categories || []).map((c) => ({
      value: String(c.id),
      label: `${c.categoryCode ? c.categoryCode + ' - ' : ''}${c.categoryName}`,
    }));
    return [{ value: 'ALL', label: 'All Categories' }, ...list];
  }, [lookups?.categories]);

  // Material dropdown options
  const materialOptions = useMemo(() => {
    const list = (lookups?.materials || []).map((m) => ({
      value: String(m.id),
      label: m.materialName,
    }));
    return [{ value: 'ALL', label: 'All Materials' }, ...list];
  }, [lookups?.materials]);

  // UOM dropdown options
  const uomOptions = useMemo(() => {
    const list = (lookups?.uoms || []).map((u) => ({
      value: String(u.id),
      label: `${u.uomName}${u.description ? ` (${u.description})` : ''}`,
    }));
    return [{ value: 'ALL', label: 'All UOMs' }, ...list];
  }, [lookups?.uoms]);

  // Approval status options
  const approvalOptions = useMemo(() => {
    return [
      { value: 'ALL', label: 'All Approvals' },
      { value: String(ApprovalStatus.Approved), label: 'Approved' },
      { value: String(ApprovalStatus.Pending), label: 'Pending' },
      { value: String(ApprovalStatus.Rejected), label: 'Rejected' },
      { value: String(ApprovalStatus.Draft), label: 'Draft' },
    ];
  }, []);

  return (
    <FilterBar className="p-3 bg-surface border border-border rounded-xl shadow-2xs w-full">
      <div className="flex flex-wrap items-center gap-2.5 w-full">
        {/* 1. Search */}
        <div className="flex-1 min-w-[200px]">
          <Input
            size="sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code or name..."
            leftIcon={<IconSearch size={15} className="text-muted-foreground" />}
            rightElement={
              search ? (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Clear search"
                >
                  <IconClose size={13} />
                </button>
              ) : null
            }
            className="w-full text-xs"
          />
        </div>

        {/* 2. Category */}
        <div className="w-full sm:w-48 shrink-0">
          <SearchableSelect
            id="filter-category"
            placeholder="All Categories"
            value={categoryId && categoryId !== 'ALL' ? String(categoryId) : 'ALL'}
            onChange={(e) => setCategoryId(extractVal(e) || 'ALL')}
            options={categoryOptions}
            size="sm"
            className="w-full text-xs"
          />
        </div>

        {/* 3. Material */}
        <div className="w-full sm:w-44 shrink-0">
          <SearchableSelect
            id="filter-material"
            placeholder="All Materials"
            value={materialId && materialId !== 'ALL' ? String(materialId) : 'ALL'}
            onChange={(e) => setMaterialId(extractVal(e) || 'ALL')}
            options={materialOptions}
            size="sm"
            className="w-full text-xs"
          />
        </div>

        {/* 4. UOM */}
        <div className="w-full sm:w-36 shrink-0">
          <SearchableSelect
            id="filter-uom"
            placeholder="All UOMs"
            value={uomId && uomId !== 'ALL' ? String(uomId) : 'ALL'}
            onChange={(e) => setUomId(extractVal(e) || 'ALL')}
            options={uomOptions}
            size="sm"
            className="w-full text-xs"
          />
        </div>

        {/* 5. Approval Status */}
        <div className="w-full sm:w-40 shrink-0">
          <SearchableSelect
            id="filter-approval"
            placeholder="All Approvals"
            value={approvalStatus && approvalStatus !== 'ALL' ? String(approvalStatus) : 'ALL'}
            onChange={(e) => setApprovalStatus(extractVal(e) || 'ALL')}
            options={approvalOptions}
            size="sm"
            className="w-full text-xs"
          />
        </div>

        {/* 6. Active Status */}
        <div className="w-full sm:w-36 shrink-0">
          <SearchableSelect
            id="filter-status"
            placeholder="All Statuses"
            value={statusFilter}
            onChange={(e) => setStatusFilter(extractVal(e) || 'ALL')}
            options={STATUS_OPTIONS}
            size="sm"
            className="w-full text-xs"
          />
        </div>

        {/* Reset button */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="shrink-0 text-muted-foreground hover:text-foreground h-9 text-xs"
            title="Reset Filters"
          >
            <IconReset size={14} className="mr-1.5" />
            <span>Reset</span>
          </Button>
        )}
      </div>
    </FilterBar>
  );
}
