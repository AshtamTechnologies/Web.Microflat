import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DelegationPage from './pages/delegation/DelegationPage';
import AllDelegationsPage from './pages/delegation/AllDelegationsPage';
import DelegationFormPage from './pages/delegation/DelegationFormPage';
import DelegationViewPage from './pages/delegation/DelegationViewPage';
import AppLayout from './components/layout/AppLayout';
import UsersPage from './pages/users/UsersPage';
import { UsersProvider } from './context/UsersContext';
import VendorsPage from './pages/vendors/VendorsPage';
import VendorDashboardPage from './pages/vendors/VendorDashboardPage';
import VendorFormPage from './pages/vendors/VendorFormPage';
import VendorApprovalPage from './pages/approvals/VendorApprovalPage';
import VendorApprovalViewPage from './pages/approvals/VendorApprovalViewPage';
import PurchaseRequisitionApprovalPage from './pages/approvals/PurchaseRequisitionApprovalPage';
import VendorEffectiveDatesPage from './pages/vendors/VendorEffectiveDatesPage';
import { VendorsProvider } from './context/VendorsContext';
import VendorBankDetailsPage from './pages/vendorBankDetails/VendorBankDetailsPage';
import VendorBankDetailsFormPage from './pages/vendorBankDetails/VendorBankDetailsFormPage';
import VendorBankDetailsViewPage from './pages/vendorBankDetails/VendorBankDetailsViewPage';
import { VendorBankDetailsProvider } from './context/VendorBankDetailsContext';
import { CountryStateProvider } from './context/CountryStateContext';

import PurchaseRequisition from './pages/PurchaseRequisition/PurchaseRequisition';
import PurchaseRequisitionDashboardPage from './pages/PurchaseRequisition/PurchaseRequisitionDashboardPage';
import PurchaseRequisitionCreate from './pages/PurchaseRequisition/PurchaseRequisitionCreate';
import PurchaseRequisitionView from './pages/PurchaseRequisition/PurchaseRequisitionView';
import PurchaseRequisitionEdit from './pages/PurchaseRequisition/PurchaseRequisitionEdit';
import { PurchaseRequisitionProvider } from './context/PurchaseRequisitionContext';

import InquiriesPage from './pages/inquiries/InquiriesPage';
import InquiryFormPage from './pages/inquiries/InquiryFormPage';
import InquiryViewPage from './pages/inquiries/InquiryViewPage';
import { InquiriesProvider } from './context/InquiriesContext';
import { InquiryDocumentsProvider } from './context/InquiryDocumentsContext';

import SeriesSetupPage from './pages/configuration/SeriesSetupPage';
import { SeriesProvider } from './context/SeriesContext';

import DocumentTypesPage from './pages/configuration/DocumentTypesPage';
import { DocumentTypesProvider } from './context/DocumentTypesContext';

import ProductCategoriesPage from './pages/configuration/ProductCategoriesPage';
import { ProductCategoriesProvider } from './context/ProductCategoriesContext';

import UomPage from './pages/configuration/UomPage';
import { UomProvider } from './context/UomContext';

import RegionsPage from './pages/configuration/RegionsPage';
import { RegionsProvider } from './context/RegionsContext';

import PaymentTermsPage from './pages/configuration/PaymentTermsPage';
import { PaymentTermsProvider } from './context/PaymentTermsContext';
import ProcessFlowsPage from './pages/configuration/processFlow/ProcessFlowsPage';
import ProcessFlowEditorPage from './pages/configuration/processFlow/ProcessFlowEditorPage';

import UserViewPage from './pages/users/UserViewPage';
import { UserSessionsProvider } from './context/UserSessionsContext';
import { AuthProvider, useAuthContext } from './context/AuthContext';

import ClientsPage from './pages/clients/ClientsPage';
import ClientFormPage from './pages/clients/ClientFormPage';
import ClientEffectiveDatesPage from './pages/clients/ClientEffectiveDatesPage';
import { ClientsProvider } from './context/ClientsContext';

import CompanyRegistrationPage from './pages/companyRegistration/CompanyRegistrationPage';
import CompanyFormPage from './pages/companyRegistration/CompanyFormPage';
import CompanyViewPage from './pages/companyRegistration/CompanyViewPage';
import { CompanyProvider } from './context/CompanyContext';
import CompanyBankDetailsPage from './pages/companyBankDetails/CompanyBankDetailsPage';
import CompanyBankDetailsFormPage from './pages/companyBankDetails/CompanyBankDetailsFormPage';
import CompanyBankDetailsViewPage from './pages/companyBankDetails/CompanyBankDetailsViewPage';
import { CompanyBankDetailsProvider } from './context/CompanyBankDetailsContext';
import { ProcessFlowProvider } from './context/ProcessFlowContext';
import ScrollToTop from './components/common/ScrollToTop';
import { GlobalTooltip } from './components/ui';

