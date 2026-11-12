import { useState, useEffect, useCallback } from 'react';
import { Modal, Button, CancelButton } from '../../../components/ui';
import { useQuotationsContext } from '../../../context/QuotationsContext';
import { useUsersContext } from '../../../context/UsersContext';
import { IconCheck } from '../../../constants/icons';
import NegotiationStageFields from './NegotiationStageFields';

export default function AddNegotiationModal({ isOpen, onClose, quotation }) {
  const { addNegotiationStage } = useQuotationsContext();
  const { allUsers = [], users = [] } = useUsersContext();
  const userList = allUsers.length > 0 ? allUsers : users;

  const nextStageNo = (quotation?.negotiations?.length || 0) + 1;

  const getInitialData = useCallback(() => {
    const now = new Date();
    const defaultDateTime = `${now.toISOString().split('T')[0]}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return {
      dateTime: defaultDateTime,
      mode: 'Call',
      handledBy: userList[0]?.name || userList[0]?.fullName || 'Janvi Motwani',
      clientContact: quotation?.contactPerson || '',
      ourOffer: '',
      clientCounter: '',
      revisionNo: quotation?.currentRevision !== undefined ? String(quotation.currentRevision) : '0',
      discussion: '',
    };
  }, [quotation, userList]);

  const [stageData, setStageData] = useState(getInitialData);

  // Reset form whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      setStageData(getInitialData());
    }
  }, [isOpen, getInitialData]);

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
    setStageData(getInitialData());
    onClose();
  }

  function handleCancel() {
    setStageData(getInitialData());
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={`Add Negotiation Stage · Stage ${nextStageNo}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        <NegotiationStageFields
          stageNo={nextStageNo}
          stageData={stageData}
          onChange={setStageData}
          revisionOptions={revisionOptions}
          userOptions={userOptions}
          currency={quotation?.currency || 'INR'}
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <CancelButton onClick={handleCancel}>Cancel</CancelButton>
          <Button variant="primary" onClick={handleSave} icon={<IconCheck size={15} />}>
            Save Negotiation Stage
          </Button>
        </div>
      </div>
    </Modal>
  );
}
