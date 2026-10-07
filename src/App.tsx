import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"

// Layouts & Guards
import { RootLayout } from "./RootLayout"
import AuthLayout from "./pages/AuthLayout"
import MainLayout from "./pages/MainLayout"
// import ProtectedRoute from "./components/ProtectedRoute" // Auth guard wrapper

// Auth Pages
import LoginPage from "./pages/Login/LoginPage"
import ForgotPasswordPage from "./pages/Login/ForgotPasswordPage"
import OtpPage from "./pages/Login/OtpPage"
import ResetPasswordPage from "./pages/Login/ResetPasswordPage"

// Main App Pages
import DashboardPage from "./pages/Dashboard/DashboardPage"
import StudentRecordsPage from "./pages/StudentRecords/StudentRecordsPage"
import RecentlyDeletedPage from "./pages/StudentRecords/RecentlyDeletedPage"
import UsersPage from "./pages/UserManagement/UsersPage"
import AddUserPage from "./pages/UserManagement/AddUserPage"
import HistoryLogsPage from "./pages/HistoryLogs/HistoryLogsPage"
import ProfilePage from "./pages/Profile/ProfilePage"
import HelpPage from "./pages/Help/HelpPage"
import ChangePassPage from "./pages/UserManagement/ChangePassPage"
import NotFoundPage from "./pages/Error/NotFoundPage"
import AddRecordPage from "./pages/StudentRecords/AddRecordPage"
import PlacementsPage from "./pages/PlacementsPage"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          {/* Default entry point */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Public Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route path="login" element={<LoginPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="otp" element={<OtpPage />} />
            <Route path="reset-password" element={<ResetPasswordPage />} />
          </Route>

          {/* Protected Application Routes */}
          <Route
            element={
              // <ProtectedRoute>
              <MainLayout />
              // </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<DashboardPage />} />

            {/* Student Records Group */}
            <Route path="students">
              <Route index element={<StudentRecordsPage />} />
              <Route path="create" element={<AddRecordPage />} />
              <Route path="recently-deleted" element={<RecentlyDeletedPage />} />
            </Route>

            {/* User Management Group */}
            <Route path="users">
              <Route index element={<UsersPage />} />
              <Route path="create" element={<AddUserPage />} />
            </Route>

            {/* Profile Group */}
            <Route path="profile">
              <Route index element={<ProfilePage />} />
              <Route path="change-password" element={<ChangePassPage />} />
            </Route>

            <Route path="logs" element={<HistoryLogsPage />} />
            <Route path="help" element={<HelpPage />} />
            <Route path="t" element={<PlacementsPage />} />
          </Route>

          {/* 404 Catch-All */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}