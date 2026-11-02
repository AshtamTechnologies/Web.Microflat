/**
 * ProductViewPage.jsx — Comprehensive Product detail view with workflow approvals and sub-resources.
 *
 * Route: /products/:id
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Card,
  Button,
  SaveButton,
  CancelButton,
  Badge,
  DetailField,
  StatusBadge,
  StatusSwitch,
  PageHeader,
  ScrollableTabs,
  Modal,
  Textarea,
  ConfirmModal,
} from '../../components/ui';
import {
  IconBack,
  IconEdit,
  IconCheck,
  IconClose,
  IconProduct,
  IconRotateCcw,
  IconLayers,
  IconStandards,
  IconAttachment,
} from '../../constants/icons';
import { productService } from '../../services';
import { useProductsContext } from '../../context/ProductsContext';
import { ApprovalStatus } from '../../constants/approvalStatus';
import ProductVariantsTab from './components/ProductVariantsTab';
import ProductStandardsEditor from './components/ProductStandardsEditor';
import ProductOptionsEditor from './components/ProductOptionsEditor';
import ProductAttachmentsTab from './components/ProductAttachmentsTab';

export default function ProductViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lookups, refreshProducts, loadSummary } = useProductsContext();

  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('variants');

  // Approval modals
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectComments, setRejectComments] = useState('');
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  // Quick edit standards & options
  const [isEditingStandards, setIsEditingStandards] = useState(false);
  const [currentStandards, setCurrentStandards] = useState([]);
  const [isSavingStandards, setIsSavingStandards] = useState(false);

  const [isEditingOptions, setIsEditingOptions] = useState(false);
  const [currentOptions, setCurrentOptions] = useState([]);
  const [isSavingOptions, setIsSavingOptions] = useState(false);

  const loadProduct = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await productService.getProductById(id);
      if (data) {
        setProduct(data);
        setCurrentStandards(data.standards || []);
        setCurrentOptions(data.options || []);
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to load product');
      navigate('/products');
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  // Handle active status toggle
  const handleToggleStatus = async () => {
    if (!product) return;
    const nextStatus = !product.isActive;
    try {
      await productService.updateProductStatus(product.id, nextStatus);
      setProduct((prev) => ({ ...prev, isActive: nextStatus }));
      toast.success(`Product ${nextStatus ? 'activated' : 'deactivated'} successfully`);
      refreshProducts?.();
      loadSummary?.();
    } catch (err) {
      toast.error(err?.message || 'Failed to update status');
    }
  };

  // Handle Approve
  const handleApprove = async () => {
    setIsSubmittingApproval(true);
    try {
      await productService.approveProduct(product.id);
      toast.success('Product approved successfully');
      loadProduct();
      refreshProducts?.();
      loadSummary?.();
    } catch (err) {
      toast.error(err?.message || 'Failed to approve product');
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  // Handle Reject
  const handleReject = async (e) => {
    e?.preventDefault();
    setIsSubmittingApproval(true);
    try {
      await productService.rejectProduct(product.id, { comments: rejectComments });
      toast.success('Product rejected');
      setIsRejectModalOpen(false);
      setRejectComments('');
      loadProduct();
      refreshProducts?.();
      loadSummary?.();
    } catch (err) {
      toast.error(err?.message || 'Failed to reject product');
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  // Handle Resubmit
  const handleResubmit = async () => {
    setIsSubmittingApproval(true);
    try {
      await productService.resubmitProduct(product.id);
      toast.success('Product resubmitted for approval');
      loadProduct();
      refreshProducts?.();
      loadSummary?.();
    } catch (err) {
      toast.error(err?.message || 'Failed to resubmit product');
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  // Save updated standards
  const handleSaveStandards = async () => {
    setIsSavingStandards(true);
    try {
      await productService.setStandards(
        product.id,
        currentStandards.filter((s) => s.standardId || s.id)
      );
      toast.success('Standards updated successfully');
      setIsEditingStandards(false);
      loadProduct();
    } catch (err) {
      toast.error(err?.message || 'Failed to update standards');
    } finally {
      setIsSavingStandards(false);
    }
  };

  // Save updated options
  const handleSaveOptions = async () => {
    setIsSavingOptions(true);
    try {
      await productService.setOptions(
        product.id,
        currentOptions.filter((o) => o.optionName?.trim())
      );
      toast.success('Options updated successfully');
      setIsEditingOptions(false);
      loadProduct();
    } catch (err) {
      toast.error(err?.message || 'Failed to update options');
    } finally {
      setIsSavingOptions(false);
    }
  };

  if (isLoading || !product) {
    return (
      <div className="space-y-4 w-full">
        <div className="h-10 bg-muted/30 animate-pulse rounded-lg" />
        <div className="h-64 bg-muted/20 animate-pulse rounded-lg border border-border" />
      </div>
    );
  }

  const isPending = product.approvalStatus === ApprovalStatus.Pending;
  const isRejected = product.approvalStatus === ApprovalStatus.Rejected;
  const isApproved = product.approvalStatus === ApprovalStatus.Approved;

  const tabs = [
    {
      id: 'variants',
      label: `Variants (${product.variantCount ?? product.variants?.length ?? 0})`,
      icon: IconLayers,
    },
    {
      id: 'standards',
      label: `Standards (${product.standards?.length || 0})`,
      icon: IconStandards,
    },
    {
      id: 'options',
      label: `Options (${product.options?.length || 0})`,
      icon: IconProduct,
    },
    {
      id: 'attachments',
      label: `Attachments (${product.attachments?.length || 0})`,
      icon: IconAttachment,
    },
  ];

  return (
    <div className="space-y-6 pb-20 w-full">
      {/* ── Page Header & Workflow Action Bar ── */}
      <PageHeader
        title={product.productName || product.productCode}
        backButton={{
          onClick: () => navigate('/products'),
          label: 'Back to Products',
        }}
        subtitle={
          <span className="flex flex-wrap items-center gap-2 mt-1">
            <span className="font-mono text-xs font-semibold text-primary">{product.productCode}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">{product.categoryName}</span>
            <span className="text-muted-foreground">•</span>
            <StatusBadge status={product.approvalStatus} />
            <Badge variant={product.isActive ? 'success' : 'neutral'} size="sm">
              {product.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </span>
        }
        icon={<IconProduct size={24} className="text-primary" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/products/${product.id}/edit`)}
              className="flex items-center gap-1.5"
            >
              <IconEdit size={15} />
              <span>Edit</span>
            </Button>

            {/* Approval Workflow Actions */}
            {isPending && (
              <>
                <Button
                  variant="success"
                  size="sm"
                  onClick={handleApprove}
                  loading={isSubmittingApproval}
                  className="flex items-center gap-1.5 shadow-xs"
                >
                  <IconCheck size={15} />
                  <span>Approve</span>
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setIsRejectModalOpen(true)}
                  disabled={isSubmittingApproval}
                  className="flex items-center gap-1.5"
                >
                  <IconClose size={15} />
                  <span>Reject</span>
                </Button>
              </>
            )}

            {isRejected && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleResubmit}
                loading={isSubmittingApproval}
                className="flex items-center gap-1.5 shadow-xs"
              >
                <IconRotateCcw size={15} />
                <span>Resubmit for Approval</span>
              </Button>
            )}

            <div className="pl-2 border-l border-border flex items-center gap-1.5">
              <StatusSwitch
                checked={product.isActive}
                onChange={handleToggleStatus}
                title={product.isActive ? 'Active' : 'Inactive'}
              />
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {product.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        }
      />

      {/* ── Key Overview Card ── */}
      <Card title="Product Master Overview" padding="md" className="border border-border bg-card">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          <DetailField label="Product Code" value={product.productCode} mono />
          <DetailField label="Product Name" value={product.productName} />
          <DetailField label="Category" value={product.categoryName} />
          <DetailField label="Material" value={product.materialName} />
          <DetailField label="Unit of Measurement" value={product.uomName} />
          <DetailField label="Finish Type" value={product.finishType} />
          <DetailField
            label="Primary Standard"
            value={product.primaryStandardCode || '—'}
            mono={Boolean(product.primaryStandardCode)}
          />
          <DetailField label="Variant Count" value={product.variantCount} />
          <DetailField
            label="Standard Product"
            value={product.isStandardProduct ? 'Yes (Standard)' : 'No (Custom)'}
          />
          <DetailField
            label="Custom Size Allowed"
            value={product.isCustomSizeAllowed ? 'Yes' : 'No'}
          />
          <DetailField
            label="Requires Calibration"
            value={product.requiresCalibration ? 'Yes (Mandatory)' : 'No'}
          />
          <DetailField
            label="Created On"
            value={product.createdOn ? new Date(product.createdOn).toLocaleString() : '—'}
          />
          {product.lastUpdatedOn && (
            <DetailField
              label="Last Updated"
              value={new Date(product.lastUpdatedOn).toLocaleString()}
            />
          )}
        </div>

        {product.description && (
          <div className="mt-4 pt-4 border-t border-border">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Description & Scope
            </h4>
            <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
              {product.description}
            </p>
          </div>
        )}
      </Card>

      {/* ── Sub-Resources Tabs ── */}
      <Card padding="none" className="border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-4 pt-2">
          <ScrollableTabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={setActiveTab}
            variant="underline"
          />
        </div>

        <div className="p-4 sm:p-6">
          {/* 1. Variants Tab */}
          {activeTab === 'variants' && (
            <ProductVariantsTab
              productId={product.id}
              grades={lookups?.grades || []}
              specParameters={lookups?.specParameters || []}
              onVariantAdded={loadProduct}
            />
          )}

          {/* 2. Standards Tab */}
          {activeTab === 'standards' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div>
                  <h4 className="text-xs text-muted-foreground">
                    Link manufacturing standards (IS, DIN, BS, GGG) to this product.
                  </h4>
                </div>
                {!isEditingStandards ? (
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setIsEditingStandards(true)}
                  >
                    Edit Standards
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <CancelButton
                      size="xs"
                      onClick={() => {
                        setCurrentStandards(product.standards || []);
                        setIsEditingStandards(false);
                      }}
                      disabled={isSavingStandards}
                    />
                    <SaveButton
                      size="xs"
                      onClick={handleSaveStandards}
                      loading={isSavingStandards}
                      label="Save Standards"
                    />
                  </div>
                )}
              </div>

              <ProductStandardsEditor
                standards={currentStandards}
                onChange={setCurrentStandards}
                availableStandards={lookups?.standards || []}
                readOnly={!isEditingStandards}
              />
            </div>
          )}

          {/* 3. Options Tab */}
          {activeTab === 'options' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div>
                  <h4 className="text-xs text-muted-foreground">
                    Manage standard inclusions and optional fixtures (e.g. T-Slots, Covers).
                  </h4>
                </div>
                {!isEditingOptions ? (
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setIsEditingOptions(true)}
                  >
                    Edit Options
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <CancelButton
                      size="xs"
                      onClick={() => {
                        setCurrentOptions(product.options || []);
                        setIsEditingOptions(false);
                      }}
                      disabled={isSavingOptions}
                    />
                    <SaveButton
                      size="xs"
                      onClick={handleSaveOptions}
                      loading={isSavingOptions}
                      label="Save Options"
                    />
                  </div>
                )}
              </div>

              <ProductOptionsEditor
                options={currentOptions}
                onChange={setCurrentOptions}
                readOnly={!isEditingOptions}
              />
            </div>
          )}

          {/* 4. Attachments Tab (Swagger Image 2) */}
          {activeTab === 'attachments' && (
            <ProductAttachmentsTab
              productId={product.id}
              attachments={product.attachments || []}
              documentTypes={lookups?.documentTypes || []}
              onAttachmentUploaded={loadProduct}
            />
          )}
        </div>
      </Card>

      {/* ── Reject Modal ── */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => !isSubmittingApproval && setIsRejectModalOpen(false)}
        title="Reject Product"
        size="sm"
      >
        <form onSubmit={handleReject} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Please provide a rejection reason so the creator can revise and resubmit this product.
          </p>
          <Textarea
            rows={3}
            value={rejectComments}
            onChange={(e) => setRejectComments(e.target.value)}
            placeholder="Reason for rejection..."
            required
            autoFocus
          />
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <CancelButton
              size="sm"
              onClick={() => setIsRejectModalOpen(false)}
              disabled={isSubmittingApproval}
            />
            <Button type="submit" variant="danger" size="sm" loading={isSubmittingApproval}>
              Confirm Rejection
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

