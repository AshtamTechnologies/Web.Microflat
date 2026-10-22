/**
 * src/pages/companyRegistration/CompanyFormPage.jsx — Add & Edit Company Registration form.
 *
 * Route:
 *   - /company-registration/new
 *   - /company-registration/:id/edit
 *
 * Tab Progression:
 *   Company Details → Bank Details → Terms & Conditions and Disclaimer → Save
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import {
  PageHeader,
  Button,
  SaveButton,
  CancelButton,
  ScrollableTabs,
} from '../../components/ui';

import {
  IconBuilding2,
  IconBankDetails,
  IconFileText,
  IconBack,
  IconArrowRight,
  IconArrowLeft,
} from '../../constants/icons';

import { useCompanyContext } from '../../context/CompanyContext';
import CompanyDetailsTab from './components/CompanyDetailsTab';
import BankDetailsTab from './components/BankDetailsTab';
import TermsDisclaimerTab from './components/TermsDisclaimerTab';

const INITIAL_FORM = {
  companyName: '',
  firstName: '',
  lastName: '',
  email: '',
  phone1: '',
  phone2: '',
  gstNo: '',
  address1: '',
  address2: '',
  city: '',
  state: '',
  country: 'India',
  pinCode: '',
  isActive: true,

  bankName: '',
  bankBranch: '',
  bankAccountNo: '',
  bankIfscCode: '',
  bankSwiftCode: '',

  terms: '',
  disclaimer: '',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const SWIFT_REGEX = /^[A-Z0-9]{8}([A-Z0-9]{3})?$/;
const ACCOUNT_NO_REGEX = /^\d{8,20}$/;

export default function CompanyFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const { getCompanyById, addCompany, updateCompany } = useCompanyContext();

  const [activeTab, setActiveTab] = useState('company_details');
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

  // 1. Company Details Validation
  const validateCompanyDetails = () => {
    const errs = {};
    if (!form.companyName?.trim()) errs.companyName = 'Company name is required';
    if (!form.firstName?.trim()) errs.firstName = 'First name is required';
    if (!form.email?.trim()) {
      errs.email = 'Company email is required';
    } else if (!EMAIL_REGEX.test(form.email.trim())) {
      errs.email = 'Please enter a valid email address';
    }
    if (!form.phone1?.trim()) errs.phone1 = 'Primary phone number is required';
    if (!form.country?.trim()) errs.country = 'Country is required';
    if (!form.state?.trim()) errs.state = 'State is required';
    if (!form.city?.trim()) errs.city = 'City is required';
    if (!form.address1?.trim()) errs.address1 = 'Address line 1 is required';
    if (!form.pinCode?.trim()) errs.pinCode = 'PIN code is required';
    return errs;
  };

  // 2. Bank Details Validation
  const validateBankDetails = () => {
    const errs = {};
    const accNo = (form.bankAccountNo || '').trim();
    const ifsc = (form.bankIfscCode || '').trim().toUpperCase();
    const swift = (form.bankSwiftCode || '').trim().toUpperCase();

    if (!form.bankName?.trim()) {
      errs.bankName = 'Bank name is required';
    }
    if (!form.bankBranch?.trim()) {
      errs.bankBranch = 'Bank branch is required';
    }

    // Bank Account No Validation: numeric only, 8-20 digits
    if (!accNo) {
      errs.bankAccountNo = 'Bank account number is required';
    } else if (!/^\d+$/.test(accNo)) {
      errs.bankAccountNo = 'Account number must contain numbers only';
    } else if (accNo.length < 8 || accNo.length > 20) {
      errs.bankAccountNo = 'Account number must be between 8 and 20 digits';
    }

    // Bank IFSC Code Validation: 11 characters (4 letters, 0, 6 alphanumeric)
    if (!ifsc) {
      errs.bankIfscCode = 'Bank IFSC code is required';
    } else if (!IFSC_REGEX.test(ifsc)) {
      errs.bankIfscCode = 'Invalid IFSC code (e.g. HDFC0000042: 4 letters, 0, 6 characters)';
    }

    // Bank Swift Code Validation: Optional, but if entered must be 8 or 11 alphanumeric characters
    if (swift && !SWIFT_REGEX.test(swift)) {
      errs.bankSwiftCode = 'SWIFT / BIC code must be 8 or 11 alphanumeric characters (e.g. HDFCINBB or HDFCINBBBAR)';
    }

    return errs;
  };

  const validateForm = () => {
    return {
      ...validateCompanyDetails(),
      ...validateBankDetails(),
    };
  };

  const hasCompanyDetailsErrors = Boolean(
    errors.companyName ||
      errors.firstName ||
      errors.email ||
      errors.phone1 ||
      errors.address1 ||
      errors.city ||
      errors.state ||
      errors.country ||
      errors.pinCode
  );

  const hasBankErrors = Boolean(
    errors.bankName ||
      errors.bankBranch ||
      errors.bankAccountNo ||
      errors.bankIfscCode ||
      errors.bankSwiftCode
  );

  const handleSubmit = (e) => {
    if (e) e.preventDefault();

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstKey = Object.keys(validationErrors)[0];
      toast.error(validationErrors[firstKey] || 'Please fix required fields');

      // Switch to the tab with errors
      if (
        [
          'companyName',
          'firstName',
          'email',
          'phone1',
          'address1',
          'city',
          'state',
          'country',
          'pinCode',
        ].includes(firstKey)
      ) {
        setActiveTab('company_details');
      } else if (
        ['bankName', 'bankBranch', 'bankAccountNo', 'bankIfscCode', 'bankSwiftCode'].includes(
          firstKey
        )
      ) {
        setActiveTab('bank_details');
      }
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
      {/* ── Page Header (Actions match the active tab step) ── */}
      <PageHeader
        title={isEdit ? 'Edit Company Registration' : 'Register New Company'}
        icon={<IconBuilding2 className="h-6 w-6 text-primary" aria-hidden="true" />}
        subtitle={
          isEdit
            ? `Modify company credentials, banking, and legal terms for ${form.companyName || 'company'}`
            : 'Register your organization master profile, bank accounts, and contractual disclaimers'
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
          <div className="flex items-center gap-2 sm:gap-3">
            <CancelButton
              onClick={handleCancel}
              disabled={isSubmitting}
              size="sm"
            />

            {activeTab === 'company_details' && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setActiveTab('bank_details')}
                className="font-semibold"
              >
                Next: Bank Details
                <IconArrowRight size={14} className="ml-1.5" />
              </Button>
            )}

            {activeTab === 'bank_details' && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setActiveTab('terms_disclaimer')}
                className="font-semibold"
              >
                Next: Terms & Disclaimer
                <IconArrowRight size={14} className="ml-1.5" />
              </Button>
            )}

            {activeTab === 'terms_disclaimer' && (
              <SaveButton
                type="submit"
                loading={isSubmitting}
                disabled={isSubmitting}
                size="sm"
              >
                {isEdit ? 'Save Changes' : 'Save Company'}
              </SaveButton>
            )}
          </div>
        }
      />

      {/* ── Responsive Tabs Navigation Bar ── */}
      <ScrollableTabs
        variant="pills"
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          {
            id: 'company_details',
            label: '1. Company Details',
            icon: IconBuilding2,
            hasError: hasCompanyDetailsErrors,
          },
          {
            id: 'bank_details',
            label: '2. Bank Details',
            icon: IconBankDetails,
            hasError: hasBankErrors,
          },
          {
            id: 'terms_disclaimer',
            label: '3. Terms & Conditions and Disclaimer',
            icon: IconFileText,
          },
        ]}
      />

      {/* ── Active Tab Content ── */}
      <div className="pt-1">
        {activeTab === 'company_details' && (
          <CompanyDetailsTab
            form={form}
            onChange={handleFieldChange}
            errors={errors}
          />
        )}

        {activeTab === 'bank_details' && (
          <BankDetailsTab
            form={form}
            onChange={handleFieldChange}
            errors={errors}
          />
        )}

        {activeTab === 'terms_disclaimer' && (
          <TermsDisclaimerTab
            form={form}
            onChange={handleFieldChange}
            errors={errors}
          />
        )}
      </div>

      {/* ── Bottom Step Progression & Action Buttons (Aligned with top actions) ── */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border">
        {/* Previous tab navigation */}
        <div className="w-full sm:w-auto">
          {activeTab === 'bank_details' && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={IconArrowLeft}
              onClick={() => setActiveTab('company_details')}
              className="w-full sm:w-auto"
            >
              Previous: Company Details
            </Button>
          )}
          {activeTab === 'terms_disclaimer' && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={IconArrowLeft}
              onClick={() => setActiveTab('bank_details')}
              className="w-full sm:w-auto"
            >
              Previous: Bank Details
            </Button>
          )}
        </div>

        {/* Next / Save actions */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <CancelButton
            size="sm"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="flex-1 sm:flex-none justify-center"
          />

          {activeTab === 'company_details' && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setActiveTab('bank_details')}
              className="flex-1 sm:flex-none justify-center font-semibold"
            >
              Next: Bank Details
              <IconArrowRight size={14} className="ml-1.5" />
            </Button>
          )}

          {activeTab === 'bank_details' && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setActiveTab('terms_disclaimer')}
              className="flex-1 sm:flex-none justify-center font-semibold"
            >
              Next: Terms & Disclaimer
              <IconArrowRight size={14} className="ml-1.5" />
            </Button>
          )}

          {activeTab === 'terms_disclaimer' && (
            <SaveButton
              type="submit"
              size="sm"
              disabled={isSubmitting}
              loading={isSubmitting}
              className="flex-1 sm:flex-none justify-center font-semibold shadow-2xs"
            >
              {isEdit ? 'Save Changes' : 'Save Company'}
            </SaveButton>
          )}
        </div>
      </div>
    </form>
  );
}
