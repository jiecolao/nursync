import { Outlet } from "react-router-dom";

export function RootLayout() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
      <header style={{ padding: '12px 24px', background: '#111827', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>Global App Header (RootLayout)</strong>
        <span style={{ fontSize: '12px', color: '#9ca3af' }}>Persistent across Auth and App</span>
      </header>

      {/* Renders AuthLayout or MainLayout */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </div>

      <footer style={{ padding: '8px 24px', background: '#f3f4f6', borderTop: '1px solid #e5e7eb', textAlign: 'center', fontSize: '13px', color: '#6b7280' }}>
        App Footer &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}