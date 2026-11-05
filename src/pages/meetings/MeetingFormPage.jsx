/**
 * MeetingFormPage.jsx — Dedicated full-page form to schedule or edit a meeting.
 *
 * Routes:
 *   - /meetings/new
 *   - /meetings/:id/edit
 */

import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PageHeader,
  Button,
  Card,
  Input,
  SearchableSelect,
  DatePicker,
  TimePicker,
  Textarea,
  SaveButton,
  CancelButton,
} from '../../components/ui';
import {
  IconCalendar,
  IconClock,
  IconMapPin,
  IconInquiry,
  IconUsers,
  IconFileText,
  IconBack,
} from '../../constants/icons';
import { useMeetingForm } from './hooks/useMeetingForm';
import { useUserOptions } from '../../context/UsersContext';
import { mockInquiries } from '../../mocks/inquiries';
import AttendeeManager from './components/AttendeeManager';

const MEETING_TYPE_OPTIONS = [
  { value: 'Internal', label: 'Internal Discussion' },
  { value: 'Client', label: 'Client Meeting' },
  { value: 'Vendor', label: 'Vendor / Supplier Meeting' },
];

export default function MeetingFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { options: userOptions } = useUserOptions();

  const {
    isEdit,
    formData,
    fieldErrors,
    submitting,
    loading,
    error,
    setField,
    submit,
  } = useMeetingForm(id);

  // Inquiry options for dropdown
  const inquiryOptions = useMemo(() => {
    return (mockInquiries || []).map((inq) => ({
      value: String(inq.id || inq.InquiryId),
      label: `${inq.InquiryNo || inq.number} — ${inq.CustomerName || inq.client || 'Client'} (${inq.Status || 'Active'})`,
    }));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    const success = await submit();
    if (success) {
      navigate('/meetings');
    }
  }

  function handleCancel() {
    navigate('/meetings');
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-text-muted text-sm animate-pulse">
        Loading meeting details...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-20 w-full">
      {/* Top Header & Header Actions matching DelegationFormPage */}
      <PageHeader
        title={isEdit ? 'Edit Meeting' : 'Schedule Meeting'}
        subtitle={
          isEdit
            ? 'Update meeting schedule, location, agenda, or attendees.'
            : 'Fill in meeting details and invite internal staff or external guests.'
        }
        icon={<IconCalendar className="h-6 w-6 text-primary" aria-hidden="true" />}
        backButton={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={IconBack}
            onClick={handleCancel}
          >
            {isEdit ? 'Back to Details' : 'Back to Meetings'}
          </Button>
        }
        actions={
          <div className="flex items-center gap-2">
            <CancelButton
              onClick={handleCancel}
              disabled={submitting}
              size="sm"
            />
            <SaveButton
              type="submit"
              loading={submitting}
              disabled={submitting}
              size="sm"
              className="shadow-2xs"
            >
              {isEdit ? 'Save Changes' : 'Schedule Meeting'}
            </SaveButton>
          </div>
        }
      />

      {error && (
        <div className="p-4 rounded-xl border border-danger/30 bg-danger/10 text-danger text-sm">
          {error}
        </div>
      )}

      {/* Section 1: Basic Information */}
      <Card>
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
          <IconCalendar className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold text-heading">Basic Information</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wide">
              Meeting Title <span className="text-danger">*</span>
            </label>
            <Input
              value={formData.title}
              onChange={(e) => setField('title', e.target.value)}
              placeholder="e.g., Q3 Project Kickoff & Client Discovery"
              error={fieldErrors.title}
            />
            {fieldErrors.title && (
              <p className="text-xs text-danger mt-1">{fieldErrors.title}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wide">
              Meeting Type <span className="text-danger">*</span>
            </label>
            <SearchableSelect
              value={formData.meetingType}
              onChange={(e) => {
                const val = e?.target?.value !== undefined ? e.target.value : e;
                setField('meetingType', val);
              }}
              options={MEETING_TYPE_OPTIONS}
              placeholder="Select meeting type..."
              error={fieldErrors.meetingType}
            />
            {fieldErrors.meetingType && (
              <p className="text-xs text-danger mt-1">{fieldErrors.meetingType}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wide">
              Linked Inquiry (Optional)
            </label>
            <SearchableSelect
              value={formData.inquiryId}
              onChange={(e) => {
                const val = e?.target?.value !== undefined ? e.target.value : e;
                setField('inquiryId', val);
                const selectedInq = mockInquiries.find(
                  (i) => String(i.id || i.InquiryId) === String(val)
                );
                if (selectedInq) {
                  setField('inquiryNumber', selectedInq.InquiryNo);
                } else {
                  setField('inquiryNumber', '');
                }
              }}
              options={inquiryOptions}
              placeholder="Select related inquiry if applicable..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wide">
              Location or Video Link
            </label>
            <Input
              value={formData.location}
              onChange={(e) => setField('location', e.target.value)}
              placeholder="e.g., Conference Room Alpha / https://meet.google.com/xyz"
            />
          </div>
        </div>
      </Card>

      {/* Section 2: Date & Timing */}
      <Card>
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
          <IconClock className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold text-heading">Schedule & Timing</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wide">
              Meeting Date <span className="text-danger">*</span>
            </label>
            <DatePicker
              value={formData.meetingDate}
              onChange={(e) => {
                const val = e?.target?.value !== undefined ? e.target.value : e;
                setField('meetingDate', val);
              }}
              error={fieldErrors.meetingDate}
            />
            {fieldErrors.meetingDate && (
              <p className="text-xs text-danger mt-1">{fieldErrors.meetingDate}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wide">
              Start Time <span className="text-danger">*</span>
            </label>
            <TimePicker
              id="startTime"
              name="startTime"
              value={formData.startTime}
              onChange={(e) => {
                const val = e?.target?.value !== undefined ? e.target.value : e;
                setField('startTime', val);
              }}
              placeholder="Select start time..."
              error={fieldErrors.startTime}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wide">
              End Time
            </label>
            <TimePicker
              id="endTime"
              name="endTime"
              value={formData.endTime}
              onChange={(e) => {
                const val = e?.target?.value !== undefined ? e.target.value : e;
                setField('endTime', val);
              }}
              placeholder="Select end time..."
              error={fieldErrors.endTime}
            />
          </div>
        </div>
      </Card>

      {/* Section 3: Agenda & Objectives */}
      <Card>
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
          <IconFileText className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold text-heading">Agenda & Discussion Points</h2>
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wide">
            Meeting Agenda
          </label>
          <Textarea
            value={formData.agenda}
            onChange={(e) => setField('agenda', e.target.value)}
            placeholder="Outline the meeting purpose, key topics to discuss, and expected outcomes..."
            rows={4}
          />
        </div>
      </Card>

      {/* Section 4: Meeting Attendees */}
      <Card>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <IconUsers className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-heading">Meeting Attendees</h2>
          </div>
          {isEdit && (
            <span className="text-2xs sm:text-xs text-text-muted bg-surface px-2.5 py-1 rounded-md border border-border">
              Read-only while editing
            </span>
          )}
        </div>

        <AttendeeManager
          attendees={formData.attendees}
          onChange={(newAttendees) => setField('attendees', newAttendees)}
          userOptions={userOptions}
          readOnly={isEdit}
        />
      </Card>

      {/* Bottom Sticky Action Bar */}
      <div className="sticky bottom-4 z-10 flex items-center justify-end gap-3 p-4 bg-surface/90 backdrop-blur border border-border rounded-2xl shadow-lg">
        <CancelButton
          onClick={handleCancel}
          disabled={submitting}
        >
          Cancel
        </CancelButton>

        <SaveButton
          type="submit"
          loading={submitting}
          disabled={submitting}
        >
          {isEdit ? 'Save Changes' : 'Schedule Meeting'}
        </SaveButton>
      </div>
    </form>
  );
}
