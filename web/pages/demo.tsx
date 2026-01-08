import { useState } from 'react';
import { useRouter } from 'next/router';

export default function DemoPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const startQuiz = async () => {
    setLoading(true);
    setError('');

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';
      const response = await fetch(`${API_BASE}/generate-quiz-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error('Failed to generate quiz token');
      }

      const data = await response.json();
      
      // Redirect to quiz
      router.push(`/quiz/${data.token}`);
    } catch (err) {
      console.error('Failed to start quiz:', err);
      setError('Failed to start quiz. Please try again.');
      setLoading(false);
    }
  };

  return (
    <main style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '2rem',
      background: 'linear-gradient(to bottom right, #1e293b, #334155)'
    }}>
      <div style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}>
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.05)', 
          padding: '3rem 2rem', 
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 2rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem'
          }}>
            🔒
          </div>
          
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', fontWeight: 'bold' }}>
            Cybersecurity Awareness Training
          </h1>
          
          <p style={{ color: '#cbd5e1', fontSize: '1.125rem', marginBottom: '2rem', lineHeight: '1.6' }}>
            Test your knowledge of cybersecurity best practices with our interactive quiz. 
            Learn to identify threats and protect yourself online.
          </p>

          <div style={{ 
            background: 'rgba(99, 102, 241, 0.1)', 
            padding: '1.5rem', 
            borderRadius: '8px',
            marginBottom: '2rem',
            border: '1px solid rgba(99, 102, 241, 0.2)'
          }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#a5b4fc' }}>
              What you'll learn:
            </h3>
            <ul style={{ 
              textAlign: 'left', 
              color: '#cbd5e1', 
              listStyle: 'none', 
              padding: 0,
              margin: 0
            }}>
              <li style={{ marginBottom: '0.5rem', paddingLeft: '1.5rem', position: 'relative' }}>
                <span style={{ position: 'absolute', left: 0 }}>✓</span>
                Identifying phishing attempts
              </li>
              <li style={{ marginBottom: '0.5rem', paddingLeft: '1.5rem', position: 'relative' }}>
                <span style={{ position: 'absolute', left: 0 }}>✓</span>
                Creating strong passwords
              </li>
              <li style={{ marginBottom: '0.5rem', paddingLeft: '1.5rem', position: 'relative' }}>
                <span style={{ position: 'absolute', left: 0 }}>✓</span>
                Responding to security threats
              </li>
            </ul>
          </div>

          {error && (
            <div style={{ 
              background: 'rgba(220, 38, 38, 0.1)', 
              padding: '1rem', 
              borderRadius: '8px',
              border: '1px solid rgba(220, 38, 38, 0.3)',
              marginBottom: '1.5rem'
            }}>
              <p style={{ color: '#fca5a5', margin: 0 }}>{error}</p>
            </div>
          )}

          <button
            onClick={startQuiz}
            disabled={loading}
            style={{
              width: '100%',
              padding: '1rem 2rem',
              fontSize: '1.125rem',
              fontWeight: '600',
              background: 'linear-gradient(to right, #667eea, #764ba2)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Starting Quiz...' : 'Start Quiz'}
          </button>

          <p style={{ marginTop: '1.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>
            Takes approximately 2-3 minutes to complete
          </p>
        </div>
      </div>
    </main>
  );
}
