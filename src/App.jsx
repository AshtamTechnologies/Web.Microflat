import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AppLayout from './components/layout/AppLayout';
import UsersPage from './pages/users/UsersPage';
import { UsersProvider } from './context/UsersContext';
import VendorsPage from './pages/vendors/VendorsPage';
import VendorDashboardPage from './pages/vendors/VendorDashboardPage';
import VendorFormPage from './pages/vendors/VendorFormPage';
import VendorViewPage from './pages/vendors/VendorViewPage';
import VendorApprovalPage from './pages/approvals/VendorApprovalPage';
import { VendorsProvider } from './context/VendorsContext';

import PurchaseRequisition from './pages/PurchaseRequisition/PurchaseRequisition';
import PurchaseRequisitionCreate from './pages/PurchaseRequisition/PurchaseRequisitionCreate';
import PurchaseRequisitionView from './pages/PurchaseRequisition/PurchaseRequisitionView';
import PurchaseRequisitionEdit from './pages/PurchaseRequisition/PurchaseRequisitionEdit';
import { PurchaseRequisitionProvider } from './context/PurchaseRequisitionContext';

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
                  <AppLayout />
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
          <Route path="/vendors/:id" element={<VendorViewPage />} />
          <Route path="/vendors/:id/edit" element={<VendorFormPage />} />
          <Route path="/approvals/vendors" element={<VendorApprovalPage />} />

          {/* Purchase Requisition Routes */}
          <Route path="/purchase-requisition" element={<PurchaseRequisition />} />
          <Route path="/purchase-requisition/create" element={<PurchaseRequisitionCreate />} />
          <Route path="/purchase-requisition/:id" element={<PurchaseRequisitionView />} />
          <Route path="/purchase-requisition/:id/edit" element={<PurchaseRequisitionEdit />} />
        </Route>

        {/* Default: redirect root to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
