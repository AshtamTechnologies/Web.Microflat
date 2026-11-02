/**
 * ProductStandardsEditor.jsx — Sub-component for managing product standards.
 * Supports adding, removing, and choosing exactly one primary standard.
 */

import React from 'react';
import {
  Button,
  SearchableSelect,
  Badge,
  Card,
  TableContainer,
  Th,
  Td,
} from '../../../components/ui';
import { IconAdd, IconDelete, IconStandards } from '../../../constants/icons';

export default function ProductStandardsEditor({
  standards = [],
  onChange,
  availableStandards = [],
  readOnly = false,
}) {
  // Options for available standards dropdown
  const standardOptions = availableStandards.map((s) => ({
    value: Number(s.id),
    label: s.standardCode,
  }));

  const handleAdd = () => {
    if (standards.length >= availableStandards.length) return;

    const isFirst = standards.length === 0;
    const nextList = [
      ...standards,
      {
        standardId: '',
        standardCode: '',
        isPrimary: isFirst,
      },
    ];
    onChange?.(nextList);
  };

  const handleRemove = (index) => {
    const itemToRemove = standards[index];
    const nextList = standards.filter((_, i) => i !== index);

    // If removed item was primary and there are remaining items, make the first one primary
    if (itemToRemove.isPrimary && nextList.length > 0) {
      nextList[0].isPrimary = true;
    }
    onChange?.(nextList);
  };

  const handleChangeStandard = (index, val) => {
    const rawId = val && typeof val === 'object' && 'target' in val ? val.target.value : val;
    const id = Number(rawId);
    const matched = availableStandards.find((s) => Number(s.id) === id);
    const nextList = [...standards];
    nextList[index] = {
      ...nextList[index],
      standardId: id,
      standardCode: matched?.standardCode || '',
    };
    onChange?.(nextList);
  };

  const handleSetPrimary = (index) => {
    const nextList = standards.map((item, i) => ({
      ...item,
      isPrimary: i === index,
    }));
    onChange?.(nextList);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconStandards size={18} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Applicable Standards</h3>
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
        <div className="p-4 text-center rounded-lg border border-dashed border-border bg-muted/20 text-muted-foreground text-xs">
          No standards linked to this product yet.
        </div>
      ) : (
        <TableContainer
          className="border border-border rounded-lg overflow-hidden"
          tableClassName="w-full text-xs table-auto"
        >
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <Th className="w-16 text-center">Primary</Th>
              <Th>Standard Code</Th>
              {!readOnly && <Th className="w-16 text-center">Action</Th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
              {standards.map((item, index) => {
                const currentId = item.standardId || item.id ? Number(item.standardId || item.id) : '';
                return (
                  <tr key={index} className="hover:bg-muted/20">
                    <td className="p-2.5 text-center">
                      {readOnly ? (
                        item.isPrimary ? (
                          <Badge variant="success">Primary</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )
                      ) : (
                        <input
                          type="radio"
                          name="primaryStandard"
                          checked={Boolean(item.isPrimary)}
                          onChange={() => handleSetPrimary(index)}
                          className="h-4 w-4 text-primary cursor-pointer accent-primary"
                          title="Mark as primary standard"
                        />
                      )}
                    </td>
                    <td className="p-2.5">
                      {readOnly ? (
                        <span className="font-medium text-foreground">
                          {item.standardCode || availableStandards.find((s) => s.id === currentId)?.standardCode}
                        </span>
                      ) : (
                        <SearchableSelect
                          value={currentId || ''}
                          onChange={(val) => handleChangeStandard(index, val)}
                          options={standardOptions}
                          placeholder="Select Standard"
                          className="w-full max-w-sm"
                        />
                      )}
                    </td>
                    {!readOnly && (
                      <td className="p-2.5 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={() => handleRemove(index)}
                          className="text-danger hover:bg-danger/10"
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
    </div>
  );
}

