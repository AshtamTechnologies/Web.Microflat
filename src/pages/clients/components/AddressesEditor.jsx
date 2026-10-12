/**
 * AddressesEditor.jsx — Child Address Rows Manager for Client Registration.
 *
 * Implements "form above, grid below, edit-in-place" pattern using useRowsEditor hook.
 * Handles cascading Country -> State selection and validation.
 */

import { useMemo, useCallback } from 'react';
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Building,
} from 'lucide-react';
import {
  Button,
  Card,
  Input,
  Select,
  SearchableSelect,
  Toggle,
  Badge,
  TableContainer,
  Th,
  Td,
} from '../../../components/ui';
import { useRowsEditor } from '../../../hooks/useRowsEditor';
import {
  ADDRESS_TYPE_OPTIONS,
  COUNTRY_OPTIONS,
  STATE_OPTIONS,
  getCountryName,
  getStateName,
  getAddressTypeBadgeVariant,
} from '../../../mocks/clients';

const INITIAL_ADDRESS_FORM = {
  clientAddressId: null,
  addressType: 'Billing',
  address1: '',
  address2: '',
  countryId: 'IN',
  stateId: '',
  city: '',
  zipCode: '',
  isActive: true,
};

export default function AddressesEditor({ rows = [], onChange }) {
  const validateAddress = useCallback((form) => {
    const errors = {};
    if (!form.addressType) errors.addressType = 'Address type is required';
    if (!form.address1?.trim()) errors.address1 = 'Address line 1 is required';
    if (form.address1 && form.address1.length > 250) errors.address1 = 'Max 250 characters';
    if (form.address2 && form.address2.length > 250) errors.address2 = 'Max 250 characters';
    if (!form.countryId) errors.countryId = 'Country is required';
    if (!form.city?.trim()) errors.city = 'City is required';
    if (form.city && form.city.length > 100) errors.city = 'Max 100 characters';
    if (form.zipCode && form.zipCode.length > 20) errors.zipCode = 'Max 20 characters';
    return errors;
  }, []);

  const {
    formState,
    handleFieldChange,
    fieldErrors,
    editingId,
    isEditing,
    editingIndex,
    handleAddOrUpdate,
    handleStartEdit,
    handleCancelEdit,
    handleRemove,
    handleToggleRowActive,
  } = useRowsEditor({
    rows,
    onChange,
    initialFormValues: INITIAL_ADDRESS_FORM,
    idField: 'clientAddressId',
    rowName: 'Address',
    validateRow: validateAddress,
  });

  // Filter states based on selected country
  const selectedCountryCode = useMemo(() => {
    if (!formState.countryId) return '';
    return typeof formState.countryId === 'object' && formState.countryId !== null
      ? formState.countryId.value || ''
      : String(formState.countryId);
  }, [formState.countryId]);

  const stateOptions = useMemo(() => {
    if (!selectedCountryCode || !STATE_OPTIONS[selectedCountryCode]) {
      return [];
    }
    return STATE_OPTIONS[selectedCountryCode];
  }, [selectedCountryCode]);

  const handleCountryChange = (e) => {
    const val = typeof e === 'object' && e !== null && 'target' in e ? e.target.value : e;
    const countryCode = typeof val === 'object' && val !== null ? val.value || '' : String(val || '');
    handleFieldChange('countryId', countryCode);
    // Reset stateId whenever country changes
    handleFieldChange('stateId', '');
  };

  const handleStateChange = (e) => {
    const val = typeof e === 'object' && e !== null && 'target' in e ? e.target.value : e;
    const stateCode = typeof val === 'object' && val !== null ? val.value || '' : String(val || '');
    handleFieldChange('stateId', stateCode);
  };

  return (
    <Card padding="md" className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <MapPin size={17} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-heading">Client Addresses</h3>
              <Badge variant="neutral" className="text-xs font-mono px-2 py-0.5">
                {rows.length}
              </Badge>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Add billing, shipping, registered office, or works addresses
            </p>
          </div>
        </div>

        {isEditing && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-md">
              Editing address #{editingIndex + 1}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={handleCancelEdit}
              className="text-xs text-text-muted hover:text-danger"
            >
              <X size={13} className="mr-1" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* ── Form Above ── */}
      <div className="bg-surface/50 border border-border rounded-xl p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Address Type */}
          <div>
            <Select
              label="Address Type"
              id="addr-type"
              required
              value={formState.addressType}
              onChange={(e) => handleFieldChange('addressType', e.target.value)}
              options={ADDRESS_TYPE_OPTIONS}
              error={fieldErrors.addressType}
            />
          </div>

          {/* Country */}
          <div>
            <SearchableSelect
              label="Country"
              id="addr-country"
              required
              value={formState.countryId}
              onChange={handleCountryChange}
              options={COUNTRY_OPTIONS}
              placeholder="Select country..."
              searchPlaceholder="Search countries..."
              error={fieldErrors.countryId}
            />
          </div>

          {/* State (Cascading) */}
          <div>
            <SearchableSelect
              label="State / Province"
              id="addr-state"
              value={formState.stateId}
              onChange={handleStateChange}
              options={stateOptions}
              disabled={!formState.countryId || stateOptions.length === 0}
              placeholder={
                !formState.countryId
                  ? 'Select country first'
                  : stateOptions.length === 0
                  ? 'No states listed'
                  : 'Select state...'
              }
              searchPlaceholder="Search states..."
              error={fieldErrors.stateId}
            />
          </div>

          {/* City */}
          <div>
            <Input
              label="City"
              id="addr-city"
              required
              maxLength={100}
              value={formState.city}
              onChange={(e) => handleFieldChange('city', e.target.value)}
              placeholder="e.g. Ahmedabad"
              error={fieldErrors.city}
            />
          </div>

          {/* Address 1 */}
          <div className="sm:col-span-2">
            <Input
              label="Address Line 1"
              id="addr-line1"
              required
              maxLength={250}
              value={formState.address1}
              onChange={(e) => handleFieldChange('address1', e.target.value)}
              placeholder="Street address, plot no, building name"
              error={fieldErrors.address1}
            />
          </div>

          {/* Address 2 */}
          <div>
            <Input
              label="Address Line 2"
              id="addr-line2"
              maxLength={250}
              value={formState.address2}
              onChange={(e) => handleFieldChange('address2', e.target.value)}
              placeholder="Apartment, suite, landmark (optional)"
              error={fieldErrors.address2}
            />
          </div>

          {/* ZIP Code */}
          <div>
            <Input
              label="ZIP / Postal Code"
              id="addr-zip"
              maxLength={20}
              value={formState.zipCode}
              onChange={(e) => handleFieldChange('zipCode', e.target.value)}
              placeholder="e.g. 382445"
              className="font-mono tabular-nums"
              error={fieldErrors.zipCode}
            />
          </div>
        </div>

        {/* Status Toggle & Submit Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border/60">
          <div className="flex items-center gap-3">
            <Toggle
              label="Address Active"
              id="addr-active-toggle"
              checked={formState.isActive}
              onChange={(checked) => handleFieldChange('isActive', checked)}
            />
            <span className="text-xs text-text-muted">
              {formState.isActive ? 'Active for deliveries & billing' : 'Inactive address record'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isEditing && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
                className="text-xs"
              >
                Cancel
              </Button>
            )}
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleAddOrUpdate}
              className="text-xs font-semibold"
            >
              {isEditing ? (
                <>
                  <Check size={14} className="mr-1.5" />
                  Update Address
                </>
              ) : (
                <>
                  <Plus size={14} className="mr-1.5" />
                  Add Address
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Grid Below ── */}
      <div>
        {rows.length === 0 ? (
          <div className="text-center py-8 px-4 border border-dashed border-border rounded-xl bg-surface/20 space-y-1.5">
            <Building size={22} className="mx-auto text-text-muted/60" />
            <p className="text-xs font-medium text-heading">No addresses added</p>
            <p className="text-[11px] text-text-muted">
              Use the form above to add a billing or shipping address for this client.
            </p>
          </div>
        ) : (
          <TableContainer
            className="overflow-x-auto"
            tableClassName="min-w-[780px] w-full text-left border-collapse text-xs table-auto sm:table-fixed"
          >
            <thead className="bg-surface/80 border-b border-border">
              <tr>
                <Th className="py-2.5 px-3 w-28 whitespace-nowrap">TYPE</Th>
                <Th className="py-2.5 px-3 min-w-[200px]">ADDRESS</Th>
                <Th className="py-2.5 px-3 min-w-[190px] whitespace-nowrap">CITY / STATE / COUNTRY</Th>
                <Th className="py-2.5 px-3 w-24 whitespace-nowrap">ZIP</Th>
                <Th className="py-2.5 px-3 w-32 text-center whitespace-nowrap">STATUS</Th>
                <Th className="py-2.5 px-3 w-24 text-right whitespace-nowrap">ACTIONS</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-bg">
              {rows.map((row, index) => {
                const rowId = row.clientAddressId || row.id || `addr_${index}`;
                const isCurrentEditing = editingId === rowId;
                const rowCountryId = typeof row.countryId === 'object' && row.countryId !== null
                  ? row.countryId.value || ''
                  : String(row.countryId || '');
                const rowStateId = typeof row.stateId === 'object' && row.stateId !== null
                  ? row.stateId.value || ''
                  : String(row.stateId || '');
                const countryName = getCountryName(rowCountryId);
                const stateName = getStateName(rowCountryId, rowStateId);

                  return (
                    <tr
                      key={rowId}
                      className={`transition-colors hover:bg-surface/50 ${
                        isCurrentEditing ? 'bg-primary/5 ring-1 ring-primary/20' : ''
                      }`}
                    >
                      {/* Type */}
                      <Td className="py-3 px-3">
                        <Badge variant={getAddressTypeBadgeVariant(row.addressType)} className="text-[11px] px-2 py-0.5">
                          {row.addressType}
                        </Badge>
                      </Td>

                      {/* Address 1 & 2 */}
                      <Td className="py-3 px-3">
                        <p className="font-medium text-heading text-xs">{row.address1}</p>
                        {row.address2 && (
                          <p className="text-[11px] text-text-muted mt-0.5">{row.address2}</p>
                        )}
                      </Td>

                      {/* City / State / Country */}
                      <Td className="py-3 px-3 text-xs text-text">
                        <div>
                          <span className="font-medium text-heading">{row.city}</span>
                          {stateName && <span className="text-text-muted">, {stateName}</span>}
                        </div>
                        <div className="text-[11px] text-text-muted">{countryName}</div>
                      </Td>

                      {/* ZIP */}
                      <Td className="py-3 px-3 font-mono tabular-nums text-text-muted">
                        {row.zipCode || '—'}
                      </Td>

                      {/* Status */}
                      <Td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleRowActive(rowId)}
                          title={`Click to mark ${row.isActive ? 'Inactive' : 'Active'}`}
                          className={[
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer transition-colors select-none',
                            row.isActive
                              ? 'bg-success/10 text-success border border-success/20 hover:bg-success/20'
                              : 'bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20',
                          ].join(' ')}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              row.isActive ? 'bg-success' : 'bg-danger'
                            }`}
                            aria-hidden="true"
                          />
                          {row.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </Td>

                      {/* Actions */}
                      <Td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            onClick={() => handleStartEdit(row)}
                            className="h-7 w-7 p-0 text-text-muted hover:text-primary hover:bg-primary/5"
                            title="Edit Address"
                          >
                            <Pencil size={13} />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            onClick={() => handleRemove(rowId)}
                            className="h-7 w-7 p-0 text-text-muted hover:text-danger hover:bg-danger/5"
                            title="Remove Address"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
          </TableContainer>
        )}
      </div>
    </Card>
  );
}
