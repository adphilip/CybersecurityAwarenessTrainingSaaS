import { useRouter } from 'next/router';
import { useState } from 'react';
import { submitQuiz } from '../../lib/api';

export default function QuizPage() {
  const router = useRouter();
  const { token } = router.query;
  const [status, setStatus] = useState('pending');

  const submit = async () => {
    if (!token) return;
    setStatus('submitting');
    try {
      await submitQuiz(String(token), { quiz_id: 'sample', employee_id: null, answers: [] });
      setStatus('done');
    } catch (e) {
      console.error('Failed to submit quiz:', e);
      setStatus('error');
    }
  };

  return (
    <main className="main">
      <div className="card">
        <h1>Micro-Quiz</h1>
        <p>Token: {token}</p>
        <button className="button" onClick={submit} disabled={status === 'submitting'}>
          Submit placeholder quiz
        </button>
        <p>Status: {status}</p>
      </div>
    </main>
  );
}
