import { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal, Button, CancelButton } from '../../../components/ui';
import { useQuotationsContext } from '../../../context/QuotationsContext';
import { useUsersContext } from '../../../context/UsersContext';
import { useAuthContext } from '../../../context/AuthContext';
import { IconCheck, IconWarning } from '../../../constants/icons';
import NegotiationStageFields from './NegotiationStageFields';

export default function AddNegotiationModal({ isOpen, onClose, quotation, selectedRevisionId }) {
  const { addNegotiationStage, lookups } = useQuotationsContext();
  const { allUsers = [], users = [] } = useUsersContext();
  const { user } = useAuthContext();
  const userList = allUsers.length > 0 ? allUsers : users;

  const nextStageNo = (quotation?.negotiations?.length || 0) + 1;
  const isConfirmed = quotation?.status === 'Confirmed';

  const getInitialData = useCallback(() => {
    const now = new Date();
    const defaultDateTime = `${now.toISOString().split('T')[0]}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const loggedUserName = user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.name;
    const fallbackUser = userList[0] ? `${userList[0].firstName || ''} ${userList[0].lastName || ''}`.trim() || userList[0].name : 'Sales Exec';

    return {
      dateTime: defaultDateTime,
      mode: 'Call',
      handledBy: loggedUserName || fallbackUser,
      clientContact: quotation?.contactPerson || '',
      ourOffer: '',
      clientCounter: '',
      revisionNo: quotation?.currentRevision !== undefined ? String(quotation.currentRevision) : '0',
      discussion: '',
    };
  }, [quotation, userList, user]);

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

  const rawModes = lookups?.modes || lookups?.negotiationModes;
  const modeOptions = useMemo(() => {
    if (Array.isArray(rawModes) && rawModes.length > 0) {
      return rawModes.map((m) => ({
        value: typeof m === 'object' ? (m.name || m.value) : m,
        label: typeof m === 'object' ? (m.name || m.label) : m,
      }));
    }
    return null;
  }, [rawModes]);

  function handleSave() {
    if (!quotation || isConfirmed) return;

    // Resolve handledBy user ID
    const selectedUser = userList.find((u) => {
      const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || u.email;
      return name === stageData.handledBy;
    });
    const handledByUserId = selectedUser?.id || (user?.id ? user.id : null);

    // Resolve revision ID
    const selectedRevision = (quotation?.revisions || []).find(
      (r) => String(r.revisionNo) === String(stageData.revisionNo)
    );
    const resolvedRevId =
      selectedRevisionId ||
      selectedRevision?.id ||
      selectedRevision?.revisionId ||
      quotation?.latestRevisionId ||
      quotation?.id;

    const payload = {
      negotiationOn: stageData.dateTime ? stageData.dateTime.slice(0, 10) : new Date().toISOString().slice(0, 10),
      date: stageData.dateTime ? stageData.dateTime.slice(0, 10) : new Date().toISOString().slice(0, 10),
      dateTime: stageData.dateTime,
      handledByUserId,
      handledByName: stageData.handledBy,
      handledBy: stageData.handledBy,
      clientContactId: quotation?.clientContactId || null,
      clientContact: stageData.clientContact || quotation?.contactPerson || '',
      contactName: stageData.clientContact || quotation?.contactPerson || '',
      mode: stageData.mode || 'Call',
      discussion: stageData.discussion || '',
      notes: stageData.discussion || '',
      ourOfferAmount: stageData.ourOffer ? Number(stageData.ourOffer) : null,
      ourOffer: stageData.ourOffer ? Number(stageData.ourOffer) : null,
      clientCounterAmount: stageData.clientCounter ? Number(stageData.clientCounter) : null,
      clientCounter: stageData.clientCounter ? Number(stageData.clientCounter) : null,
      revisionNo: Number(stageData.revisionNo) || 0,
      revisionId: resolvedRevId,
    };

    addNegotiationStage(quotation.id, payload, resolvedRevId);
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
        {isConfirmed && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
            <IconWarning size={16} className="shrink-0" />
            <span>This quotation is already Confirmed. Negotiations cannot be added to confirmed quotations.</span>
          </div>
        )}

        <NegotiationStageFields
          stageNo={nextStageNo}
          stageData={stageData}
          onChange={setStageData}
          revisionOptions={revisionOptions}
          userOptions={userOptions}
          modeOptions={modeOptions}
          currency={quotation?.currency || 'INR'}
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <CancelButton onClick={handleCancel}>Cancel</CancelButton>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isConfirmed}
            icon={<IconCheck size={15} />}
          >
            Save Negotiation Stage
          </Button>
        </div>
      </div>
    </Modal>
  );
}
