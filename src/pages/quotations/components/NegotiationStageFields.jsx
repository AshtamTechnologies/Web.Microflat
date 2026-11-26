/**
 * NegotiationStageFields.jsx — Shared form fields for capturing a commercial negotiation stage.
 * Reused by AddNegotiationModal and QuotationFormPage (Revision Mode).
 */

import { Input, SearchableSelect, Textarea } from '../../../components/ui';
import { NEGOTIATION_MODES, CURRENCY_SYMBOLS, formatCurrency } from '../../../mocks/quotations';

export default function NegotiationStageFields({
  stageNo,
  stageData,
  onChange,
  revisionOptions = [],
  lockedRevisionLabel = '',
  userOptions = [],
  currency = 'INR',
  suggestedOffer = null,
  modeOptions: customModeOptions = null,
}) {
  const modeOptions = customModeOptions && customModeOptions.length > 0
    ? customModeOptions
    : NEGOTIATION_MODES.map((m) => ({ value: m, label: m }));
  const currencySym = CURRENCY_SYMBOLS[currency] || '₹';

  const handleField = (field, value) => {
    onChange((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        <Input
          label="Stage No"
          disabled
          value={`Stage ${stageNo}`}
        />

        <div id="field-neg-datetime">
          <Input
            label="Date & Time"
            type="datetime-local"
            required
            value={stageData.dateTime}
            onChange={(e) => handleField('dateTime', e.target.value)}
          />
        </div>

        {lockedRevisionLabel ? (
          <Input
            label="Linked Revision"
            disabled
            value={lockedRevisionLabel}
          />
        ) : (
          <SearchableSelect
            label="Linked Revision"
            options={revisionOptions}
            value={stageData.revisionNo}
            onChange={(e) => handleField('revisionNo', e.target.value)}
          />
        )}

        <SearchableSelect
          label="Interaction Mode"
          options={modeOptions}
          value={stageData.mode}
          onChange={(e) => handleField('mode', e.target.value)}
        />

        <SearchableSelect
          label="Handled By"
          options={
            userOptions.length > 0
              ? userOptions
              : []
          }
          value={stageData.handledBy}
          onChange={(e) => handleField('handledBy', e.target.value)}
        />

        <Input
          label="Client Contact Person"
          placeholder="Client representative name"
          value={stageData.clientContact}
          onChange={(e) => handleField('clientContact', e.target.value)}
        />

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="mf-label m-0">Our Offer ({currencySym})</label>
            {suggestedOffer !== null && suggestedOffer > 0 && (
              <button
                type="button"
                onClick={() => handleField('ourOffer', String(Math.round(suggestedOffer * 100) / 100))}
                className="text-3xs font-semibold text-primary hover:underline cursor-pointer"
                title={`Fill with ${formatCurrency(suggestedOffer, currency)}`}
              >
                Use Rev Total
              </button>
            )}
          </div>
          <Input
            type="number"
            step="0.01"
            placeholder="e.g. 275000"
            value={stageData.ourOffer}
            onChange={(e) => handleField('ourOffer', e.target.value)}
          />
        </div>

        <Input
          label={`Client Counter (${currencySym})`}
          type="number"
          step="0.01"
          placeholder="e.g. 260000"
          value={stageData.clientCounter}
          onChange={(e) => handleField('clientCounter', e.target.value)}
        />
      </div>

      <div id="field-neg-discussion">
        <Textarea
          label="Discussion Summary / Notes"
          required={Boolean(lockedRevisionLabel)}
          rows={3}
          placeholder="Details discussed during this negotiation session, client counter-offer rationale, agreed concessions..."
          value={stageData.discussion}
          onChange={(e) => handleField('discussion', e.target.value)}
        />
      </div>
    </div>
  );
}

