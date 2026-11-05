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
          setFormData({
            meetingTitle: data.meetingTitle || '',
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
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      if (prev[field]) {
        const next = { ...prev };
        delete next[field];
        return next;
      }
      return prev;
    });
  }, []);

  const validate = useCallback(() => {
    const errors = {};
    if (!formData.meetingTitle.trim()) {
      errors.meetingTitle = 'Meeting title is required.';
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
      if (e) e.preventDefault();
      if (!validate()) return false;

      setSubmitting(true);
      setError(null);
      try {
        if (isEdit) {
          await updateMeeting(id, formData);
        } else {
          await scheduleMeeting(formData, user || {});
        }
        navigate('/meetings');
        return true;
      } catch (err) {
        setError(err?.message || 'Failed to save meeting.');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [validate, isEdit, id, formData, user, navigate]
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
  };
}

