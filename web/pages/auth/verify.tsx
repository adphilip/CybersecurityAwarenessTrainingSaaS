import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function Verify() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your magic link...');
  const router = useRouter();
  const { token } = router.query;

  useEffect(() => {
    if (!token) return;

    const verifyToken = async () => {
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';
        const response = await fetch(`${API_BASE}/auth/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok && data.token) {
          // Store JWT token
          localStorage.setItem('jwt_token', data.token);
          setStatus('success');
          setMessage('Login successful! Redirecting...');
          
          // Redirect to dashboard after 1 second
          setTimeout(() => {
            router.push('/');
          }, 1000);
        } else {
          setStatus('error');
          let errorMessage = 'Verification failed. Please try again.';
          if (data.error === 'token_expired') {
            errorMessage = 'This magic link has expired. Please request a new one.';
          } else if (data.error === 'token_already_used') {
            errorMessage = 'This magic link has already been used. Please request a new one.';
          } else if (data.error === 'invalid_token') {
            errorMessage = 'Invalid magic link. Please request a new one.';
          }
          setMessage(errorMessage);
        }
      } catch (err) {
        console.error('Verification error:', err);
        setStatus('error');
        setMessage('Network error. Please check your connection.');
      }
    };

    verifyToken();
  }, [token, router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ maxWidth: '500px', width: '100%', textAlign: 'center' }}>
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.05)', 
          padding: '3rem 2rem', 
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          {status === 'loading' && (
            <>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                margin: '0 auto 1.5rem',
                border: '4px solid rgba(99, 102, 241, 0.3)',
                borderTop: '4px solid #667eea',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                Verifying...
              </h1>
              <p style={{ color: '#9ca3af' }}>{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div style={{ 
                width: '64px', 
                height: '64px', 
                margin: '0 auto 1.5rem',
                background: 'rgba(34, 197, 94, 0.2)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem'
              }}>
                ✓
              </div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#86efac' }}>
                Success!
              </h1>
              <p style={{ color: '#9ca3af' }}>{message}</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div style={{ 
                width: '64px', 
                height: '64px', 
                margin: '0 auto 1.5rem',
                background: 'rgba(239, 68, 68, 0.2)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem'
              }}>
                ✕
              </div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#fca5a5' }}>
                Verification Failed
              </h1>
              <p style={{ color: '#9ca3af', marginBottom: '1.5rem' }}>{message}</p>
              <button
                onClick={() => router.push('/auth/login')}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Request New Link
              </button>
            </>
          )}
        </div>

        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
