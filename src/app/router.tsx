import { Navigate, Route, Routes } from 'react-router-dom';
import { ROLES } from '../constants/roles';
import CounterLayout from '../layouts/CounterLayout';
import SubAdminLayout from '../layouts/SubAdminLayout';
import SuperAdminLayout from '../layouts/SuperAdminLayout';
import Login from '../pages/auth/Login';
import History from '../pages/counter/History';
import IssueTicket from '../pages/counter/IssueTicket';
import PrinterSettings from '../pages/counter/PrinterSettings';
import ShiftClose from '../pages/counter/ShiftClose';
import TicketDetail from '../pages/counter/TicketDetail';
import AuditLog from '../pages/superadmin/AuditLog';
import Categories from '../pages/superadmin/Categories';
import CounterEmployees from '../pages/superadmin/CounterEmployees';
import Dashboard from '../pages/superadmin/Dashboard';
import EventDetail from '../pages/superadmin/EventDetail';
import Events from '../pages/superadmin/Events';
import CountersReport from '../pages/superadmin/reports/Counters';
import GstReport from '../pages/superadmin/reports/Gst';
import ShiftsReport from '../pages/superadmin/reports/Shifts';
import TransactionsReport from '../pages/superadmin/reports/Transactions';
import Settings from '../pages/superadmin/Settings';
import SubAdmins from '../pages/superadmin/SubAdmins';
import TaxSettings from '../pages/superadmin/TaxSettings';
import { ProtectedRoute } from './ProtectedRoute';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/sa"
        element={
          <ProtectedRoute roles={[ROLES.SUPER_ADMIN]}>
            <SuperAdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="events" element={<Events />} />
        <Route path="events/:id" element={<EventDetail />} />
        <Route path="sub-admins" element={<SubAdmins />} />
        <Route path="counter-employees" element={<CounterEmployees />} />
        <Route path="categories" element={<Categories />} />
        <Route path="tax-settings" element={<TaxSettings />} />
        <Route path="reports/transactions" element={<TransactionsReport />} />
        <Route path="reports/counters" element={<CountersReport />} />
        <Route path="reports/gst" element={<GstReport />} />
        <Route path="reports/shifts" element={<ShiftsReport />} />
        <Route path="audit-log" element={<AuditLog />} />
        <Route path="settings" element={<Settings />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      <Route
        path="/sub"
        element={
          <ProtectedRoute roles={[ROLES.SUB_ADMIN]}>
            <SubAdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="events" element={<Events />} />
        <Route path="events/:id" element={<EventDetail />} />
        <Route path="counter-employees" element={<CounterEmployees />} />
        <Route path="categories" element={<Categories />} />
        <Route path="reports/counters" element={<CountersReport />} />
        <Route path="reports/gst" element={<GstReport />} />
        <Route path="reports/shifts" element={<ShiftsReport />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      <Route
        path="/counter"
        element={
          <ProtectedRoute roles={[ROLES.COUNTER_EMPLOYEE]}>
            <CounterLayout />
          </ProtectedRoute>
        }
      >
        <Route path="issue" element={<IssueTicket />} />
        <Route path="history" element={<History />} />
        <Route path="history/:id" element={<TicketDetail />} />
        <Route path="shift-close" element={<ShiftClose />} />
        <Route path="settings" element={<PrinterSettings />} />
        <Route index element={<Navigate to="issue" replace />} />
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
