import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Modal, Button, CancelButton } from '../../../components/ui';
import { useQuotationsContext } from '../../../context/QuotationsContext';
import { useUsersContext } from '../../../context/UsersContext';
import { IconCheck, IconWarning } from '../../../constants/icons';
import NegotiationStageFields from './NegotiationStageFields';

export default function EditNegotiationModal({ isOpen, onClose, stage, quotation }) {
  const { updateNegotiationStage, lookups } = useQuotationsContext();
  const { allUsers = [], users = [], ensureAllActiveUsersLoaded } = useUsersContext();
  const userList = allUsers.length > 0 ? allUsers : users;
  const activeUserList = userList.filter((u) => u.isActive !== false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isConfirmed = quotation?.poReceived || quotation?.status === 'Confirmed' || quotation?.status === 'PO Received';
  const stageNum = stage?.stageNo ?? stage?.stageId ?? 1;

  const getInitialData = useCallback(() => {
    if (!stage) {
      const now = new Date();
      return {
        dateTime: `${now.toISOString().split('T')[0]}T12:00`,
        mode: 'Call',
        handledBy: '',
        clientContact: '',
        ourOffer: '',
        clientCounter: '',
        revisionNo: '0',
        discussion: '',
      };
    }

    let dt = stage.dateTime;
    if (!dt) {
      const d = stage.negotiationOn || stage.date || stage.createdOn;
      dt = d ? (String(d).includes('T') ? String(d).slice(0, 16) : `${String(d).slice(0, 10)}T12:00`) : new Date().toISOString().slice(0, 16);
    } else if (dt.length > 16) {
      dt = dt.slice(0, 16);
    }

    const ourOfferVal = stage.ourOfferAmount !== null && stage.ourOfferAmount !== undefined
      ? String(stage.ourOfferAmount)
      : (stage.ourOffer !== null && stage.ourOffer !== undefined ? String(stage.ourOffer) : '');

    const clientCounterVal = stage.clientCounterAmount !== null && stage.clientCounterAmount !== undefined
      ? String(stage.clientCounterAmount)
      : (stage.clientCounter !== null && stage.clientCounter !== undefined ? String(stage.clientCounter) : '');

    return {
      dateTime: dt,
      mode: stage.mode || 'Call',
      handledBy: stage.handledByName || stage.handledBy || '',
      clientContact: stage.contactName || stage.clientContact || quotation?.contactPerson || '',
      ourOffer: ourOfferVal,
      clientCounter: clientCounterVal,
      revisionNo: stage.revisionNo !== undefined ? String(stage.revisionNo) : '0',
      discussion: stage.discussion || stage.notes || '',
    };
  }, [stage, quotation]);

  const [stageData, setStageData] = useState(getInitialData);

  useEffect(() => {
    if (!isOpen) return undefined;

    let isMounted = true;
    setIsLoadingUsers(true);
    ensureAllActiveUsersLoaded()
      .catch((err) => {
        toast.error(err?.message || 'Failed to load users for negotiation.');
      })
      .finally(() => {
        if (isMounted) setIsLoadingUsers(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, ensureAllActiveUsersLoaded]);

  useEffect(() => {
    if (isOpen && stage) {
      setStageData(getInitialData());
    }
  }, [isOpen, stage, getInitialData]);

  const revisionOptions = (quotation?.revisions || []).map((r) => ({
    value: String(r.revisionNo),
    label: `Revision ${r.revisionNo}`,
  }));

  const userOptions = activeUserList.map((u) => {
    const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || u.email;
    return { value: name, label: name, id: u.id };
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

  async function handleSave() {
    if (!quotation || !stage || isConfirmed) return;

    // Resolve handledBy user ID (match by trimmed name or id)
    const selectedUser = activeUserList.find((u) => {
      const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || u.email;
      return name.toLowerCase() === String(stageData.handledBy || '').trim().toLowerCase() || String(u.id) === String(stageData.handledBy);
    });
    const handledByUserId = selectedUser?.id || stage.handledByUserId || null;

    const payload = {
      negotiationOn: stageData.dateTime ? stageData.dateTime.slice(0, 10) : new Date().toISOString().slice(0, 10),
      date: stageData.dateTime ? stageData.dateTime.slice(0, 10) : new Date().toISOString().slice(0, 10),
      dateTime: stageData.dateTime,
      handledByUserId,
      handledByName: stageData.handledBy,
      handledBy: stageData.handledBy,
      clientContactId: stage.clientContactId || quotation?.clientContactId || null,
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
    };

    try {
      setIsSaving(true);
      await updateNegotiationStage(quotation.id, stage.id || stage.stageId, payload);
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Failed to update negotiation stage.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Negotiation Stage · Stage ${stageNum}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {isConfirmed && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
            <IconWarning size={16} className="shrink-0" />
            <span>This quotation is Confirmed. Negotiation stages cannot be modified.</span>
          </div>
        )}

        <NegotiationStageFields
          stageNo={stageNum}
          stageData={stageData}
          onChange={setStageData}
          revisionOptions={revisionOptions}
          userOptions={userOptions}
          userOptionsLoading={isLoadingUsers}
          modeOptions={modeOptions}
          currency={quotation?.currency || 'INR'}
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <CancelButton onClick={onClose}>Cancel</CancelButton>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isConfirmed || isSaving}
            icon={<IconCheck size={15} />}
          >
            {isSaving ? 'Saving...' : 'Update Negotiation Stage'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
