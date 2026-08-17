import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, ROLES } from '@/features/auth/context';
import RouteGuard from './RouteGuard';

import { PublicLayout, CustomerLayout, TherapistLayout, AdminLayout } from '@/app/layouts';

import HomePage from '@/features/public/pages/HomePage';
import ServicesPage from '@/features/public/pages/ServicesPage';
import ServiceDetailPage from '@/features/public/pages/ServiceDetailPage';
import CosmeticsPage from '@/features/public/pages/CosmeticsPage';
import CosmeticDetailPage from '@/features/public/pages/CosmeticDetailPage';
import TherapistsPage from '@/features/public/pages/TherapistsPage';
import LoginPage from '@/features/auth/pages/LoginPage';
import RegisterPage from '@/features/auth/pages/RegisterPage';

import CustomerDashboard from '@/features/customer/pages/Dashboard';
import CustomerAppointments from '@/features/customer/pages/Appointments';
import CustomerNewAppointment from '@/features/customer/pages/NewAppointment';
import CustomerEditAppointment from '@/features/customer/pages/EditAppointment';
import CustomerAppointmentDetail from '@/features/customer/pages/AppointmentDetail';
import CustomerProfile from '@/features/customer/pages/Profile';
import CustomerTransactions from '@/features/customer/pages/Transactions';

import TherapistDashboard from '@/features/therapist/pages/Dashboard';
import TherapistSchedule from '@/features/therapist/pages/Schedule';
import TherapistAppointmentDetail from '@/features/therapist/pages/AppointmentDetail';
import TherapistTreatment from '@/features/therapist/pages/Treatment';
import TherapistProfile from '@/features/therapist/pages/Profile';

import AdminDashboard from '@/features/admin/pages/Dashboard';
import AdminUsers from '@/features/admin/pages/Users';
import AdminCatalogServices from '@/features/admin/pages/CatalogServices';
import AdminCatalogRooms from '@/features/admin/pages/CatalogRooms';
import AdminCatalogCosmetics from '@/features/admin/pages/CatalogCosmetics';
import AdminInventory from '@/features/admin/pages/Inventory';
import AdminInvoices from '@/features/admin/pages/Invoices';
import AdminReports from '@/features/admin/pages/Reports';
import AdminProfile from '@/features/admin/pages/Profile';

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/services/:id" element={<ServiceDetailPage />} />
        <Route path="/cosmetics" element={<CosmeticsPage />} />
        <Route path="/cosmetics/:id" element={<CosmeticDetailPage />} />
        <Route path="/therapists" element={<TherapistsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Customer Routes */}
      <Route
        element={
          <RouteGuard allowedRoles={[ROLES.CUSTOMER]}>
            <CustomerLayout />
          </RouteGuard>
        }
      >
        <Route path="/customer" element={<CustomerDashboard />} />
        <Route path="/customer/appointments" element={<CustomerAppointments />} />
        <Route path="/customer/appointments/new" element={<CustomerNewAppointment />} />
        <Route path="/customer/appointments/:id" element={<CustomerAppointmentDetail />} />
        <Route path="/customer/appointments/:id/edit" element={<CustomerEditAppointment />} />
        <Route path="/customer/profile" element={<CustomerProfile />} />
        <Route path="/customer/transactions" element={<CustomerTransactions />} />
      </Route>

      {/* Therapist Routes */}
      <Route
        element={
          <RouteGuard allowedRoles={[ROLES.THERAPIST]}>
            <TherapistLayout />
          </RouteGuard>
        }
      >
        <Route path="/therapist" element={<TherapistDashboard />} />
        <Route path="/therapist/schedule" element={<TherapistSchedule />} />
        <Route path="/therapist/appointments/:id" element={<TherapistAppointmentDetail />} />
        <Route path="/therapist/treatments/:appointmentId" element={<TherapistTreatment />} />
        <Route path="/therapist/profile" element={<TherapistProfile />} />
      </Route>

      {/* Admin Routes */}
      <Route
        element={
          <RouteGuard allowedRoles={[ROLES.ADMIN]}>
            <AdminLayout />
          </RouteGuard>
        }
      >
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/catalog/services" element={<AdminCatalogServices />} />
        <Route path="/admin/catalog/rooms" element={<AdminCatalogRooms />} />
        <Route path="/admin/catalog/cosmetics" element={<AdminCatalogCosmetics />} />
        <Route path="/admin/inventory" element={<AdminInventory />} />
        <Route path="/admin/invoices" element={<AdminInvoices />} />
        <Route path="/admin/reports" element={<AdminReports />} />
        <Route path="/admin/profile" element={<AdminProfile />} />
      </Route>

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
