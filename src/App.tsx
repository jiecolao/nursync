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
import StudentRecordsPage from "./pages/StudentRecords/StudentPage"
import UsersPage from "./pages/UserManagement/UsersPage"
import ProfilePage from "./pages/Profile/ProfilePage"
import HelpPage from "./pages/Help/HelpPage"
import NotFoundPage from "./pages/Error/NotFoundPage"
import TestPage from "./pages/TestPage"
import FileLogsPage from "./pages/HistoryLogs/FileLogsPage"
import ActivityLogsPage from "./pages/HistoryLogs/ActivityLogsPage"
import TrashPage from "./pages/StudentRecords/TrashPage"
import DirectoryPage from "./pages/StudentRecords/DirectoryPage"

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
            <Route path="directory" element={<DirectoryPage />} />
            <Route path="students" element={<StudentRecordsPage />} />
            <Route path="trash" element={<TrashPage />} />

            {/* Administration */}
            <Route path="system-users" element={<UsersPage />} />
            <Route path="file-logs" element={<FileLogsPage />} />
            <Route path="activity-logs" element={<ActivityLogsPage/>} />

            {/* Support & Settings*/}            
            <Route path="my-account" element={<ProfilePage/>} />
            <Route path="help" element={<HelpPage />} />
            <Route path="t" element={<TestPage />} />
          </Route>

          {/* 404 Catch-All */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}