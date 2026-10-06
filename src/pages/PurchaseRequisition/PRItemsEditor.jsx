/**
 * PRItemsEditor.jsx — Reusable multi-item editor card for Purchase Requisition.
 * Supports adding, removing, selecting materials, and custom field editing.
 * Guarantees at least one item is present at all times.
 */

import { Plus, Trash2, Package, Calendar, AlertCircle } from 'lucide-react';
import {
  Button,
  Card,
  Input,
  Select,
  Badge,
} from '../../components/ui';
import {
  MOCK_MATERIALS,
  UOM_OPTIONS,
  ITEM_STATUS_OPTIONS,
} from '../../mocks/purchaseRequisitions';

const MATERIAL_SELECT_OPTIONS = [
  { value: '', label: '-- Select Material from Catalog --' },
  ...MOCK_MATERIALS.map((m) => ({
    value: String(m.itemId),
    label: `${m.itemName} (${m.itemCode})`,
  })),
];

export default function PRItemsEditor({
  items,
  onChangeItems,
  defaultRequiredDate = '',
}) {
  // Add another item
  const handleAddItem = () => {
    const newItem = {
      prItemId: Date.now() + Math.floor(Math.random() * 1000),
      itemId: '',
      itemCode: '',
      itemName: '',
      specification: '',
      quantity: '',
      uom: 'Nos',
      requiredDate: defaultRequiredDate || '',
      remarks: '',
      status: 'Pending',
    };
    onChangeItems([...items, newItem]);
  };

  // Remove item by index
  const handleRemoveItem = (index) => {
    if (items.length <= 1) return; // Prevent removing the last item
    const updated = items.filter((_, i) => i !== index);
    onChangeItems(updated);
  };

  // Update item field
  const handleItemFieldChange = (index, field, value) => {
    const updated = items.map((item, i) => {
      if (i !== index) return item;

      // When selecting a material from the catalog, auto-populate code, name, specification, uom
      if (field === 'itemId') {
        const selectedMat = MOCK_MATERIALS.find(
          (m) => String(m.itemId) === String(value)
        );
        if (selectedMat) {
          return {
            ...item,
            itemId: selectedMat.itemId,
            itemCode: selectedMat.itemCode,
            itemName: selectedMat.itemName,
            specification: selectedMat.specification,
            uom: selectedMat.uom || item.uom || 'Nos',
          };
        }
        return {
          ...item,
          itemId: '',
        };
      }

      return {
        ...item,
        [field]: value,
      };
    });

    onChangeItems(updated);
  };

  return (
    <Card padding="md" className="space-y-5 shadow-xs border-border">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Package size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-heading">
              Purchase Requisition Items
            </h2>
            <p className="text-xs text-text-muted">
              Add multiple items/materials required for this requisition.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleAddItem}
          className="font-medium text-primary hover:border-primary shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <Plus size={15} className="mr-1.5" />
          Add Item
        </Button>
      </div>

      {/* Items list */}
      <div className="space-y-4">
        {items.map((item, index) => {
          const isOnlyItem = items.length === 1;

          return (
            <div
              key={item.prItemId || index}
              className="p-4 rounded-xl border border-border bg-bg/40 space-y-4 hover:border-border/80 transition-colors"
            >
              {/* Item Card Header */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <span className="text-sm font-bold text-heading">
                    Item {index + 1}
                    {item.itemName && (
                      <span className="text-text-muted font-normal ml-1.5 text-xs">
                        ({item.itemName})
                      </span>
                    )}
                  </span>
                </div>

                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  disabled={isOnlyItem}
                  onClick={() => handleRemoveItem(index)}
                  title={
                    isOnlyItem
                      ? 'At least one item is required in the requisition'
                      : 'Remove this item'
                  }
                  className="h-7 px-2 text-xs"
                >
                  <Trash2 size={13} className="mr-1" />
                  Remove
                </Button>
              </div>

              {/* Form Fields for this item */}
              <div className="space-y-3.5">
                {/* Catalog Quick Selector */}
                <div>
                  <Select
                    id={`item-${index}-catalog`}
                    label="Item / Material (Catalog Preset)"
                    options={MATERIAL_SELECT_OPTIONS}
                    value={item.itemId ? String(item.itemId) : ''}
                    onChange={(e) =>
                      handleItemFieldChange(index, 'itemId', e.target.value)
                    }
                  />
                  <p className="text-[11px] text-text-muted mt-1">
                    Selecting a material will automatically populate Item Code, Name, Specification, and UOM.
                  </p>
                </div>

                {/* Row 1: Code, Name, Specification */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Input
                      id={`item-${index}-code`}
                      label="Item Code"
                      required
                      placeholder="e.g. MAT-FST-M6-125"
                      value={item.itemCode || ''}
                      onChange={(e) =>
                        handleItemFieldChange(index, 'itemCode', e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <Input
                      id={`item-${index}-name`}
                      label="Item Name"
                      required
                      placeholder="e.g. M6 Fastener"
                      value={item.itemName || ''}
                      onChange={(e) =>
                        handleItemFieldChange(index, 'itemName', e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <Input
                      id={`item-${index}-spec`}
                      label="Specification"
                      placeholder="e.g. M6 × 125 MM High Tensile"
                      value={item.specification || ''}
                      onChange={(e) =>
                        handleItemFieldChange(
                          index,
                          'specification',
                          e.target.value
                        )
                      }
                    />
                  </div>
                </div>

                {/* Row 2: Quantity, UOM, Required Date, Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Input
                      id={`item-${index}-qty`}
                      label="Quantity"
                      type="number"
                      min="1"
                      required
                      placeholder="100"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemFieldChange(index, 'quantity', e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <Select
                      id={`item-${index}-uom`}
                      label="UOM"
                      options={UOM_OPTIONS}
                      value={item.uom || 'Nos'}
                      onChange={(e) =>
                        handleItemFieldChange(index, 'uom', e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <Input
                      id={`item-${index}-req-date`}
                      label="Required Date"
                      type="date"
                      value={item.requiredDate || ''}
                      onChange={(e) =>
                        handleItemFieldChange(
                          index,
                          'requiredDate',
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div>
                    <Select
                      id={`item-${index}-status`}
                      label="Status"
                      options={ITEM_STATUS_OPTIONS}
                      value={item.status || 'Pending'}
                      onChange={(e) =>
                        handleItemFieldChange(index, 'status', e.target.value)
                      }
                    />
                  </div>
                </div>

                {/* Row 3: Remarks */}
                <div>
                  <Input
                    id={`item-${index}-remarks`}
                    label="Remarks / Notes"
                    placeholder="e.g. Length must be 125 MM strictly, mill test certificate needed"
                    value={item.remarks || ''}
                    onChange={(e) =>
                      handleItemFieldChange(index, 'remarks', e.target.value)
                    }
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Helper notice */}
      <div className="flex items-center justify-between text-xs text-text-muted pt-2 border-t border-border">
        <span>Total Items: {items.length}</span>
        <button
          type="button"
          onClick={handleAddItem}
          className="text-primary hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
        >
          <Plus size={13} />
          <span>Add another item</span>
        </button>
      </div>
    </Card>
  );
}
