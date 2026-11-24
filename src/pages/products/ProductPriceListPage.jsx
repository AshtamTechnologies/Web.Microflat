/**
 * ProductPriceListPage.jsx — Global Master Price List console for MicroFlat.
 * Displays, filters, and manages list prices, lead times, and manufacturing standard rates.
 * Aligned with ProductPrice-Taxation-API.md § 2 and ProductPriceList.md § 3.3.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
} from '@tanstack/react-table';
import toast from 'react-hot-toast';
import {
  PageHeader,
  Card,
  Button,
  DataTable,
  StatusBadge,
  Badge,
  ConfirmModal,
  TableActions,
  Input,
  SearchableSelect,
  FilterBar,
} from '../../components/ui';
import {
  IconAdd,
  IconSearch,
  IconReset,
  IconProduct,
  IconEdit,
  IconDelete,
  IconView,
  IconCreditCard,
  IconClock,
  IconLayers,
  IconTag,
  IconCheck,
} from '../../constants/icons';
import { productService } from '../../services';
import ProductPriceModal from './components/ProductPriceModal';
import ProductSelect from './components/ProductSelect';
import ProductPriceViewModal from './components/ProductPriceViewModal';

const columnHelper = createColumnHelper();

export default function ProductPriceListPage() {
  const navigate = useNavigate();

  // Price List State
  const [prices, setPrices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  // Filter States
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('ALL');
  const [productId, setProductId] = useState('ALL');
  const [standardId, setStandardId] = useState('ALL');
  const [gradeId, setGradeId] = useState('ALL');
  const [currencyId, setCurrencyId] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Lookups & Dropdowns
  const [lookups, setLookups] = useState({});
  const [allProductsList, setAllProductsList] = useState([]);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingPriceId, setViewingPriceId] = useState(null);
  const [priceToDelete, setPriceToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load Lookups on Mount
  useEffect(() => {
    let isMounted = true;
    async function loadMeta() {
      try {
        const [lk, prods] = await Promise.all([
          productService.getProductLookups().catch(() => ({})),
          productService.listProducts({ pageSize: 100 }).catch(() => ({ items: [] })),
        ]);
        if (isMounted) {
          setLookups(lk || {});
          setAllProductsList(prods?.items || []);
        }
      } catch (err) {
        console.warn('Failed to load pricing lookups:', err);
      }
    }
    loadMeta();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch Prices from Backend
  const loadPrices = useCallback(async () => {
    setIsLoading(true);
    try {
      const query = {
        pageNumber,
        pageSize,
      };

      if (search.trim()) query.search = search.trim();
      if (categoryId !== 'ALL' && categoryId) query.categoryId = Number(categoryId);
      if (productId !== 'ALL' && productId) query.productId = Number(productId);
      if (standardId !== 'ALL' && standardId) query.standardId = Number(standardId);
      if (gradeId !== 'ALL' && gradeId) query.gradeId = Number(gradeId);
      if (currencyId !== 'ALL' && currencyId) query.currencyId = Number(currencyId);
      if (statusFilter === 'ACTIVE') query.isActive = true;
      else if (statusFilter === 'INACTIVE') query.isActive = false;

      const res = await productService.listProductPrices(query);
      setPrices(res.items || []);
      setTotalCount(res.totalCount || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      toast.error(err?.message || 'Failed to load product prices');
    } finally {
      setIsLoading(false);
    }
  }, [
    pageNumber,
    pageSize,
    search,
    categoryId,
    productId,
    standardId,
    gradeId,
    currencyId,
    statusFilter,
  ]);

  useEffect(() => {
    loadPrices();
  }, [loadPrices]);

  // Reset to page 1 on filter changes
  const handleFilterChange = (setter) => (val) => {
    setter(val);
    setPageNumber(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setCategoryId('ALL');
    setProductId('ALL');
    setStandardId('ALL');
    setGradeId('ALL');
    setCurrencyId('ALL');
    setStatusFilter('ALL');
    setPageNumber(1);
  };

  const hasActiveFilters = useMemo(() => {
    return (
      Boolean(search.trim()) ||
      categoryId !== 'ALL' ||
      productId !== 'ALL' ||
      standardId !== 'ALL' ||
      gradeId !== 'ALL' ||
      currencyId !== 'ALL' ||
      statusFilter !== 'ALL'
    );
  }, [search, categoryId, productId, standardId, gradeId, currencyId, statusFilter]);


  // View Price Handler (GET /api/product-prices/{id})
  const handleViewPrice = (priceIdOrRow) => {
    const id = typeof priceIdOrRow === 'object' ? priceIdOrRow.id : priceIdOrRow;
    setViewingPriceId(id);
    setIsViewModalOpen(true);
  };

  // Edit Price Handler (Fetches fresh data via GET /api/product-prices/{id})
  const handleEditPrice = async (priceIdOrRow) => {
    const id = typeof priceIdOrRow === 'object' ? priceIdOrRow.id : priceIdOrRow;
    try {
      const detail = await productService.getProductPriceById(id);
      setEditingPrice(detail || priceIdOrRow);
    } catch (err) {
      console.warn('Failed to fetch price details for edit, falling back:', err);
      setEditingPrice(typeof priceIdOrRow === 'object' ? priceIdOrRow : { id });
    } finally {
      setIsModalOpen(true);
    }
  };

  // Delete Handler (kept for backward compatibility)
  const handleDeletePrice = async () => {
    if (!priceToDelete) return;
    setIsDeleting(true);
    try {
      await productService.deleteProductPrice(priceToDelete.id);
      toast.success('Product price deleted successfully');
      setPriceToDelete(null);
      loadPrices();
    } catch (err) {
      toast.error(err?.message || 'Failed to delete price');
    } finally {
      setIsDeleting(false);
    }
  };

  // TanStack Table Column Definitions
  const columns = useMemo(
    () => [
      // 1. Product & Code
      columnHelper.accessor('productCode', {
        header: 'PRODUCT',
        minSize: 180,
        size: 220,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex flex-col py-0.5">
              <Link
                to={`/products/${row.productId}`}
                className="font-mono text-xs font-bold text-primary hover:underline flex items-center gap-1.5"
                title="View product master"
              >
                {row.productCode}
              </Link>
              <span className="text-2xs text-heading font-medium truncate max-w-[200px]" title={row.productName}>
                {row.productName}
              </span>
              {row.categoryName && (
                <span className="text-3xs text-text-muted mt-0.5">
                  {row.categoryName} {row.uomName ? `• ${row.uomName}` : ''}
                </span>
              )}
            </div>
          );
        },
      }),

      // 2. Variant / Size
      columnHelper.accessor('variantCode', {
        header: 'VARIANT / SIZE',
        minSize: 140,
        size: 160,
        cell: (info) => {
          const val = info.getValue();
          return val ? (
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-surface border border-border text-heading">
              {val}
            </span>
          ) : (
            <span className="text-2xs text-text-muted italic">Base Product</span>
          );
        },
      }),

      // 3. Manufacturing Standard
      columnHelper.accessor('standardCode', {
        header: 'STANDARD',
        minSize: 130,
        size: 150,
        cell: (info) => {
          const val = info.getValue();
          return val ? (
            <Badge variant="neutral" size="sm" className="font-mono text-3xs">
              {val}
            </Badge>
          ) : (
            <span className="text-text-muted text-xs">—</span>
          );
        },
      }),

      // 4. Precision Grade
      columnHelper.accessor('gradeCode', {
        header: 'GRADE',
        minSize: 110,
        size: 120,
        cell: (info) => {
          const val = info.getValue();
          return val ? (
            <span className="font-mono text-xs font-semibold text-heading px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
              {val}
            </span>
          ) : (
            <span className="text-text-muted text-xs">—</span>
          );
        },
      }),

      // 5. Unit Price
      columnHelper.accessor('unitPrice', {
        header: 'UNIT PRICE',
        minSize: 130,
        size: 150,
        cell: (info) => {
          const row = info.row.original;
          const num = Number(row.unitPrice || 0);
          const sym = row.currencySymbol || (row.currencyCode === 'INR' ? '₹' : row.currencyCode || '₹');
          return (
            <div className="flex flex-col">
              <span className="font-mono text-xs font-medium text-heading tabular-nums">
                {sym} {num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-3xs text-text-muted">
                {row.currencyCode || 'INR'} (excl. tax)
              </span>
            </div>
          );
        },
      }),

      // 6. Status
      columnHelper.accessor('isActive', {
        header: 'STATUS',
        minSize: 90,
        size: 100,
        cell: (info) => {
          const val = info.getValue();
          return (
            <Badge variant={val ? 'active' : 'inactive'} size="sm">
              {val ? 'Active' : 'Inactive'}
            </Badge>
          );
        },
      }),

      // 7. Actions (View & Edit)
      columnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        minSize: 85,
        size: 90,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-text-muted hover:text-heading hover:bg-surface"
                onClick={() => handleViewPrice(row.id)}
                title="View price configuration"
              >
                <IconView size={14} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-primary hover:bg-primary/10"
                onClick={() => handleEditPrice(row.id)}
                title="Edit price configuration"
              >
                <IconEdit size={14} />
              </Button>
            </div>
          );
        },
      }),
    ],
    []
  );

  const table = useReactTable({
    data: prices,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
    state: {
      pagination: {
        pageIndex: pageNumber - 1,
        pageSize,
      },
    },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === 'function'
          ? updater({ pageIndex: pageNumber - 1, pageSize })
          : updater;
      setPageNumber(next.pageIndex + 1);
      setPageSize(next.pageSize);
    },
  });

  // Filter Dropdown Options
  const categoryOptions = useMemo(() => {
    const list = (lookups?.categories || []).map((c) => ({
      value: String(c.id),
      label: c.categoryName,
    }));
    return [{ value: 'ALL', label: 'All Categories' }, ...list];
  }, [lookups?.categories]);

  const productOptions = useMemo(() => {
    const list = allProductsList.map((p) => ({
      value: String(p.id),
      label: `${p.productCode} — ${p.productName}`,
    }));
    return [{ value: 'ALL', label: 'All Products' }, ...list];
  }, [allProductsList]);

  const standardOptions = useMemo(() => {
    const list = (lookups?.standards || []).map((s) => ({
      value: String(s.id),
      label: s.standardCode || s.name,
    }));
    return [{ value: 'ALL', label: 'All Standards' }, ...list];
  }, [lookups?.standards]);

  const gradeOptions = useMemo(() => {
    const list = (lookups?.grades || []).map((g) => ({
      value: String(g.id),
      label: g.gradeCode || g.name,
    }));
    return [{ value: 'ALL', label: 'All Grades' }, ...list];
  }, [lookups?.grades]);

  const currencyOptions = useMemo(() => {
    const list = (lookups?.currencies || []).map((c) => ({
      value: String(c.id),
      label: c.currencyCode,
    }));
    return [{ value: 'ALL', label: 'All Currencies' }, ...list];
  }, [lookups?.currencies]);

  const statusOptions = [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
  ];

  return (
    <div className="w-full space-y-6 pb-12">
      {/* ── Page Header ── */}
      <PageHeader
        title="Product Price List"
        subtitle="Manage master unit prices, delivery lead times, and standard-grade configuration rates"
        icon={<IconCreditCard className="h-6 w-6 text-primary" />}
        badge={
          <span className="font-mono text-xs font-bold px-2.5 py-0.5 bg-primary/10 text-primary rounded-md border border-primary/20">
            {totalCount} Configurations
          </span>
        }
        actions={
          <Button
            type="button"
            variant="primary"
            size="sm"
            icon={IconAdd}
            onClick={() => {
              setEditingPrice(null);
              setIsModalOpen(true);
            }}
            className="text-xs font-semibold h-8 px-3.5 shadow-2xs"
          >
            Add Price
          </Button>
        }
      />

      {/* ── Filters Bar ── */}
      <FilterBar className="p-3 bg-surface border border-border rounded-xl shadow-2xs w-full">
        <div className="flex flex-wrap items-center gap-2.5 w-full">
          {/* Search Box */}
          <div className="flex-1 min-w-[220px]">
            <Input
              size="sm"
              value={search}
              onChange={(e) => handleFilterChange(setSearch)(e.target.value)}
              placeholder="Search code, name, variant..."
              leftIcon={<IconSearch size={14} className="text-text-muted" />}
            />
          </div>

          {/* Category Dropdown */}
          <div className="w-[160px] sm:w-[180px]">
            <SearchableSelect
              size="sm"
              options={categoryOptions}
              value={categoryId}
              onChange={(e) => handleFilterChange(setCategoryId)(e?.target?.value ?? e)}
              placeholder="All Categories"
            />
          </div>

          {/* Product Dropdown (Paginated & Searchable) */}
          <div className="w-[180px] sm:w-[220px]">
            <ProductSelect
              id="filter-product"
              size="sm"
              value={productId}
              onChange={(e) => handleFilterChange(setProductId)(e?.target?.value ?? e)}
              placeholder="All Products"
              showAllOption
              allOptionLabel="All Products"
              categoryId={categoryId !== 'ALL' ? categoryId : undefined}
            />
          </div>

          {/* Standard Dropdown */}
          <div className="w-[140px] sm:w-[160px]">
            <SearchableSelect
              size="sm"
              options={standardOptions}
              value={standardId}
              onChange={(e) => handleFilterChange(setStandardId)(e?.target?.value ?? e)}
              placeholder="All Standards"
            />
          </div>

          {/* Grade Dropdown */}
          <div className="w-[130px] sm:w-[140px]">
            <SearchableSelect
              size="sm"
              options={gradeOptions}
              value={gradeId}
              onChange={(e) => handleFilterChange(setGradeId)(e?.target?.value ?? e)}
              placeholder="All Grades"
            />
          </div>

          {/* Currency Dropdown */}
          <div className="w-[120px] sm:w-[130px]">
            <SearchableSelect
              size="sm"
              options={currencyOptions}
              value={currencyId}
              onChange={(e) => handleFilterChange(setCurrencyId)(e?.target?.value ?? e)}
              placeholder="All Currencies"
            />
          </div>

          {/* Status Dropdown */}
          <div className="w-[120px] sm:w-[130px]">
            <SearchableSelect
              size="sm"
              options={statusOptions}
              value={statusFilter}
              onChange={(e) => handleFilterChange(setStatusFilter)(e?.target?.value ?? e)}
              placeholder="All Statuses"
            />
          </div>

          {/* Reset Action */}
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon={IconReset}
              onClick={handleResetFilters}
              className="text-xs text-text-muted hover:text-heading h-8 px-2"
            >
              Reset
            </Button>
          )}
        </div>
      </FilterBar>

      {/* ── Main Data Table with Mobile Responsive Cards ── */}
      <DataTable
        table={table}
        columns={columns}
        isLoading={isLoading}
        totalCount={totalCount}
        entityName="rates"
        emptyTitle="No product price configurations found"
        emptyDescription="Try adjusting your search criteria or clearing filters."
        renderMobileCard={(row) => {
          const item = row.original;
          const num = Number(item.unitPrice || 0);
          const sym = item.currencySymbol || (item.currencyCode === 'INR' ? '₹' : item.currencyCode || '₹');

          return (
            <div
              key={item.id}
              className="bg-surface border border-border rounded-xl p-4 shadow-2xs space-y-3"
            >
              {/* Card Header: Product Code, Price, and Status */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      to={`/products/${item.productId}`}
                      className="font-mono text-xs font-bold text-primary hover:underline"
                    >
                      {item.productCode}
                    </Link>
                    <Badge variant={item.isActive ? 'active' : 'inactive'} size="sm">
                      {item.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <h4 className="text-sm font-bold text-heading mt-0.5 truncate" title={item.productName}>
                    {item.productName}
                  </h4>
                  {item.categoryName && (
                    <span className="text-3xs text-text-muted block">
                      {item.categoryName} {item.uomName ? `• ${item.uomName}` : ''}
                    </span>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono text-sm font-medium text-heading tabular-nums block">
                    {sym} {num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-3xs text-text-muted block">
                    {item.currencyCode || 'INR'} (excl. tax)
                  </span>
                </div>
              </div>

              {/* Card Details: Variant, Standard, Grade, Delivery */}
              <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-border/60 text-xs">
                <div>
                  <span className="text-3xs text-text-muted uppercase font-semibold block">Variant / Size</span>
                  {item.variantCode ? (
                    <span className="font-mono text-xs font-semibold text-heading px-1.5 py-0.5 rounded bg-surface border border-border inline-block mt-0.5">
                      {item.variantCode}
                    </span>
                  ) : (
                    <span className="text-2xs text-text-muted italic">Base Product</span>
                  )}
                </div>

                <div>
                  <span className="text-3xs text-text-muted uppercase font-semibold block">Standard & Grade</span>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {item.standardCode ? (
                      <Badge variant="neutral" size="sm" className="font-mono text-3xs">
                        {item.standardCode}
                      </Badge>
                    ) : (
                      <span className="text-text-muted text-xs">—</span>
                    )}
                    {item.gradeCode && (
                      <span className="font-mono text-3xs font-semibold px-1 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {item.gradeCode}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-3xs text-text-muted uppercase font-semibold block">Lead Time</span>
                  <span className="text-xs font-medium text-heading mt-0.5 inline-flex items-center gap-1 font-mono">
                    <IconClock size={12} className="text-text-muted" />
                    {item.deliveryWeeks !== null && item.deliveryWeeks !== undefined ? `${item.deliveryWeeks} wks` : '—'}
                  </span>
                </div>

                {item.remarks && (
                  <div>
                    <span className="text-3xs text-text-muted uppercase font-semibold block">Remarks</span>
                    <span className="text-3xs text-text-muted mt-0.5 block truncate" title={item.remarks}>
                      {item.remarks}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons Footer (Consistent secondary buttons) */}
              <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleViewPrice(item.id)}
                  className="flex-1 text-xs font-semibold h-8 justify-center gap-1.5"
                >
                  <IconView size={13} />
                  View
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleEditPrice(item.id)}
                  className="flex-1 text-xs font-semibold h-8 justify-center gap-1.5"
                >
                  <IconEdit size={13} />
                  Edit
                </Button>
              </div>
            </div>
          );
        }}
      />

      {/* ── View Price Modal ── */}
      <ProductPriceViewModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setViewingPriceId(null);
        }}
        priceId={viewingPriceId}
        onEdit={(priceDetail) => {
          setEditingPrice(priceDetail);
          setIsModalOpen(true);
        }}
      />

      {/* ── Add / Edit Price Modal ── */}
      {isModalOpen && (
        <ProductPriceModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingPrice(null);
          }}
          onSuccess={loadPrices}
          priceData={editingPrice}
          lookups={lookups}
        />
      )}

      {/* ── Delete Confirmation Modal ── */}
      {priceToDelete && (
        <ConfirmModal
          isOpen={Boolean(priceToDelete)}
          onClose={() => setPriceToDelete(null)}
          onConfirm={handleDeletePrice}
          isLoading={isDeleting}
          title="Delete Price Configuration"
          confirmText="Delete Price"
          confirmVariant="danger"
        >
          <div className="space-y-2 text-xs text-text-muted">
            <p>
              Are you sure you want to permanently delete the price for{' '}
              <strong className="text-heading">{priceToDelete.productCode}</strong>
              {priceToDelete.variantCode ? ` (${priceToDelete.variantCode})` : ''}?
            </p>
            <p className="p-2.5 rounded-lg bg-warning/10 border border-warning/20 text-warning-dark">
              <strong>Tip:</strong> If this product was previously quoted, consider setting it to{' '}
              <strong>Inactive</strong> instead of deleting it, so past documents retain historical accuracy.
            </p>
          </div>
        </ConfirmModal>
      )}
    </div>
  );
}
