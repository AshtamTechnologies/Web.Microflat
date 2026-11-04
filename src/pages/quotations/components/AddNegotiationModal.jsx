import { useState } from 'react';
import { Modal, Button, CancelButton, Input, SearchableSelect, Textarea } from '../../../components/ui';
import { useQuotationsContext } from '../../../context/QuotationsContext';
import { useUsersContext } from '../../../context/UsersContext';
import { NEGOTIATION_MODES } from '../../../mocks/quotations';
import { IconCheck } from '../../../constants/icons';

export default function AddNegotiationModal({ isOpen, onClose, quotation }) {
  const { addNegotiationStage } = useQuotationsContext();
  const { allUsers = [], users = [] } = useUsersContext();
  const userList = allUsers.length > 0 ? allUsers : users;

  const nextStageNo = (quotation?.negotiations?.length || 0) + 1;

  const now = new Date();
  const defaultDateTime = `${now.toISOString().split('T')[0]}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const [stageData, setStageData] = useState({
    dateTime: defaultDateTime,
    mode: 'Call',
    handledBy: userList[0]?.name || userList[0]?.fullName || 'Janvi Motwani',
    clientContact: quotation?.contactPerson || '',
    ourOffer: '',
    clientCounter: '',
    revisionNo: quotation?.currentRevision !== undefined ? String(quotation.currentRevision) : '0',
    discussion: '',
  });

  const modeOptions = NEGOTIATION_MODES.map((m) => ({ value: m, label: m }));

  const revisionOptions = (quotation?.revisions || []).map((r) => ({
    value: String(r.revisionNo),
    label: `Revision ${r.revisionNo}`,
  }));

  const userOptions = userList.map((u) => {
    const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || u.email;
    return { value: name, label: name };
  });

  function handleSave() {
    if (!quotation) return;
    addNegotiationStage(quotation.id, stageData);
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Add Negotiation Stage · Stage ${nextStageNo}`}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            label="Stage No"
            disabled
            value={`Stage ${nextStageNo}`}
          />
          <Input
            label="Date & Time"
            type="datetime-local"
            required
            value={stageData.dateTime}
            onChange={(e) => setStageData((prev) => ({ ...prev, dateTime: e.target.value }))}
          />
          <SearchableSelect
            label="Linked Revision"
            options={revisionOptions}
            value={stageData.revisionNo}
            onChange={(e) => setStageData((prev) => ({ ...prev, revisionNo: e.target.value }))}
          />
          <SearchableSelect
            label="Interaction Mode"
            options={modeOptions}
            value={stageData.mode}
            onChange={(e) => setStageData((prev) => ({ ...prev, mode: e.target.value }))}
          />
          <SearchableSelect
            label="Handled By"
            options={userOptions.length > 0 ? userOptions : [{ value: 'Janvi Motwani', label: 'Janvi Motwani' }]}
            value={stageData.handledBy}
            onChange={(e) => setStageData((prev) => ({ ...prev, handledBy: e.target.value }))}
          />
          <Input
            label="Client Contact Person"
            value={stageData.clientContact}
            onChange={(e) => setStageData((prev) => ({ ...prev, clientContact: e.target.value }))}
          />
          <Input
            label="Our Offer (₹)"
            type="number"
            placeholder="e.g. 275000"
            value={stageData.ourOffer}
            onChange={(e) => setStageData((prev) => ({ ...prev, ourOffer: e.target.value }))}
          />
          <Input
            label="Client Counter (₹)"
            type="number"
            placeholder="e.g. 260000"
            value={stageData.clientCounter}
            onChange={(e) => setStageData((prev) => ({ ...prev, clientCounter: e.target.value }))}
          />
        </div>

        <Textarea
          label="Discussion Summary / Notes"
          rows={3}
          placeholder="Details discussed during this negotiation session..."
          value={stageData.discussion}
          onChange={(e) => setStageData((prev) => ({ ...prev, discussion: e.target.value }))}
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <CancelButton onClick={onClose}>Cancel</CancelButton>
          <Button variant="primary" onClick={handleSave} icon={<IconCheck size={15} />}>
            Save Negotiation Stage
          </Button>
        </div>
      </div>
    </Modal>
  );
}