/**
 * Route guard: enforces authentication on protected routes.
 * While restoring session on reload, renders a clean loading state.
 * If not authenticated, redirects to /login preserving the return path.
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuthContext();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs text-text-muted font-medium">Verifying session…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <GlobalTooltip />
      <AuthProvider>
        <UserSessionsProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<LoginPage />} />
            <Route path="/reset-password" element={<LoginPage />} />

            {/* Authenticated routes — wrapped in ProtectedRoute, AppLayout, and Context Providers */}
            <Route
              element={
                <ProtectedRoute>
                  <CountryStateProvider>
                    <UsersProvider>
                      <VendorsProvider>
                        <VendorBankDetailsProvider>
                          <ClientsProvider>
                            <PurchaseRequisitionProvider>
                              <InquiriesProvider>
                                <InquiryDocumentsProvider>
                                  <DocumentTypesProvider>
                                    <ProductCategoriesProvider>
                                      <UomProvider>
                                        <RegionsProvider>
                                          <PaymentTermsProvider>
                                            <SeriesProvider>
                                              <CompanyProvider>
                                                <CompanyBankDetailsProvider>
                                                  <ProcessFlowProvider>
                                                    <AppLayout />
                                                  </ProcessFlowProvider>
                                                </CompanyBankDetailsProvider>
                                              </CompanyProvider>
                                            </SeriesProvider>
                                          </PaymentTermsProvider>
                                        </RegionsProvider>
                                      </UomProvider>
                                    </ProductCategoriesProvider>
                                  </DocumentTypesProvider>
                                </InquiryDocumentsProvider>
                              </InquiriesProvider>
                            </PurchaseRequisitionProvider>
                          </ClientsProvider>
                        </VendorBankDetailsProvider>
                      </VendorsProvider>
                    </UsersProvider>
                  </CountryStateProvider>
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/delegation" element={<DelegationPage />} />
              <Route path="/delegation/all" element={<AllDelegationsPage />} />
              <Route path="/delegation/new" element={<DelegationFormPage />} />
              <Route path="/delegation/:id" element={<DelegationViewPage />} />
              <Route path="/delegation/:id/edit" element={<DelegationFormPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/users/:id" element={<UserViewPage />} />
              <Route path="/vendors" element={<VendorsPage />} />
              <Route path="/vendors/dashboard" element={<VendorDashboardPage />} />
              <Route path="/vendors/new" element={<VendorFormPage />} />
              <Route path="/vendors/:id" element={<VendorEffectiveDatesPage />} />
              <Route path="/vendors/:id/edit" element={<VendorFormPage />} />
              <Route path="/vendors/:id/effective-dates" element={<VendorEffectiveDatesPage />} />
              <Route path="/approvals/vendors" element={<VendorApprovalPage />} />
              <Route path="/approvals/vendors/:id" element={<VendorApprovalViewPage />} />
              <Route path="/approvals/purchase-requisitions" element={<PurchaseRequisitionApprovalPage />} />

              {/* Vendor Bank Details Routes */}
              <Route path="/vendor-bank-details" element={<VendorBankDetailsPage />} />
              <Route path="/vendor-bank-details/new" element={<VendorBankDetailsFormPage />} />
              <Route path="/vendor-bank-details/:vendorId" element={<VendorBankDetailsViewPage />} />
              <Route path="/vendor-bank-details/:vendorId/view" element={<VendorBankDetailsViewPage />} />
              <Route path="/vendor-bank-details/:vendorId/edit" element={<VendorBankDetailsFormPage />} />

              {/* Client Routes */}
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/clients/new" element={<ClientFormPage />} />
              <Route path="/clients/:id" element={<ClientEffectiveDatesPage />} />
              <Route path="/clients/:id/edit" element={<ClientEffectiveDatesPage />} />
              <Route path="/clients/:id/effective-dates" element={<ClientEffectiveDatesPage />} />

              {/* Company Registration Routes */}
              <Route path="/company-registration" element={<CompanyRegistrationPage />} />
              <Route path="/company-registration/new" element={<CompanyFormPage />} />
              <Route path="/company-registration/:id" element={<CompanyViewPage />} />
              <Route path="/company-registration/:id/edit" element={<CompanyFormPage />} />

              {/* Company Bank Details Routes */}
              <Route path="/company-bank-details" element={<CompanyBankDetailsPage />} />
              <Route path="/company-bank-details/new" element={<CompanyBankDetailsFormPage />} />
              <Route path="/company-bank-details/:companyId" element={<CompanyBankDetailsViewPage />} />
              <Route path="/company-bank-details/:companyId/view" element={<CompanyBankDetailsViewPage />} />
              <Route path="/company-bank-details/:companyId/edit" element={<CompanyBankDetailsFormPage />} />

              {/* Purchase Requisition Routes */}
              <Route path="/purchase-requisition" element={<PurchaseRequisition />} />
              <Route path="/purchase-requisition/dashboard" element={<PurchaseRequisitionDashboardPage />} />
              <Route path="/purchase-requisition/create" element={<PurchaseRequisitionCreate />} />
              <Route path="/purchase-requisition/:id" element={<PurchaseRequisitionView />} />
              <Route path="/purchase-requisition/:id/edit" element={<PurchaseRequisitionEdit />} />

              {/* Inquiry Routes */}
              <Route path="/inquiries" element={<InquiriesPage />} />
              <Route path="/inquiries/new" element={<InquiryFormPage />} />
              <Route path="/inquiries/:id" element={<InquiryViewPage />} />
              <Route path="/inquiries/:id/edit" element={<InquiryFormPage />} />

              {/* Configuration Routes */}
              <Route path="/configuration/series" element={<Navigate to="/configuration/series/po" replace />} />
              <Route path="/configuration/series/:docType" element={<SeriesSetupPage />} />
              <Route path="/configuration/document-types" element={<DocumentTypesPage />} />
              <Route path="/configuration/product-categories" element={<ProductCategoriesPage />} />
              <Route path="/configuration/uom" element={<UomPage />} />
              <Route path="/configuration/regions" element={<RegionsPage />} />
              <Route path="/configuration/payment-terms" element={<PaymentTermsPage />} />
              <Route path="/configuration/process-flows" element={<ProcessFlowsPage />} />
              <Route path="/configuration/process-flows/:flowId" element={<ProcessFlowEditorPage />} />
            </Route>

            {/* Default: redirect root to login */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </UserSessionsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
