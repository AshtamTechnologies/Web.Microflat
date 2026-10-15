/**
 * ClientFormPage.jsx — Full-page Add and Edit Client form for MicroFlat ERP.
 *
 * Routes:
 *   - /clients/new (Create mode)
 *   - /clients/:id/edit (Edit mode)
 *
 * Divided into 3 Tabs:
 *   - Tab 1: Company Details and Terms & Notes section
 *   - Tab 2: Client Addresses section
 *   - Tab 3: Contact Persons section
 *
 * Features:
 *   - Common Effective Date at the top level for all tabs, matching Vendor module conventions
 *   - Save button present on every tab form + top header + sticky footer
 *   - Rich text editors for Delivery Terms and Internal Comments matching InquiryFormPage
 *   - Working StatusSwitches in child editors and master form
 *   - Responsive grids without multiple delete options
 *   - Dirty form detection with confirmation prompt on discard
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Building2,
  FileText,
  MapPin,
  Users,
  Calendar,
  Clock,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';
import { IconClient } from '../../constants/icons';
import toast from 'react-hot-toast';

import {
  Button,
  Input,
  Select,
  StatusSwitch,
  Card,
  Checkbox,
  DatePicker,
  RichTextEditor,
  PageHeader,
  SearchableMultiSelect,
  Badge,
  ScrollableTabs,
} from '../../components/ui';
import { useClientsContext } from '../../context/ClientsContext';
import { usePaymentTermsContext } from '../../context/PaymentTermsContext';
import { CONTACT_TYPE_OPTIONS } from '../../mocks/clients';
import {
  getTodayIsoDate,
  formatDateDisplay,
} from '../../utils/effectiveDateUtils';
import AddressesEditor from './components/AddressesEditor';
import ContactsEditor from './components/ContactsEditor';

const INITIAL_FORM = {
  effectiveDate: getTodayIsoDate(),
  companyName: '',
  billingName: '',
  contactTypeId: 'Customer',
  email: '',
  gstNo: '',
  isActive: true,
  paymentTerms: [],
  deliveryTerms: '',
  comments: '',
  addresses: [],
  contacts: [],
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ClientFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const { getClientById, addClient, updateClient } = useClientsContext();
  const { paymentTerms = [] } = usePaymentTermsContext();

  const [activeTab, setActiveTab] = useState('company_terms');
  const [form, setForm] = useState(INITIAL_FORM);
  const [initialSnapshot, setInitialSnapshot] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sameAsCompany, setSameAsCompany] = useState(false);

  // Load existing client in edit mode
  useEffect(() => {
    if (isEdit) {
      const existing = getClientById(id);
      if (existing) {
        let loadedPaymentTerms = [];
        if (Array.isArray(existing.paymentTerms)) {
          loadedPaymentTerms = existing.paymentTerms;
        } else if (typeof existing.paymentTerms === 'string' && existing.paymentTerms.trim()) {
          const raw = existing.paymentTerms.trim();
          const directMatch = paymentTerms.find(
            (pt) =>
              pt.termCode?.toUpperCase() === raw.toUpperCase() ||
              pt.paymentTermId === raw
          );
          if (directMatch) {
            loadedPaymentTerms = [directMatch.termCode || directMatch.paymentTermId];
          } else if (raw.includes(',')) {
            const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
            loadedPaymentTerms = parts.map((part) => {
              const m = paymentTerms.find(
                (pt) =>
                  pt.termCode?.toUpperCase() === part.toUpperCase() ||
                  pt.paymentTermId === part
              );
              return m ? (m.termCode || m.paymentTermId) : part;
            });
          } else {
            loadedPaymentTerms = [raw];
          }
        }

        const loadedData = {
          effectiveDate: existing.effectiveDate || getTodayIsoDate(),
          companyName: existing.companyName || '',
          billingName: existing.billingName || '',
          contactTypeId: existing.contactTypeId || 'Customer',
          email: existing.email || '',
          gstNo: existing.gstNo || '',
          isActive: existing.isActive !== false,
          paymentTerms: loadedPaymentTerms,
          deliveryTerms: existing.deliveryTerms || '',
          comments: existing.comments || '',
          addresses: Array.isArray(existing.addresses) ? [...existing.addresses] : [],
          contacts: Array.isArray(existing.contacts) ? [...existing.contacts] : [],
        };
        setForm(loadedData);
        setInitialSnapshot(loadedData);
        setSameAsCompany(Boolean(existing.companyName && existing.companyName === existing.billingName));
      } else {
        toast.error('Client not found');
        navigate('/clients');
      }
    }
  }, [id, isEdit, getClientById, navigate, paymentTerms]);

  // Dirty detection
  const isDirty = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(initialSnapshot);
  }, [form, initialSnapshot]);

  // Handle company name change (syncs billing name if checkbox is active)
  const handleCompanyNameChange = (e) => {
    const val = e.target.value;
    setForm((prev) => {
      const next = { ...prev, companyName: val };
      if (sameAsCompany) {
        next.billingName = val;
      }
      return next;
    });
    if (errors.companyName) setErrors((prev) => ({ ...prev, companyName: null }));
  };

  // Toggle "Same as company name"
  const handleSameAsCompanyToggle = (checked) => {
    setSameAsCompany(checked);
    if (checked) {
      setForm((prev) => ({ ...prev, billingName: prev.companyName }));
    }
  };

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // Payment Terms options from Configuration
  const paymentTermOptions = useMemo(() => {
    const stripHtml = (html) => {
      if (!html) return '';
      return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    };

    return (paymentTerms || [])
      .filter((pt) => pt.isActive !== false)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
      .map((pt) => ({
        value: pt.termCode || pt.paymentTermId,
        label: pt.termCode,
        chipLabel: pt.termCode,
        subtitle: stripHtml(pt.description || ''),
        termCode: pt.termCode,
        description: pt.description || '',
      }));
  }, [paymentTerms]);

  // Resolve selected payment terms objects for preview cards
  const selectedPaymentTermsList = useMemo(() => {
    const selected = Array.isArray(form.paymentTerms)
      ? form.paymentTerms
      : form.paymentTerms
      ? [form.paymentTerms]
      : [];

    return selected.map((val) => {
      const match = paymentTerms.find(
        (pt) =>
          pt.termCode?.toUpperCase() === String(val).toUpperCase() ||
          pt.paymentTermId === val
      );
      if (match) return match;
      return {
        paymentTermId: val,
        termCode: val,
        description: '',
      };
    });
  }, [form.paymentTerms, paymentTerms]);

  const handleRemovePaymentTerm = (termValue) => {
    setForm((prev) => {
      const current = Array.isArray(prev.paymentTerms) ? prev.paymentTerms : [];
      return {
        ...prev,
        paymentTerms: current.filter((t) => t !== termValue),
      };
    });
  };


  // Master validation
  const validateMasterForm = () => {
    const errs = {};

    if (!form.effectiveDate) {
      errs.effectiveDate = 'Effective date is required';
    }

    if (!form.companyName?.trim()) {
      errs.companyName = 'Company name is required';
    } else if (form.companyName.length > 200) {
      errs.companyName = 'Max 200 characters';
    }

    if (form.billingName && form.billingName.length > 200) {
      errs.billingName = 'Max 200 characters';
    }

    if (!form.contactTypeId) {
      errs.contactTypeId = 'Contact type is required';
    }

    if (form.email?.trim()) {
      if (form.email.length > 254) {
        errs.email = 'Max 254 characters';
      } else if (!EMAIL_REGEX.test(form.email.trim())) {
        errs.email = 'Please enter a valid email address';
      }
    }

    if (form.gstNo && form.gstNo.length > 50) {
      errs.gstNo = 'Max 50 characters';
    }

    return errs;
  };

  // Tab errors indicator
  const hasCompanyTermsErrors = Boolean(
    errors.companyName || errors.effectiveDate || errors.billingName || errors.email || errors.gstNo
  );

  // Master submit
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    const validationErrors = validateMasterForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstKey = Object.keys(validationErrors)[0];
      toast.error(validationErrors[firstKey] || 'Please fix validation errors');

      // If error belongs to Tab 1, switch to it
      if (['effectiveDate', 'companyName', 'billingName', 'email', 'gstNo'].includes(firstKey)) {
        setActiveTab('company_terms');
      }

      setTimeout(() => {
        const el = document.getElementById(firstKey);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return;
    }

    setIsSubmitting(true);

    try {
      // 700ms simulated delay matching ERP specifications
      await new Promise((res) => setTimeout(res, 700));

      let savedRecord;
      if (isEdit) {
        savedRecord = updateClient(id, form);
      } else {
        savedRecord = addClient(form);
      }

      const targetId = savedRecord?.clientId || savedRecord?.id || id;
      navigate(`/clients/${targetId}`);
    } catch (err) {
      toast.error('An unexpected error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to discard them?');
      if (!confirmed) return;
    }
    navigate(isEdit ? `/clients/${id}` : '/clients');
  };

  // Reusable Save Action Bar rendered at the end of every tab
  const renderTabSaveBar = (tabName) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl bg-surface/80 border border-border shadow-2xs mt-4">
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
        <span className="truncate">
          {isDirty ? (
            <span className="text-warning font-medium">Unsaved modifications</span>
          ) : (
            `Form in sync (${tabName})`
          )}
        </span>
      </div>

      <div className="flex items-center gap-2.5 justify-end w-full sm:w-auto">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleCancel}
          disabled={isSubmitting}
          className="flex-1 sm:flex-none justify-center"
        >
          <X size={14} className="mr-1.5" aria-hidden="true" />
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={isSubmitting}
          className="flex-1 sm:flex-none justify-center font-semibold shadow-2xs"
        >
          <Save size={14} className="mr-1.5 shrink-0" aria-hidden="true" />
          {isSubmitting ? 'Saving Client...' : isEdit ? 'Save Changes' : 'Save Client'}
        </Button>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-6">
      {/* ── Top Header & Actions Bar ── */}
      <PageHeader
        title={isEdit ? 'Edit Client' : 'Add Client'}
        icon={<IconClient className="h-6 w-6 text-primary" aria-hidden="true" />}
        subtitle={
          isEdit
            ? `Update company credentials, addresses, and contacts for ${form.companyName || 'client'}`
            : 'Register a new customer, distributor, dealer, or agency account'
        }
        backButton={
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface hover:bg-surface/80 text-text hover:text-primary border border-border shadow-2xs transition-all duration-150 group cursor-pointer"
          >
            <ArrowLeft
              size={14}
              className="text-text-muted group-hover:text-primary group-hover:-translate-x-0.5 transition-transform"
            />
            <span>Back to Clients</span>
          </button>
        }
        actions={
          <div className="flex items-center justify-end gap-2.5 w-full sm:w-auto shrink-0">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial"
            >
              <X size={16} className="mr-1.5" aria-hidden="true" />
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial justify-center shadow-xs font-semibold"
            >
              <Save size={16} className="mr-1.5 shrink-0" aria-hidden="true" />
              {isSubmitting ? 'Saving Client...' : isEdit ? 'Save Changes' : 'Save Client'}
            </Button>
          </div>
        }
      />

      {/* ── COMPACT COMMON TOP BAR: Common Effective Date (Shared Across All Tabs) ── */}
      <Card padding="none" className="p-3 sm:px-3.5 sm:py-2.5 bg-bg border border-border rounded-xl shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Compact Entity Identity */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Building2 size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xs sm:text-sm font-bold text-heading break-words">
                  {form.companyName?.trim() || (isEdit ? 'Client Master' : 'New Client Registration')}
                </h2>
                <Badge variant={form.isActive ? 'active' : 'inactive'} className="text-2xs px-1.5 py-0">
                  {form.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <p className="text-2xs text-text-muted truncate mt-0.5">
                {isEdit ? `Client ID: ${id}` : 'Fill company profile, addresses, and contacts across tabs'}
              </p>
            </div>
          </div>

          {/* Right: Clean Effective Date Control */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto shrink-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <Calendar size={13} className="text-primary shrink-0" />
              <label htmlFor="effectiveDate" className="text-xs font-semibold text-heading whitespace-nowrap cursor-pointer">
                Effective Date <span className="text-danger">*</span>
              </label>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="w-full sm:w-44">
                <DatePicker
                  id="effectiveDate"
                  name="effectiveDate"
                  value={form.effectiveDate}
                  onChange={(e) => handleFieldChange('effectiveDate', e.target ? e.target.value : e)}
                  error={errors.effectiveDate}
                  disabled={isEdit}
                />
              </div>

              {isEdit && (
                <button
                  type="button"
                  onClick={() => navigate(`/clients/${id}/effective-dates`)}
                  className="text-text-muted hover:text-primary transition-colors p-1.5 rounded-md cursor-pointer shrink-0 border border-border sm:border-0"
                  title="View past and scheduled revisions"
                >
                  <Clock size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ── TABS NAVIGATION BAR (Fully touch & mouse scrollable on mobile) ── */}
      <ScrollableTabs
        variant="pills"
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          {
            id: 'company_terms',
            label: 'Client Details & Terms',
            icon: Building2,
            hasError: hasCompanyTermsErrors,
          },
          {
            id: 'addresses',
            label: 'Client Addresses',
            icon: MapPin,
            badge: form.addresses.length,
          },
          {
            id: 'contacts',
            label: 'Contact Persons',
            icon: Users,
            badge: form.contacts.length,
          },
        ]}
      />

      {/* ── TAB 1 CONTENT: Company Details & Terms & Notes ── */}
      {activeTab === 'company_terms' && (
        <div className="space-y-6">
          {/* 1. Company Details Card */}
          <Card padding="md" className="space-y-4">
            <div className="flex items-center gap-2.5 border-b border-border pb-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Building2 size={17} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-heading">Company Details</h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Legal name, trade billing title, contact classification, and tax credentials
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Company Name */}
              <div>
                <Input
                  label="Company Name"
                  id="companyName"
                  required
                  maxLength={200}
                  value={form.companyName}
                  onChange={handleCompanyNameChange}
                  placeholder="e.g. Bharat Heavy Precision Ltd"
                  error={errors.companyName}
                />
              </div>

              {/* Billing Name */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="billingName" className="form-label text-xs font-medium text-heading">
                    Billing Name
                  </label>
                  <Checkbox
                    id="same-as-company"
                    checked={sameAsCompany}
                    onChange={handleSameAsCompanyToggle}
                    label="Same as company name"
                  />
                </div>
                <Input
                  id="billingName"
                  maxLength={200}
                  value={form.billingName}
                  disabled={sameAsCompany}
                  onChange={(e) => handleFieldChange('billingName', e.target.value)}
                  placeholder="Legal invoicing name"
                  error={errors.billingName}
                />
              </div>

              {/* Contact Type */}
              <div>
                <Select
                  label="Contact Type"
                  id="contactTypeId"
                  required
                  value={form.contactTypeId}
                  onChange={(e) => handleFieldChange('contactTypeId', e.target.value)}
                  options={CONTACT_TYPE_OPTIONS}
                  error={errors.contactTypeId}
                />
              </div>

              {/* Official Email */}
              <div>
                <Input
                  label="Official Email"
                  id="email"
                  type="email"
                  maxLength={254}
                  value={form.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  placeholder="e.g. procurement@bharatprecision.in"
                  error={errors.email}
                />
              </div>

              {/* GST No */}
              <div>
                <Input
                  label="GST Number"
                  id="gstNo"
                  maxLength={50}
                  value={form.gstNo}
                  onChange={(e) => handleFieldChange('gstNo', e.target.value.toUpperCase())}
                  placeholder="e.g. 24AAACB1234F1Z5"
                  className="font-mono tabular-nums uppercase"
                  error={errors.gstNo}
                />
              </div>

              {/* Account Status Switch */}
              <div className="flex flex-col justify-end pb-1.5">
                <label className="text-xs font-medium text-heading block mb-1">
                  Account Status
                </label>
                <div className="flex items-center gap-2.5">
                  <StatusSwitch
                    checked={form.isActive}
                    onChange={(checked) => handleFieldChange('isActive', checked)}
                    activeLabel="Active"
                    inactiveLabel="Inactive"
                  />
                  <span className="text-xs text-text-muted">
                    {form.isActive ? 'Active for transactions' : 'Inactive account'}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* 2. Terms & Notes Card */}
          <Card padding="md" className="space-y-4">
            <div className="flex items-center gap-2.5 border-b border-border pb-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FileText size={17} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-heading">Terms & Notes</h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Standard payment terms, freight dispatch clauses, and operational remarks
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Payment Terms Multi-Select */}
              <div className="space-y-2.5">
                <SearchableMultiSelect
                  label="Payment Terms"
                  id="paymentTerms"
                  name="paymentTerms"
                  options={paymentTermOptions}
                  value={Array.isArray(form.paymentTerms) ? form.paymentTerms : form.paymentTerms ? [form.paymentTerms] : []}
                  onChange={(e) => handleFieldChange('paymentTerms', e.target.value)}
                  placeholder="Select payment terms..."
                  searchPlaceholder="Search payment terms..."
                  emptyText="No payment terms found in Configuration"
                  hint="Multiple terms can be selected from Configuration"
                />

                {/* Selected Terms Cards */}
                {selectedPaymentTermsList.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-2xs font-semibold text-text-muted uppercase tracking-wider">
                      <span>Selected Terms ({selectedPaymentTermsList.length})</span>
                      <button
                        type="button"
                        onClick={() => handleFieldChange('paymentTerms', [])}
                        className="text-text-muted hover:text-danger cursor-pointer transition-colors"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                      {selectedPaymentTermsList.map((term) => {
                        const desc = term.description || '';
                        const isHtml = /<[a-z][\s\S]*>/i.test(desc);

                        return (
                          <div
                            key={term.paymentTermId || term.termCode}
                            className="p-3 rounded-lg bg-surface/70 border border-border space-y-1.5 text-xs group hover:border-primary/30 transition-colors shadow-2xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <Badge variant="role" className="font-mono text-xs px-2 py-0.5 shrink-0">
                                {term.termCode}
                              </Badge>
                              <button
                                type="button"
                                onClick={() => handleRemovePaymentTerm(term.termCode || term.paymentTermId)}
                                className="text-text-muted hover:text-danger p-0.5 rounded cursor-pointer transition-colors shrink-0"
                                title={`Remove ${term.termCode}`}
                                aria-label={`Remove ${term.termCode}`}
                              >
                                <X size={14} />
                              </button>
                            </div>
                            {desc ? (
                              isHtml ? (
                                <div
                                  className="text-xs text-text leading-relaxed prose prose-xs max-w-none [&_ol]:list-decimal [&_ol]:pl-4 [&_ul]:list-disc [&_ul]:pl-4 [&_p]:my-0.5"
                                  dangerouslySetInnerHTML={{ __html: desc }}
                                />
                              ) : (
                                <p className="text-xs text-text whitespace-pre-line leading-relaxed">
                                  {desc}
                                </p>
                              )
                            ) : (
                              <p className="text-2xs text-text-muted italic">No terms description specified</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Rich Text Editors for Delivery Terms & Internal Comments */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Delivery Terms (Rich Text Editor) */}
                <RichTextEditor
                  id="deliveryTerms"
                  name="deliveryTerms"
                  label="Delivery Terms"
                  value={form.deliveryTerms}
                  onChange={(e) => handleFieldChange('deliveryTerms', e.target ? e.target.value : e)}
                  placeholder="Provide delivery terms, dispatch schedules, transport scope, freight clauses, or packaging guidelines..."
                  hint="Formatted delivery and transport terms for dispatch documentation."
                />

                {/* Internal Comments (Rich Text Editor) */}
                <RichTextEditor
                  id="comments"
                  name="comments"
                  label="Internal Comments"
                  value={form.comments}
                  onChange={(e) => handleFieldChange('comments', e.target ? e.target.value : e)}
                  placeholder="Record customer preferences, commercial considerations, internal audit notes, or special packaging instructions..."
                  hint="Internal notes visible to sales, procurement, and production teams."
                />
              </div>
            </div>
          </Card>

          {/* Save Button for Tab 1 */}
          {renderTabSaveBar('Client Details & Terms')}
        </div>
      )}

      {/* ── TAB 2 CONTENT: Client Addresses ── */}
      {activeTab === 'addresses' && (
        <div className="space-y-6">
          <AddressesEditor
            rows={form.addresses}
            onChange={(updatedAddresses) =>
              setForm((prev) => ({ ...prev, addresses: updatedAddresses }))
            }
          />

          {/* Save Button for Tab 2 */}
          {renderTabSaveBar('Client Addresses')}
        </div>
      )}

      {/* ── TAB 3 CONTENT: Contact Persons ── */}
      {activeTab === 'contacts' && (
        <div className="space-y-6">
          <ContactsEditor
            rows={form.contacts}
            onChange={(updatedContacts) =>
              setForm((prev) => ({ ...prev, contacts: updatedContacts }))
            }
          />

          {/* Save Button for Tab 3 */}
          {renderTabSaveBar('Contact Persons')}
        </div>
      )}

    </form>
  );
}
