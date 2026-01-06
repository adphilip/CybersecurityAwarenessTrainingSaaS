import { useState, FormEvent } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../lib/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { setToken } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        setToken(data.token);
        setMessage('Logged in successfully! Redirecting...');
        setTimeout(() => router.push('/'), 800);
      } else {
        setError(data.error === 'invalid_credentials' ? 'Invalid email or password' : (data.error || 'Login failed'));
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ maxWidth: '400px', width: '100%' }}>
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.05)', 
          padding: '2rem', 
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <h1 style={{ marginBottom: '0.5rem', fontSize: '1.875rem', fontWeight: 'bold', textAlign: 'center' }}>
            Admin Login
          </h1>
          <p style={{ marginBottom: '2rem', color: '#9ca3af', textAlign: 'center' }}>
            Enter your email and password to log in
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                placeholder="admin@company.com"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '1rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  color: 'white',
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '1rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  color: 'white',
                  outline: 'none',
                }}
              />
            </div>

            {error && (
              <div style={{ 
                marginBottom: '1rem', 
                padding: '0.75rem', 
                background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '6px',
                color: '#fca5a5',
                fontSize: '0.875rem'
              }}>
                {error}
              </div>
            )}

            {message && (
              <div style={{ 
                marginBottom: '1rem', 
                padding: '0.75rem', 
                background: 'rgba(34, 197, 94, 0.1)', 
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '6px',
                color: '#86efac',
                fontSize: '0.875rem'
              }}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                fontWeight: '600',
                background: loading ? 'rgba(99, 102, 241, 0.5)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#9ca3af' }}>
            <p>Password login enabled. Magic link planned for later.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
