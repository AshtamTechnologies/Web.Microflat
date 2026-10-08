import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AppLayout from './components/layout/AppLayout';
import UsersPage from './pages/users/UsersPage';
import { UsersProvider } from './context/UsersContext';
import VendorsPage from './pages/vendors/VendorsPage';
import VendorDashboardPage from './pages/vendors/VendorDashboardPage';
import VendorFormPage from './pages/vendors/VendorFormPage';
import VendorApprovalPage from './pages/approvals/VendorApprovalPage';
import PurchaseRequisitionApprovalPage from './pages/approvals/PurchaseRequisitionApprovalPage';
import VendorEffectiveDatesPage from './pages/vendors/VendorEffectiveDatesPage';
import { VendorsProvider } from './context/VendorsContext';

import PurchaseRequisition from './pages/PurchaseRequisition/PurchaseRequisition';
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage initialMode="login" />} />
        <Route path="/forgot-password" element={<LoginPage initialMode="forgot-password" />} />
        <Route path="/reset-password" element={<LoginPage initialMode="force-reset" />} />

        {/* Authenticated routes — wrapped in AppLayout and Context Providers */}
        <Route
          element={
            <UsersProvider>
              <VendorsProvider>
                <PurchaseRequisitionProvider>
                  <InquiriesProvider>
                    <InquiryDocumentsProvider>
                      <DocumentTypesProvider>
                        <ProductCategoriesProvider>
                          <SeriesProvider>
                            <AppLayout />
                          </SeriesProvider>
                        </ProductCategoriesProvider>
                      </DocumentTypesProvider>
                    </InquiryDocumentsProvider>
                  </InquiriesProvider>
                </PurchaseRequisitionProvider>
              </VendorsProvider>
            </UsersProvider>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/vendors" element={<VendorsPage />} />
          <Route path="/vendors/dashboard" element={<VendorDashboardPage />} />
          <Route path="/vendors/new" element={<VendorFormPage />} />
          <Route path="/vendors/:id" element={<VendorEffectiveDatesPage />} />
          <Route path="/vendors/:id/edit" element={<VendorFormPage />} />
          <Route path="/vendors/:id/effective-dates" element={<VendorEffectiveDatesPage />} />
          <Route path="/approvals/vendors" element={<VendorApprovalPage />} />
          <Route path="/approvals/purchase-requisitions" element={<PurchaseRequisitionApprovalPage />} />

          {/* Purchase Requisition Routes */}
          <Route path="/purchase-requisition" element={<PurchaseRequisition />} />
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
        </Route>

        {/* Default: redirect root to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
