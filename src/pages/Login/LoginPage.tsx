import { Link } from "react-router-dom";


export default function LoginPage(){
    return (
        <div>
            <p style={{ margin: '0 0 16px 0', color: '#4b5563' }}>Sign in to continue.</p>
            <Link to="/dashboard" style={{ display: 'block', textAlign: 'center', background: '#2563eb', color: '#fff', padding: '8px 16px', borderRadius: '4px', textDecoration: 'none' }}>
                Log In (Go to Dashboard)
            </Link>
            <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '14px' }}>
                <Link to="/register">Create an account</Link>
            </div>
        </div>
  );
}