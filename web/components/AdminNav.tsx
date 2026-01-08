import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';

export default function AdminNav() {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const isActive = (path: string) => router.pathname === path;

  return (
    <nav style={{
      background: 'rgba(255, 255, 255, 0.05)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      padding: '1rem 2rem',
      marginBottom: '2rem'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <Link href="/" style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: '#fff',
            textDecoration: 'none'
          }}>
            🔒 CSAT Admin
          </Link>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link href="/" style={{
              color: isActive('/') ? '#a5b4fc' : '#cbd5e1',
              textDecoration: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              background: isActive('/') ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
              transition: 'all 0.2s'
            }}>
              Dashboard
            </Link>
            
            <Link href="/employees" style={{
              color: isActive('/employees') ? '#a5b4fc' : '#cbd5e1',
              textDecoration: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              background: isActive('/employees') ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
              transition: 'all 0.2s'
            }}>
              Employees
            </Link>
            
            <Link href="/campaigns" style={{
              color: isActive('/campaigns') ? '#a5b4fc' : '#cbd5e1',
              textDecoration: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              background: isActive('/campaigns') ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
              transition: 'all 0.2s'
            }}>
              Campaigns
            </Link>
          </div>
        </div>

        <button
          onClick={handleLogout}
          style={{
            padding: '0.5rem 1rem',
            background: 'rgba(239, 68, 68, 0.2)',
            color: '#fca5a5',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '500',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
          }}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
