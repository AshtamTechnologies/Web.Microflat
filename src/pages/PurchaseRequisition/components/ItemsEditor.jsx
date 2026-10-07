/**
 * ItemsEditor.jsx — Reusable Line Items Manager for Purchase Requisition.
 * Implements "Add via form, review in a grid" pattern.
 * Manages adding, editing, and deleting items with full field validation.
 */

import { useState } from 'react';
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  Button,
  Card,
  Input,
  SearchableSelect,
  Badge,
  TableContainer,
  Th,
  Td,
} from '../../../components/ui';
import {
  MOCK_MATERIALS,
  UOM_OPTIONS,
} from '../../../mocks/purchaseRequisitions';

const MATERIAL_SELECT_OPTIONS = [
  { value: '', label: '-- Select Material from Catalog --' },
  ...MOCK_MATERIALS.map((m) => ({
    value: String(m.itemId),
    label: `${m.itemName} (${m.itemCode})`,
  })),
];

const INITIAL_ITEM_FORM = {
  prItemId: null,
  itemId: '',
  itemCode: '',
  itemName: '',
  specification: '',
  quantity: '',
  uom: 'Nos',
};

export default function ItemsEditor({
  items = [],
  onChange,
  onChangeItems,
  error = '',
}) {
  // Support both onChange and onChangeItems prop names
  const handleUpdateItems = (nextItems) => {
    if (typeof onChange === 'function') {
      onChange(nextItems);
    }
    if (typeof onChangeItems === 'function') {
      onChangeItems(nextItems);
    }
  };

  // Form State
  const [formState, setFormState] = useState({ ...INITIAL_ITEM_FORM });

  // Track editing row ID (null when in Add mode)
  const [editingId, setEditingId] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const editingIndex = editingId
    ? items.findIndex((item) => (item.prItemId || item.id) === editingId)
    : -1;

  const isEditing = editingIndex !== -1;

  // Handle Field Change in Form
  const handleFieldChange = (field, value) => {
    if (field === 'itemId') {
      // Auto-populate from catalog preset
      const selectedMat = MOCK_MATERIALS.find(
        (m) => String(m.itemId) === String(value)
      );
      if (selectedMat) {
        setFormState((prev) => ({
          ...prev,
          itemId: selectedMat.itemId,
          itemCode: selectedMat.itemCode,
          itemName: selectedMat.itemName,
          specification: selectedMat.specification,
          uom: selectedMat.uom || prev.uom || 'Nos',
        }));
      } else {
        setFormState((prev) => ({
          ...prev,
          itemId: '',
        }));
      }
    } else {
      setFormState((prev) => ({
        ...prev,
        [field]: value,
      }));
    }

    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // Validate form fields before Add / Update
  const validateItemForm = () => {
    const errs = {};
    if (!formState.itemCode || !formState.itemCode.trim()) {
      errs.itemCode = 'Item code is required';
    }
    if (!formState.itemName || !formState.itemName.trim()) {
      errs.itemName = 'Item name is required';
    }
    if (
      formState.quantity === '' ||
      formState.quantity === null ||
      formState.quantity === undefined ||
      Number(formState.quantity) <= 0 ||
      isNaN(Number(formState.quantity))
    ) {
      errs.quantity = 'Quantity must be greater than 0';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Reset form to Add mode default
  const resetForm = () => {
    setEditingId(null);
    setFieldErrors({});
    setFormState({ ...INITIAL_ITEM_FORM });
  };

  // Submit Form (Add or Update)
  const handleSubmitItem = (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    if (!validateItemForm()) {
      toast.error('Please fix item validation errors before submitting.');
      return;
    }

    if (isEditing) {
      // Update existing item in place
      const updatedList = items.map((item, idx) => {
        if (idx === editingIndex) {
          return {
            ...item,
            itemId: formState.itemId || '',
            itemCode: formState.itemCode.trim(),
            itemName: formState.itemName.trim(),
            specification: formState.specification?.trim() || '',
            quantity: Number(formState.quantity),
            uom: formState.uom || 'Nos',
          };
        }
        return item;
      });

      handleUpdateItems(updatedList);
      toast.success('Item updated');
      resetForm();
    } else {
      // Add new item
      const newItem = {
        prItemId: Date.now() + Math.floor(Math.random() * 1000),
        itemId: formState.itemId || '',
        itemCode: formState.itemCode.trim(),
        itemName: formState.itemName.trim(),
        specification: formState.specification?.trim() || '',
        quantity: Number(formState.quantity),
        uom: formState.uom || 'Nos',
      };

      handleUpdateItems([...items, newItem]);
      toast.success('Item added');
      resetForm();
    }
  };

  // Start Editing Row
  const handleStartEdit = (item, index) => {
    const id = item.prItemId || item.id || index;
    setEditingId(id);
    setFieldErrors({});
    setFormState({
      prItemId: item.prItemId || item.id || null,
      itemId: item.itemId ? String(item.itemId) : '',
      itemCode: item.itemCode || '',
      itemName: item.itemName || '',
      specification: item.specification || '',
      quantity: item.quantity !== undefined && item.quantity !== null ? item.quantity : '',
      uom: item.uom || 'Nos',
    });
  };

  // Remove Row
  const handleRemoveItem = (index) => {
    const itemToRemove = items[index];
    const itemIdToRemove = itemToRemove.prItemId || itemToRemove.id;
    const updated = items.filter((_, i) => i !== index);
    handleUpdateItems(updated);
    toast.success('Item removed');

    if (editingId && (editingId === itemIdToRemove || editingIndex === index)) {
      resetForm();
    }
  };

  // Calculate total quantity
  const totalQuantity = items.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* ── 1. ITEM FORM (Top Card) ── */}
      <Card
        padding="md"
        className={`space-y-5 shadow-xs transition-all duration-200 ${
          isEditing
            ? 'border-primary/60 ring-2 ring-primary/20 bg-primary/[0.02]'
            : 'border-border'
        }`}
      >
        {/* Form Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                isEditing
                  ? 'bg-primary text-white'
                  : 'bg-primary/10 text-primary'
              }`}
            >
              {isEditing ? <Pencil size={17} /> : <Package size={18} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-heading">
                  {isEditing
                    ? `Edit Item #${editingIndex + 1}`
                    : 'Add Item to Requisition'}
                </h2>
                {isEditing && (
                  <Badge variant="role" className="text-xs px-2 py-0.5">
                    Editing Mode
                  </Badge>
                )}
              </div>
              <p className="text-xs text-text-muted">
                {isEditing
                  ? `Modifying details for ${formState.itemName || 'selected item'}. Click "Update Item" to save changes.`
                  : 'Enter material details, required quantity, and specifications below.'}
              </p>
            </div>
          </div>

          {isEditing && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetForm}
              className="text-xs text-text-muted hover:text-text self-start sm:self-auto"
            >
              <X size={14} className="mr-1" />
              Cancel Edit
            </Button>
          )}
        </div>

        {/* Form Body: Exactly 3 fields per row */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Row 1, Col 1: Material Catalog Preset */}
            <div>
              <SearchableSelect
                id="item-catalog-preset"
                label="Material Catalog Preset (Optional)"
                options={MATERIAL_SELECT_OPTIONS}
                value={formState.itemId ? String(formState.itemId) : ''}
                placeholder="-- Select Material from Catalog --"
                searchPlaceholder="Search catalog..."
                onChange={(e) => handleFieldChange('itemId', e.target.value)}
              />
            </div>

            {/* Row 1, Col 2: Item Code */}
            <div>
              <Input
                id="item-form-code"
                label="Item Code"
                required
                placeholder="e.g. MAT-FST-M6-125"
                value={formState.itemCode}
                error={fieldErrors.itemCode}
                onChange={(e) => handleFieldChange('itemCode', e.target.value)}
              />
            </div>

            {/* Row 1, Col 3: Item Name */}
            <div>
              <Input
                id="item-form-name"
                label="Item Name"
                required
                placeholder="e.g. M6 Fastener"
                value={formState.itemName}
                error={fieldErrors.itemName}
                onChange={(e) => handleFieldChange('itemName', e.target.value)}
              />
            </div>

            {/* Row 2, Col 1: Specification */}
            <div>
              <Input
                id="item-form-spec"
                label="Specification"
                placeholder="e.g. M6 × 125 MM High Tensile Zinc Plated"
                value={formState.specification}
                onChange={(e) =>
                  handleFieldChange('specification', e.target.value)
                }
              />
            </div>

            {/* Row 2, Col 2: Quantity */}
            <div>
              <Input
                id="item-form-qty"
                label="Quantity"
                type="number"
                min="1"
                required
                placeholder="100"
                value={formState.quantity}
                error={fieldErrors.quantity}
                onChange={(e) => handleFieldChange('quantity', e.target.value)}
              />
            </div>

            {/* Row 2, Col 3: UOM */}
            <div>
              <SearchableSelect
                id="item-form-uom"
                label="UOM"
                options={UOM_OPTIONS}
                value={formState.uom || 'Nos'}
                placeholder="Select UOM..."
                searchPlaceholder="Search unit of measure..."
                onChange={(e) => handleFieldChange('uom', e.target.value)}
              />
            </div>
          </div>

          {/* Form Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            {isEditing && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={resetForm}
                className="cursor-pointer"
              >
                <X size={15} className="mr-1.5" />
                Cancel
              </Button>
            )}

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSubmitItem}
              className="font-semibold shadow-xs cursor-pointer"
            >
              {isEditing ? (
                <>
                  <Check size={15} className="mr-1.5" />
                  Update Item
                </>
              ) : (
                <>
                  <Plus size={15} className="mr-1.5" />
                  Add Item
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* ── 2. ITEMS GRID (Review Table Card) ── */}
      <Card
        padding="none"
        className="overflow-hidden border border-border shadow-xs bg-surface"
      >
        {/* Grid Header */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-surface">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Package size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-heading">
                  Requisition Items List
                </h3>
                <Badge variant="role" className="text-xs px-2.5 py-0.5">
                  {items.length} {items.length === 1 ? 'Item' : 'Items'}
                </Badge>
              </div>
              <p className="text-xs text-text-muted">
                Review, edit, or remove items included in this purchase requisition.
              </p>
            </div>
          </div>

          {items.length > 0 && (
            <div className="flex items-center gap-3 text-xs self-start sm:self-auto bg-bg px-3 py-1.5 rounded-lg border border-border">
              <span className="text-text-muted font-medium">Total Quantity:</span>
              <span className="font-bold font-mono text-heading">
                {totalQuantity.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Section Error Banner if provided */}
        {error && (
          <div className="m-4 p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Table Content */}
        {items.length === 0 ? (
          <div className="py-14 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-border/40 text-text-muted flex items-center justify-center mx-auto mb-3">
              <Package size={22} className="opacity-60" />
            </div>
            <p className="text-sm font-semibold text-heading">No items added</p>
            <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
              Fill in the material details above and click &quot;Add Item&quot; to append line items to this requisition.
            </p>
          </div>
        ) : (
          <TableContainer>
            <thead>
              <tr className="bg-surface border-b border-border">
                <Th className="w-[50px] text-center">#</Th>
                <Th className="w-[160px]">Item Code</Th>
                <Th className="w-[200px]">Item Name</Th>
                <Th className="w-[260px]">Specification</Th>
                <Th className="w-[120px] text-right">Quantity</Th>
                <Th className="w-[100px]">UOM</Th>
                <Th className="w-[100px] text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {items.map((item, index) => {
                const isCurrentEditing =
                  editingId &&
                  (item.prItemId || item.id) === editingId;

                return (
                  <tr
                    key={item.prItemId || item.id || index}
                    className={`transition-colors ${
                      isCurrentEditing
                        ? 'bg-primary/10 hover:bg-primary/15'
                        : 'hover:bg-bg/60'
                    }`}
                  >
                    {/* Index */}
                    <Td className="text-center font-semibold text-text-muted text-xs">
                      {index + 1}
                    </Td>

                    {/* Item Code */}
                    <Td className="font-medium text-text">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-bg border border-border">
                        {item.itemCode || '—'}
                      </span>
                    </Td>

                    {/* Item Name */}
                    <Td className="font-semibold text-heading">
                      {item.itemName || '—'}
                    </Td>

                    {/* Specification */}
                    <Td className="text-text-muted text-xs truncate max-w-[260px]" title={item.specification}>
                      {item.specification || '—'}
                    </Td>

                    {/* Quantity */}
                    <Td className="text-right font-bold text-heading font-mono tabular-nums">
                      {Number(item.quantity).toLocaleString()}
                    </Td>

                    {/* UOM */}
                    <Td className="text-text-muted text-xs">
                      {item.uom || 'Nos'}
                    </Td>

                    {/* Row Actions */}
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Edit Ghost Button */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStartEdit(item, index)}
                          title="Edit this item"
                          className={
                            isCurrentEditing
                              ? 'bg-primary/20 text-primary'
                              : 'text-text-muted hover:text-primary hover:bg-surface'
                          }
                        >
                          <Pencil size={14} aria-hidden="true" />
                        </Button>

                        {/* Remove Ghost Button */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(index)}
                          title="Remove this item"
                          className="text-text-muted hover:text-danger hover:bg-danger/10"
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </Button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
            {items.length > 0 && (
              <tfoot>
                <tr className="bg-surface/90 border-t-2 border-border font-semibold text-xs text-text">
                  <td colSpan={4} className="px-5 py-3 text-text-muted">
                    Total {items.length} {items.length === 1 ? 'item' : 'items'}
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums text-heading font-bold">
                    {totalQuantity.toLocaleString()}
                  </td>
                  <td colSpan={2} className="px-5 py-3 text-text-muted">
                    Total Quantity
                  </td>
                </tr>
              </tfoot>
            )}
          </TableContainer>
        )}
      </Card>
    </div>
  );
}
