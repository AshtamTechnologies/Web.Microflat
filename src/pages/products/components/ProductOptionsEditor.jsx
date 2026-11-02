/**
 * ProductOptionsEditor.jsx — Sub-component for managing product options (e.g. Counter Bored Holes, Rexine Cover).
 */

import React from 'react';
import {
  Button,
  Input,
  Checkbox,
  Badge,
  TableContainer,
  Th,
} from '../../../components/ui';
import { IconAdd, IconDelete, IconLayers } from '../../../constants/icons';

export default function ProductOptionsEditor({
  options = [],
  onChange,
  readOnly = false,
}) {
  const handleAdd = () => {
    const nextList = [
      ...options,
      {
        optionName: '',
        isStandard: false,
      },
    ];
    onChange?.(nextList);
  };

  const handleRemove = (index) => {
    const nextList = options.filter((_, i) => i !== index);
    onChange?.(nextList);
  };

  const handleChangeName = (index, value) => {
    const nextList = [...options];
    nextList[index] = {
      ...nextList[index],
      optionName: value,
    };
    onChange?.(nextList);
  };

  const handleToggleStandard = (index, checked) => {
    const nextList = [...options];
    nextList[index] = {
      ...nextList[index],
      isStandard: checked,
    };
    onChange?.(nextList);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconLayers size={18} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Product Options / Accessories</h3>
          <span className="text-xs text-muted-foreground">({options.length})</span>
        </div>
        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAdd}
            className="flex items-center gap-1.5"
          >
            <IconAdd size={14} />
            <span>Add Option</span>
          </Button>
        )}
      </div>

      {options.length === 0 ? (
        <div className="p-4 text-center rounded-lg border border-dashed border-border bg-muted/20 text-muted-foreground text-xs">
          No options configured for this product.
        </div>
      ) : (
        <TableContainer
          className="border border-border rounded-lg overflow-hidden"
          tableClassName="w-full text-xs table-auto"
        >
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <Th>Option Name</Th>
              <Th className="w-32 text-center">Is Standard</Th>
              {!readOnly && <Th className="w-16 text-center">Action</Th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
              {options.map((item, index) => (
                <tr key={index} className="hover:bg-muted/20">
                  <td className="p-2.5">
                    {readOnly ? (
                      <span className="font-medium text-foreground">{item.optionName}</span>
                    ) : (
                      <Input
                        value={item.optionName}
                        onChange={(e) => handleChangeName(index, e.target.value)}
                        placeholder="e.g. Counter Bored Holes, Rexine Cover"
                        className="w-full text-xs"
                      />
                    )}
                  </td>
                  <td className="p-2.5 text-center">
                    {readOnly ? (
                      item.isStandard ? (
                        <Badge variant="success">Standard</Badge>
                      ) : (
                        <Badge variant="neutral">Optional</Badge>
                      )
                    ) : (
                      <div className="flex items-center justify-center gap-1.5">
                        <Checkbox
                          checked={Boolean(item.isStandard)}
                          onChange={(e) => handleToggleStandard(index, e.target.checked)}
                        />
                        <span className="text-2xs text-muted-foreground">Standard</span>
                      </div>
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
              ))}
            </tbody>
        </TableContainer>
      )}
    </div>
  );
}

