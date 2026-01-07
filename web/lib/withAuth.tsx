import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './auth';

/**
 * Higher-order component that protects pages requiring authentication
 * Redirects to /auth/login if user is not authenticated
 */
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function ProtectedRoute(props: P) {
    const { token } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!token) {
        router.push('/auth/login');
      }
    }, [token, router]);

    // Show loading or nothing while checking auth
    if (!token) {
      return (
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              margin: '0 auto 1rem',
              border: '4px solid rgba(99, 102, 241, 0.3)',
              borderTop: '4px solid #667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{ color: '#9ca3af' }}>Checking authentication...</p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}
