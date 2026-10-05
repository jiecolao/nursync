import { Outlet } from "react-router-dom";


export default function AuthLayout(){
    return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '380px', background: '#fff', padding: '32px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0, textAlign: 'center' }}>Authentication Shell</h3>
        <Outlet />
      </div>
    </div>
  );
}