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
import { VendorsProvider } from './context/VendorsContext';

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
                <AppLayout />
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
        </Route>

        {/* Default: redirect root to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
