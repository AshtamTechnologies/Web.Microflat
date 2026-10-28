/**
 * src/pages/companyRegistration/CompanyFormPage.jsx — Add & Edit Company Registration form.
 *
 * Route:
 *   - /company-registration/new
 *   - /company-registration/:id/edit
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import {
  PageHeader,
  Button,
  SaveButton,
  CancelButton,
} from '../../components/ui';

import {
  IconBuilding2,
  IconBack,
} from '../../constants/icons';

import { useCompanyContext } from '../../context/CompanyContext';
import CompanyDetailsTab from './components/CompanyDetailsTab';

const INITIAL_FORM = {
  companyName: '',
  contactPersonName: '',
  contactPersonEmail: '',
  contactPersonMobile: '',
  email: '',
  website: '',
  phone1: '',
  phone2: '',
  gstNo: '',
  address1: '',
  address2: '',
  city: '',
  state: '',
  country: '',
  pinCode: '',
  isActive: true,
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CompanyFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const { getCompanyById, addCompany, updateCompany } = useCompanyContext();

  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load existing company if in Edit mode
  useEffect(() => {
    if (isEdit) {
      const existing = getCompanyById(id);
      if (existing) {
        setForm({
          ...INITIAL_FORM,
          ...existing,
          country: existing.country || '',
          state: existing.state || '',
          website: existing.website || '',
          contactPersonName:
            existing.contactPersonName ||
            [existing.firstName, existing.lastName].filter(Boolean).join(' ') ||
            '',
          contactPersonEmail: existing.contactPersonEmail || existing.email || '',
          contactPersonMobile: existing.contactPersonMobile || existing.phone1 || '',
        });
      } else {
        toast.error('Company not found');
        navigate('/company-registration');
      }
    }
  }, [id, isEdit, getCompanyById, navigate]);

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // Company Details Validation
  const validateCompanyDetails = () => {
    const errs = {};
    if (!form.companyName?.trim()) errs.companyName = 'Company name is required';
    if (!form.contactPersonName?.trim()) errs.contactPersonName = 'Contact person name is required';
    if (!form.contactPersonEmail?.trim()) {
      errs.contactPersonEmail = 'Contact person email is required';
    } else if (!EMAIL_REGEX.test(form.contactPersonEmail.trim())) {
      errs.contactPersonEmail = 'Please enter a valid email address';
    }
    if (!form.contactPersonMobile?.trim()) errs.contactPersonMobile = 'Contact person mobile is required';

    if (!form.email?.trim()) {
      errs.email = 'Company email is required';
    } else if (!EMAIL_REGEX.test(form.email.trim())) {
      errs.email = 'Please enter a valid email address';
    }
    if (!form.phone1?.trim()) errs.phone1 = 'Primary landline phone number is required';
    if (!String(form.country || '').trim()) errs.country = 'Country is required';
    if (!String(form.state || '').trim()) errs.state = 'State is required';
    if (!form.city?.trim()) errs.city = 'City is required';
    if (!form.address1?.trim()) errs.address1 = 'Address line 1 is required';
    if (!form.pinCode?.trim()) errs.pinCode = 'PIN code is required';
    return errs;
  };

  const validateForm = () => {
    return validateCompanyDetails();
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstKey = Object.keys(validationErrors)[0];
      toast.error(validationErrors[firstKey] || 'Please fix required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEdit) {
        updateCompany(id, form);
        toast.success('Company updated successfully');
      } else {
        addCompany(form);
        toast.success('Company registered successfully');
      }
      navigate('/company-registration');
    } catch (err) {
      toast.error('Failed to save company registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Direct cancel / back navigation without confirmation popup
  const handleCancel = () => {
    navigate('/company-registration');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-12 w-full">
      {/* ── Page Header ── */}
      <PageHeader
        title={isEdit ? 'Edit Company Registration' : 'Register New Company'}
        icon={<IconBuilding2 className="h-6 w-6 text-primary" aria-hidden="true" />}
        subtitle={
          isEdit
            ? `Modify corporate profile, contact details, and registered address for ${form.companyName || 'company'}`
            : 'Register your organization master profile, contact details, and registered address'
        }
        backButton={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={IconBack}
            onClick={handleCancel}
          >
            Back to Companies
          </Button>
        }
        actions={
          <div className="flex items-center gap-2">
            <CancelButton
              onClick={handleCancel}
              disabled={isSubmitting}
              size="sm"
            />
            <SaveButton
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting}
              size="sm"
            >
              {isEdit ? 'Save Changes' : 'Save Company'}
            </SaveButton>
          </div>
        }
      />

      {/* ── Company Details Content ── */}
      <CompanyDetailsTab
        form={form}
        onChange={handleFieldChange}
        errors={errors}
      />

      {/* ── Bottom Action Buttons ── */}
      <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
        <CancelButton
          size="sm"
          onClick={handleCancel}
          disabled={isSubmitting}
        />
        <SaveButton
          type="submit"
          size="sm"
          disabled={isSubmitting}
          loading={isSubmitting}
          className="font-semibold shadow-2xs"
        >
          {isEdit ? 'Save Changes' : 'Save Company'}
        </SaveButton>
      </div>
    </form>
  );
}
