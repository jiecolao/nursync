import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import DashboardPage from "./pages/Dashboard/DashboardPage"
import AuthLayout from "./pages/AuthLayout"
import MainLayout from "./pages/MainLayout"
import { RootLayout } from "./RootLayout"
import LoginPage from "./pages/Login/LoginPage"
import HelpPage from "./pages/Help/HelpPage"


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/help" element={<HelpPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}