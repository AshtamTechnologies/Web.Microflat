/**
 * useMeetingForm.js — Form state management & validation for scheduling and editing meetings.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getMeetingById,
  scheduleMeeting,
  updateMeeting,
  addAttendee,
  removeAttendee,
  uploadMeetingAttachment,
  deleteMeetingAttachment,
  getMeetingDocumentTypes,
} from '../../../services/meetings/meetingsService';
import { useAuthContext } from '../../../context/AuthContext';
import { getTodayISO } from '../../../utils/dateUtils';

export function useMeetingForm(id) {
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const [formData, setFormData] = useState({
    meetingTitle: '',
    title: '',
    meetingType: 'Internal', // 'Internal' | 'Client' | 'Vendor'
    inquiryId: '',
    inquiryNumber: '',
    meetingDate: getTodayISO ? getTodayISO() : new Date().toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '11:00',
    location: '',
    agenda: '',
    attendees: [],
    queuedAttachments: [], // [{ file, documentTypeId, documentTypeName, documentTitle, remarks, tempId }]
    existingAttachments: [], // [{ id, fileName, documentTypeName, remarks, ... }]
  });

  const [initialAttendees, setInitialAttendees] = useState([]);
  const [deletedAttachmentIds, setDeletedAttachmentIds] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    let mounted = true;
    async function fetchDocTypes() {
      try {
        const types = await getMeetingDocumentTypes();
        if (mounted && Array.isArray(types)) {
          setDocumentTypes(types);
        }
      } catch (err) {
        console.warn('Failed to load meeting document types:', err);
      }
    }
    fetchDocTypes();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isEdit) return;

    let mounted = true;
    async function fetchMeeting() {
      setLoading(true);
      setError(null);
      try {
        const data = await getMeetingById(id);
        if (mounted) {
          if (data.status !== 'Scheduled') {
            setError(`Cannot edit this meeting because its status is ${data.status}.`);
          }
          const meetingTitle = data.meetingTitle || data.title || '';
          const currentAttendees = Array.isArray(data.attendees) ? data.attendees : [];
          setInitialAttendees(currentAttendees);

          setFormData({
            meetingTitle,
            title: meetingTitle,
            meetingType: data.meetingType || 'Internal',
            inquiryId: data.inquiryId ? String(data.inquiryId) : '',
            inquiryNumber: data.inquiryNumber || '',
            meetingDate: data.meetingDate || '',
            startTime: data.startTime || '',
            endTime: data.endTime || '',
            location: data.location || '',
            agenda: data.agenda || '',
            attendees: currentAttendees,
            queuedAttachments: [],
            existingAttachments: Array.isArray(data.attachments) ? data.attachments : [],
          });
        }
      } catch (err) {
        if (mounted) setError(err?.message || 'Failed to load meeting.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchMeeting();
    return () => {
      mounted = false;
    };
  }, [id, isEdit]);

  const setField = useCallback((field, value) => {
    const cleanValue =
      value && typeof value === 'object' && value.target && value.target.value !== undefined
        ? value.target.value
        : value;

    setFormData((prev) => {
      const updated = { ...prev, [field]: cleanValue };
      if (field === 'title') updated.meetingTitle = cleanValue;
      if (field === 'meetingTitle') updated.title = cleanValue;
      return updated;
    });
    setFieldErrors((prev) => {
      if (prev[field] || (field === 'title' && prev.meetingTitle) || (field === 'meetingTitle' && prev.title)) {
        const next = { ...prev };
        delete next[field];
        delete next.title;
        delete next.meetingTitle;
        return next;
      }
      return prev;
    });
  }, []);

  const validate = useCallback(() => {
    const errors = {};
    const rawTitle = formData.meetingTitle || formData.title || '';
    const title = (typeof rawTitle === 'object' ? rawTitle?.target?.value || '' : String(rawTitle)).trim();
    if (!title) {
      errors.meetingTitle = 'Meeting title is required.';
      errors.title = 'Meeting title is required.';
    }
    if (!formData.meetingDate) {
      errors.meetingDate = 'Meeting date is required.';
    }
    if (!formData.startTime) {
      errors.startTime = 'Start time is required.';
    }
    if (formData.startTime && formData.endTime && formData.endTime <= formData.startTime) {
      errors.endTime = 'End time must be after start time.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const addQueuedAttachment = useCallback((attachmentItem) => {
    setFormData((prev) => ({
      ...prev,
      queuedAttachments: [...(prev.queuedAttachments || []), { ...attachmentItem, tempId: Date.now() + Math.random() }],
    }));
  }, []);

  const removeQueuedAttachment = useCallback((tempId) => {
    setFormData((prev) => ({
      ...prev,
      queuedAttachments: (prev.queuedAttachments || []).filter((item) => item.tempId !== tempId),
    }));
  }, []);

  const handleDeleteExistingAttachment = useCallback((attachmentId) => {
    setDeletedAttachmentIds((prev) => (prev.includes(attachmentId) ? prev : [...prev, attachmentId]));
    setFormData((prev) => ({
      ...prev,
      existingAttachments: (prev.existingAttachments || []).filter((a) => a.id !== attachmentId),
    }));
    return true;
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      if (!validate()) return false;

      setSubmitting(true);
      setError(null);
      try {
        const payload = {
          ...formData,
          meetingTitle: (formData.meetingTitle || formData.title || '').trim(),
        };

        let targetId = id;

        if (isEdit) {
          await updateMeeting(id, payload);

          // Synchronize attendee changes for existing meeting
          const currentAttendees = Array.isArray(formData.attendees) ? formData.attendees : [];

          // Find added attendees
          const addedAttendees = currentAttendees.filter((cur) => {
            if (cur.userId) {
              return !initialAttendees.some((init) => String(init.userId) === String(cur.userId));
            }
            return !initialAttendees.some(
              (init) =>
                init.externalName === cur.externalName &&
                (init.externalEmail || '') === (cur.externalEmail || '')
            );
          });

          // Find removed attendees
          const removedAttendees = initialAttendees.filter((init) => {
            if (init.userId) {
              return !currentAttendees.some((cur) => String(cur.userId) === String(init.userId));
            }
            return !currentAttendees.some(
              (cur) =>
                cur.externalName === init.externalName &&
                (cur.externalEmail || '') === (init.externalEmail || '')
            );
          });

          for (const att of addedAttendees) {
            try {
              await addAttendee(id, att);
            } catch (attErr) {
              console.warn('Failed to add attendee on edit:', attErr);
            }
          }

          for (const att of removedAttendees) {
            const attendeeIdToDelete = att.id || att.attendeeId;
            if (attendeeIdToDelete) {
              try {
                await removeAttendee(id, attendeeIdToDelete);
              } catch (attErr) {
                console.warn('Failed to remove attendee on edit:', attErr);
              }
            }
          }

          // Delete staged attachments on Save Changes
          if (deletedAttachmentIds.length > 0) {
            for (const attId of deletedAttachmentIds) {
              try {
                await deleteMeetingAttachment(attId);
              } catch (delErr) {
                console.warn('Failed to delete attachment on save:', delErr);
              }
            }
          }
        } else {
          const created = await scheduleMeeting(payload, user || {});
          targetId = created?.id;
        }

        // Upload queued attachments if any
        if (targetId && Array.isArray(formData.queuedAttachments) && formData.queuedAttachments.length > 0) {
          for (const att of formData.queuedAttachments) {
            try {
              await uploadMeetingAttachment(targetId, {
                documentTypeId: att.documentTypeId,
                documentName: att.documentName || att.documentTitle,
                documentTitle: att.documentTitle,
                remarks: att.remarks,
                file: att.file,
              });
            } catch (uploadErr) {
              console.warn('Failed to upload queued attachment:', uploadErr);
            }
          }
        }

        return targetId || true;
      } catch (err) {
        setError(err?.message || 'Failed to save meeting.');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [validate, isEdit, id, formData, initialAttendees, deletedAttachmentIds, user]
  );

  return {
    isEdit,
    formData,
    setField,
    fieldErrors,
    loading,
    submitting,
    error,
    documentTypes,
    addQueuedAttachment,
    removeQueuedAttachment,
    deleteExistingAttachment: handleDeleteExistingAttachment,
    handleSubmit,
    submit: handleSubmit,
  };
}
