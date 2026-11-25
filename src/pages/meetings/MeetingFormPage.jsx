/**
 * MeetingFormPage.jsx — Dedicated workspace form to schedule or edit a meeting.
 *
 * Routes:
 *   - /meetings/new
 *   - /meetings/:id/edit
 */

import { useMemo, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
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
  Badge,
  RichTextEditor,
} from '../../components/ui';
import {
  IconCalendar,
  IconClock,
  IconMapPin,
  IconInquiry,
  IconUsers,
  IconFileText,
  IconBack,
  IconBuilding2,
  IconExternalLink,
  IconAttachment,
} from '../../constants/icons';
import { useMeetingForm } from './hooks/useMeetingForm';
import { useUserOptions } from '../../context/UsersContext';
import { useInquiriesContext } from '../../context/InquiriesContext';
import AttendeeManager from './components/AttendeeManager';
import MeetingAttachmentManager from './components/MeetingAttachmentManager';

const MEETING_TYPE_OPTIONS = [
  { value: 'Internal', label: 'Internal Discussion' },
  { value: 'Client', label: 'Client Meeting' },
  { value: 'Vendor', label: 'Vendor / Supplier Meeting' },
];

function getDurationBadge(startTime, endTime) {
  if (!startTime || !endTime) return null;
  const [sh, sm] = String(startTime).split(':').map(Number);
  const [eh, em] = String(endTime).split(':').map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return null;
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff <= 0) return null;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours} hr${hours > 1 ? 's' : ''}`;
  return `${mins} mins`;
}

export default function MeetingFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const returnPath = location.state?.from;
  const [searchParams] = useSearchParams();
  const inquiryIdParam = searchParams.get('inquiryId');
  const { options: userOptions } = useUserOptions();
  const inqCtx = useInquiriesContext();
  const inquiriesList = Array.isArray(inqCtx?.inquiries) ? inqCtx.inquiries : [];

  const {
    isEdit,
    formData,
    fieldErrors,
    submitting,
    loading,
    error,
    documentTypes,
    addQueuedAttachment,
    removeQueuedAttachment,
    deleteExistingAttachment,
    setField,
    submit,
  } = useMeetingForm(id);

  useEffect(() => {
    if (isEdit || !inquiryIdParam) return;
    if (!formData.inquiryId) {
      setField('inquiryId', String(inquiryIdParam));
    }
    const matched = inquiriesList.find(
      (i) => String(i.id || i.InquiryId) === String(inquiryIdParam)
    );
    if (matched) {
      if ((matched.InquiryNo || matched.inquiryNo) && !formData.inquiryNumber) {
        setField('inquiryNumber', matched.InquiryNo || matched.inquiryNo);
      }
      const customerContactName = matched.ContactPerson || matched.contactPerson;
      const customerEmail = matched.Email || matched.email || '';
      if (customerContactName && !formData.attendees.some((a) => a.name === customerContactName)) {
        setField('attendees', [
          ...formData.attendees,
          {
            name: customerContactName,
            externalName: customerContactName,
            email: customerEmail,
            externalEmail: customerEmail,
            type: 'Customer',
            isExternal: true,
          },
        ]);
      }
      const customerLocation = [
        matched.AddressLine1 || matched.address1,
        matched.City || matched.city,
        matched.State || matched.state,
      ].filter(Boolean).join(', ');
      if (customerLocation && !formData.location) {
        setField('location', customerLocation);
      }
    }
  }, [
    isEdit,
    inquiryIdParam,
    formData.inquiryId,
    formData.inquiryNumber,
    formData.attendees,
    formData.location,
    setField,
    inquiriesList,
  ]);

  // Inquiry options for dropdown
  const inquiryOptions = useMemo(() => {
    return (inquiriesList || []).map((inq) => ({
      value: String(inq.id || inq.InquiryId),
      label: `${inq.InquiryNo || inq.inquiryNo || inq.number} — ${inq.CustomerName || inq.companyName || inq.client || 'Client'}`,
    }));
  }, [inquiriesList]);

  // Matched inquiry preview
  const selectedInquiry = useMemo(() => {
    if (!formData.inquiryId) return null;
    return (inquiriesList || []).find(
      (i) => String(i.id || i.InquiryId) === String(formData.inquiryId)
    );
  }, [formData.inquiryId, inquiriesList]);

  const durationText = useMemo(() => {
    return getDurationBadge(formData.startTime, formData.endTime);
  }, [formData.startTime, formData.endTime]);

  async function handleSubmit(e) {
    e.preventDefault();
    const success = await submit();
    if (success) {
      navigate('/meetings');
    }
  }

  function handleCancel() {
    navigate(returnPath || '/meetings');
  }

  const backLabel = returnPath?.startsWith('/inquiries/')
    ? 'Back to Inquiry'
    : returnPath === '/inquiries'
      ? 'Back to Inquiries'
      : isEdit
        ? 'Back to Details'
        : 'Back to Meetings';

  if (loading) {
    return (
      <div className="p-12 text-center text-text-muted text-sm animate-pulse">
        Loading meeting details...
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-5 pb-12 w-full">
      {/* Top Header & Header Actions */}
      <PageHeader
        title={isEdit ? 'Edit Meeting' : 'Schedule Meeting'}
        subtitle={
          isEdit
            ? 'Update schedule, location, agenda, or participants.'
            : 'Fill in details and invite internal staff or external guests.'
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
            {backLabel}
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
        <div className="p-3.5 rounded-xl border border-danger/30 bg-danger/10 text-danger text-sm">
          {error}
        </div>
      )}

      {/* 2-Column Responsive Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Essentials, Agenda & Attendees (lg:col-span-7 xl:col-span-8) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-5">
          {/* Section 1: Meeting Essentials & Agenda */}
          <Card padding="md">
            <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-border">
              <IconFileText className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-heading">Meeting Details & Agenda</h2>
            </div>

            <div className="space-y-3.5">
              {/* Meeting Title */}
              <div>
                <label className="block text-2xs font-semibold text-text-muted mb-1 uppercase tracking-wide">
                  Meeting Title <span className="text-danger">*</span>
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => setField('title', e.target.value)}
                  placeholder="e.g., Technical Drawing Review & Tolerance Discussion"
                  error={fieldErrors.title}
                />
                {fieldErrors.title && (
                  <p className="text-xs text-danger mt-1">{fieldErrors.title}</p>
                )}
              </div>

              {/* Row: Meeting Type & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-text-muted mb-1 uppercase tracking-wide">
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
                  <label className="block text-2xs font-semibold text-text-muted mb-1 uppercase tracking-wide">
                    Location or Video Link
                  </label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setField('location', e.target.value)}
                    placeholder="e.g., Conf Room Alpha / https://meet.google.com/xyz"
                  />
                </div>
              </div>

              {/* Agenda & Notes */}
              <div>
                <label className="block text-2xs font-semibold text-text-muted mb-1.5 uppercase tracking-wide">
                  Meeting Agenda & Discussion Topics
                </label>
                <RichTextEditor
                  id="agenda"
                  name="agenda"
                  value={formData.agenda}
                  onChange={(e) => {
                    const val = e?.target?.value !== undefined ? e.target.value : e;
                    setField('agenda', val);
                  }}
                  placeholder="Outline the meeting purpose, key topics to discuss, and expected outcomes..."
                  minHeight="160px"
                />
              </div>
            </div>
          </Card>

          {/* Section 2: Meeting Attendees */}
          <Card padding="md">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-border">
              <div className="flex items-center gap-2">
                <IconUsers className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-heading">Participants & Invitees</h2>
              </div>
              <Badge variant="neutral" size="sm" className="text-2xs px-2 py-0.5">
                {formData.attendees?.length || 0} Attending
              </Badge>
            </div>

            <AttendeeManager
              attendees={formData.attendees}
              onChange={(newAttendees) => setField('attendees', newAttendees)}
              userOptions={userOptions}
              readOnly={false}
            />
          </Card>
        </div>

        {/* RIGHT COLUMN: Schedule, Linked Inquiry & Attachments (lg:col-span-5 xl:col-span-4) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-5">
          {/* Schedule & Timing Card */}
          <Card padding="md">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-border">
              <div className="flex items-center gap-2">
                <IconClock className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-heading">Schedule & Timing</h2>
              </div>
              {durationText && (
                <span className="text-2xs font-mono font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                  {durationText}
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-2xs font-semibold text-text-muted mb-1 uppercase tracking-wide">
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

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-2xs font-semibold text-text-muted mb-1 uppercase tracking-wide">
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
                    placeholder="Start..."
                    error={fieldErrors.startTime}
                  />
                  {fieldErrors.startTime && (
                    <p className="text-2xs text-danger mt-0.5">{fieldErrors.startTime}</p>
                  )}
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-text-muted mb-1 uppercase tracking-wide">
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
                    placeholder="End..."
                    error={fieldErrors.endTime}
                  />
                  {fieldErrors.endTime && (
                    <p className="text-2xs text-danger mt-0.5">{fieldErrors.endTime}</p>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Linked Inquiry Card */}
          <Card padding="md">
            <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-border">
              <IconInquiry className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-heading">Linked Inquiry</h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-2xs font-semibold text-text-muted mb-1 uppercase tracking-wide">
                  Related Inquiry (Optional)
                </label>
                <SearchableSelect
                  value={formData.inquiryId}
                  onChange={(e) => {
                    const val = e?.target?.value !== undefined ? e.target.value : e;
                    setField('inquiryId', val);
                    const selectedInq = inquiriesList.find(
                      (i) => String(i.id || i.InquiryId) === String(val)
                    );
                    if (selectedInq) {
                      setField('inquiryNumber', selectedInq.InquiryNo || selectedInq.number || '');
                    } else {
                      setField('inquiryNumber', '');
                    }
                  }}
                  options={inquiryOptions}
                  placeholder="Link an inquiry..."
                />
              </div>

              {/* Inquiry Preview Card */}
              {selectedInquiry ? (
                <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-1.5 text-xs animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-primary">
                      {selectedInquiry.InquiryNo || selectedInquiry.number}
                    </span>
                    <Badge variant="primary" size="sm" className="text-2xs px-1.5 py-0">
                      {selectedInquiry.Status || 'Active'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-heading font-medium">
                    <IconBuilding2 className="w-3.5 h-3.5 text-text-muted shrink-0" />
                    <span className="truncate">{selectedInquiry.CustomerName || selectedInquiry.client || 'Client'}</span>
                  </div>
                  {selectedInquiry.Subject && (
                    <p className="text-text-muted text-2xs truncate">
                      {selectedInquiry.Subject}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-2xs text-text-muted italic">
                  Leave empty if this meeting is a general internal discussion.
                </p>
              )}
            </div>
          </Card>

          {/* Meeting Attachments & Documents Card */}
          <Card padding="md">
            <MeetingAttachmentManager
              attachments={formData.existingAttachments || []}
              queuedAttachments={formData.queuedAttachments || []}
              onAddQueued={addQueuedAttachment}
              onRemoveQueued={removeQueuedAttachment}
              onDelete={deleteExistingAttachment}
              documentTypes={documentTypes}
              canUpload={true}
            />
          </Card>
        </div>
      </div>

      {/* Slim Bottom Action Bar for Small Screens or Scrolling */}
      <div className="flex items-center justify-end gap-2.5 p-3 bg-surface/90 backdrop-blur border border-border rounded-xl shadow-xs">
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
    </form>
  );
}
