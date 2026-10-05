import { useLocation, Link, Outlet } from "react-router-dom";


export default function SideBar(){
    const location = useLocation();

    const navItemStyle = (path) => ({
        display: 'block',
        padding: '8px 12px',
        borderRadius: '4px',
        textDecoration: 'none',
        color: location.pathname === path ? '#2563eb' : '#374151',
        background: location.pathname === path ? '#eff6ff' : 'transparent',
        fontWeight: location.pathname === path ? '600' : '400',
        marginBottom: '4px'
    });

    return (
        <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar */}
        <aside style={{ width: '220px', borderRight: '1px solid #e5e7eb', padding: '16px', background: '#fafafa' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', textTransform: 'uppercase', color: '#6b7280' }}>Navigation</h4>
            <nav>
                <Link to="/dashboard" style={navItemStyle('/dashboard')}>Dashboard</Link>
                <Link to="/help" style={navItemStyle('/help')}>Help</Link>
                {/* <Link to="/settings" style={navItemStyle('/settings')}>Settings</Link> */}
            </nav>
            <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />
            <Link to="/login" style={{ color: '#dc2626', textDecoration: 'none', fontSize: '14px' }}>Sign Out</Link>
        </aside>

        {/* Nested Page Content */}
        <main style={{ flex: 1, padding: '24px' }}>
            <Outlet />
        </main>
        </div>
    );
}