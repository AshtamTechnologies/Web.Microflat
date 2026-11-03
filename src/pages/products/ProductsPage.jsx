/**
 * ProductsPage.jsx — Product Master list, summary KPI cards, filters, and management table.
 */

import React, { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  IconAdd,
  IconProduct,
  IconView,
  IconEdit,
  IconDelete,
} from '../../constants/icons';
import {
  Button,
  DataTable,
  PageHeader,
  StatusBadge,
  Badge,
  ConfirmModal,
  TableActions,
} from '../../components/ui';
import { useProductsContext } from '../../context/ProductsContext';
import ProductSummaryCards from './components/ProductSummaryCards';
import ProductFilterBar from './components/ProductFilterBar';
import { ApprovalStatus } from '../../constants/approvalStatus';

const columnHelper = createColumnHelper();

export default function ProductsPage() {
  const navigate = useNavigate();
  const {
    products,
    isLoading,
    totalCount,
    pageNumber,
    setPageNumber,
    pageSize,
    setPageSize,
    summary,
    isLoadingSummary,
    lookups,
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
    hasActiveFilters,
    resetFilters,
    toggleProductStatus,
    deleteProduct,
  } = useProductsContext();

  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // TanStack table columns
  const columns = useMemo(
    () => [
      // 1. Product Code
      columnHelper.accessor('productCode', {
        header: 'PRODUCT CODE',
        minSize: 140,
        size: 160,
        cell: (info) => {
          const row = info.row.original;
          return (
            <Link
              to={`/products/${row.id}`}
              className="font-mono text-xs font-semibold text-primary hover:underline"
            >
              {row.productCode}
            </Link>
          );
        },
      }),

      // 2. Product Name
      columnHelper.accessor('productName', {
        header: 'PRODUCT NAME',
        minSize: 200,
        size: 240,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex flex-col py-0.5">
              <Link
                to={`/products/${row.id}`}
                className="font-semibold text-foreground text-sm hover:text-primary transition-colors truncate"
              >
                {row.productName}
              </Link>
              {row.finishType && (
                <span className="text-2xs text-muted-foreground truncate">
                  Finish: {row.finishType}
                </span>
              )}
            </div>
          );
        },
      }),

      // 3. Category
      columnHelper.accessor('categoryName', {
        header: 'CATEGORY',
        minSize: 160,
        size: 180,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex flex-col">
              <span className="text-xs font-medium text-foreground truncate">
                {row.categoryName || '—'}
              </span>
              {row.categoryCode && (
                <span className="text-2xs font-mono text-muted-foreground">
                  {row.categoryCode}
                </span>
              )}
            </div>
          );
        },
      }),

      // 4. Material
      columnHelper.accessor('materialName', {
        header: 'MATERIAL',
        minSize: 150,
        size: 180,
        cell: (info) => {
          const val = info.getValue();
          return (
            <span className="text-xs text-foreground truncate block">
              {val || '—'}
            </span>
          );
        },
      }),

      // 5. UOM
      columnHelper.accessor('uomName', {
        header: 'UOM',
        minSize: 80,
        size: 100,
        cell: (info) => (
          <span className="text-xs font-medium text-foreground">{info.getValue() || '—'}</span>
        ),
      }),

      // 6. Approval Status
      columnHelper.accessor('approvalStatus', {
        header: 'APPROVAL',
        minSize: 120,
        size: 130,
        cell: (info) => <StatusBadge status={info.getValue()} />,
      }),

      // 7. Active Status
      columnHelper.accessor('isActive', {
        header: 'STATUS',
        minSize: 100,
        size: 110,
        cell: (info) => {
          const row = info.row.original;
          return (
            <Badge variant={row.isActive ? 'active' : 'inactive'} size="sm">
              {row.isActive ? 'Active' : 'Inactive'}
            </Badge>
          );
        },
      }),

      // 8. Actions
      columnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        minSize: 110,
        size: 120,
        cell: (info) => {
          const row = info.row.original;
          return (
            <TableActions
              align="right"
              onView={() => navigate(`/products/${row.id}`)}
              onEdit={() => navigate(`/products/${row.id}/edit`)}
            />
          );
        },
      }),
    ],
    [navigate]
  );

  const [columnSizing, setColumnSizing] = useState({});

  const table = useReactTable({
    data: products,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(totalCount / pageSize),
    state: {
      columnSizing,
      pagination: {
        pageIndex: pageNumber - 1,
        pageSize,
      },
    },
    onColumnSizingChange: setColumnSizing,
    enableColumnResizing: true,
    onPaginationChange: (updater) => {
      const nextState =
        typeof updater === 'function'
          ? updater({ pageIndex: pageNumber - 1, pageSize })
          : updater;
      setPageNumber(nextState.pageIndex + 1);
      setPageSize(nextState.pageSize);
    },
  });

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await deleteProduct(productToDelete.id);
      setProductToDelete(null);
    } catch {
      // Handled in context toast
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 w-full">
      {/* ── 1. Page Header ── */}
      <PageHeader
        title="Product Master"
        subtitle="Register, configure, and inspect precision metrology products and variants"
        icon={<IconProduct size={24} className="text-primary" />}
        actions={
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/products/new')}
            className="flex items-center gap-1.5 shadow-xs"
          >
            <IconAdd size={16} />
            <span>New Product</span>
          </Button>
        }
      />

      {/* ── 2. Summary KPI Cards ── */}
      {/* <ProductSummaryCards summary={summary} isLoading={isLoadingSummary} /> */}

      {/* ── 3. Filters Toolbar (Swagger Image 1) ── */}
      <ProductFilterBar
        search={search}
        setSearch={setSearch}
        categoryId={categoryId}
        setCategoryId={setCategoryId}
        materialId={materialId}
        setMaterialId={setMaterialId}
        uomId={uomId}
        setUomId={setUomId}
        approvalStatus={approvalStatus}
        setApprovalStatus={setApprovalStatus}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        lookups={lookups}
        hasActiveFilters={hasActiveFilters}
        onReset={resetFilters}
      />

      {/* ── 4. Main DataTable ── */}
      <DataTable
        table={table}
        columns={columns}
        isLoading={isLoading}
        totalCount={totalCount}
        entityName="products"
        emptyTitle="No products found"
        emptyDescription="Try adjusting your search criteria or register a new product."
        emptyAction={
          <Button variant="primary" size="sm" onClick={() => navigate('/products/new')}>
            Register Product
          </Button>
        }
        renderMobileCard={(row) => {
          const product = row.original;
          return (
            <div
              key={product.id}
              className="bg-surface border border-border rounded-xl p-4 shadow-2xs space-y-3"
            >
              {/* Header: Code, Approval, Active Status */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-primary">
                      {product.productCode}
                    </span>
                    <StatusBadge status={product.approvalStatus} />
                  </div>
                  <Link
                    to={`/products/${product.id}`}
                    className="block text-sm font-bold text-heading leading-snug mt-1 hover:text-primary transition-colors"
                  >
                    {product.productName}
                  </Link>
                  {product.finishType && (
                    <div className="mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-medium bg-muted/30 text-text-muted border border-border/60">
                        Finish: {product.finishType}
                      </span>
                    </div>
                  )}
                </div>

                <Badge variant={product.isActive ? 'active' : 'inactive'} size="sm">
                  {product.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              {/* Meta details: Category, Material, UOM - fully visible without truncation */}
              <div className="space-y-1.5 pt-2.5 border-t border-border/60 text-xs">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-text-muted shrink-0 text-xs font-medium">Category:</span>
                  <span className="font-semibold text-heading text-right break-words text-xs">
                    {product.categoryName || '—'}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-text-muted shrink-0 text-xs font-medium">Material:</span>
                  <span className="font-semibold text-heading text-right break-words text-xs">
                    {product.materialName || '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-text-muted shrink-0 text-xs font-medium">UOM:</span>
                  <span className="font-semibold text-heading text-right text-xs">
                    {product.uomName || '—'}
                  </span>
                </div>
              </div>

              {/* Action buttons footer */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/products/${product.id}`)}
                  className="flex-1 text-xs"
                >
                  <IconView size={13} className="mr-1.5" aria-hidden="true" />
                  View
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/products/${product.id}/edit`)}
                  className="flex-1 text-xs"
                >
                  <IconEdit size={13} className="mr-1.5" aria-hidden="true" />
                  Edit
                </Button>


              </div>
            </div>
          );
        }}
      />

      {/* ── 5. Delete Confirmation Modal ── */}
      <ConfirmModal
        isOpen={Boolean(productToDelete)}
        onClose={() => !isDeleting && setProductToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Product"
        message={`Are you sure you want to delete "${productToDelete?.productName || productToDelete?.productCode}"? This will permanently remove its variants, standards, and options.`}
        confirmText="Delete Product"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}

