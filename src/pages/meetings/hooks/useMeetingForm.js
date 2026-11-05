/**
 * useMeetingForm.js — Form state management & validation for scheduling and editing meetings.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getMeetingById,
  scheduleMeeting,
  updateMeeting,
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
  });

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

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
            attendees: data.attendees || [],
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
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'title') updated.meetingTitle = value;
      if (field === 'meetingTitle') updated.title = value;
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
    const title = (formData.meetingTitle || formData.title || '').trim();
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

        if (isEdit) {
          await updateMeeting(id, payload);
        } else {
          await scheduleMeeting(payload, user || {});
        }
        return true;
      } catch (err) {
        setError(err?.message || 'Failed to save meeting.');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [validate, isEdit, id, formData, user]
  );

  return {
    isEdit,
    formData,
    setField,
    fieldErrors,
    loading,
    submitting,
    error,
    handleSubmit,
    submit: handleSubmit,
  };
}
