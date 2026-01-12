import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

interface Question {
  id: string;
  question_text: string;
  options: string[];
}

interface Quiz {
  id: string;
  title: string;
  questions: Question[];
  token: string;
}

interface QuizResult {
  success: boolean;
  score: number;
  correct: number;
  total: number;
  results: Array<{
    questionId: string;
    isCorrect: boolean;
    correctAnswer: string;
  }>;
}

export default function QuizPage() {
  const router = useRouter();
  const { token } = router.query;
  
  const [status, setStatus] = useState<'loading' | 'ready' | 'submitting' | 'completed' | 'error'>('loading');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Load quiz on mount
  useEffect(() => {
    if (!token) return;
    
    const loadQuiz = async () => {
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';
        const response = await fetch(`${API_BASE}/quiz/${token}`);
        
        if (!response.ok) {
          throw new Error('Failed to load quiz');
        }
        
        const data = await response.json();
        setQuiz(data.quiz);
        setStatus('ready');
      } catch (err) {
        console.error('Failed to load quiz:', err);
        setErrorMessage('Failed to load quiz. Please try again.');
        setStatus('error');
      }
    };

    loadQuiz();
  }, [token]);

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSubmit = async () => {
    if (!token || !quiz) return;

    // Validate all questions answered
    const unanswered = quiz.questions.filter(q => !answers[q.id]);
    if (unanswered.length > 0) {
      setErrorMessage('Please answer all questions before submitting.');
      return;
    }

    setStatus('submitting');
    setErrorMessage('');

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';
      
      // Format answers for submission
      const formattedAnswers = quiz.questions.map(q => ({
        questionId: q.id,
        answer: answers[q.id]
      }));

      const response = await fetch(`${API_BASE}/quiz/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: formattedAnswers })
      });

      if (!response.ok) {
        throw new Error('Failed to submit quiz');
      }

      const data = await response.json();
      setResult(data);
      setStatus('completed');
    } catch (err) {
      console.error('Failed to submit quiz:', err);
      setErrorMessage('Failed to submit quiz. Please try again.');
      setStatus('ready');
    }
  };

  // Loading state
  if (status === 'loading') {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'linear-gradient(to bottom right, #1e293b, #334155)' }}>
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
          <p style={{ color: '#94a3b8' }}>Loading quiz...</p>
        </div>
      </main>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'linear-gradient(to bottom right, #1e293b, #334155)' }}>
        <div style={{ maxWidth: '500px', width: '100%' }}>
          <div style={{ 
            background: 'rgba(220, 38, 38, 0.1)', 
            padding: '2rem', 
            borderRadius: '12px',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            textAlign: 'center'
          }}>
            <h1 style={{ color: '#fca5a5', marginBottom: '1rem' }}>Error</h1>
            <p style={{ color: '#cbd5e1' }}>{errorMessage}</p>
          </div>
        </div>
      </main>
    );
  }

  // Results/Completed state
  if (status === 'completed' && result) {
    const passed = result.score >= 70;
    
    return (
      <main style={{ minHeight: '100vh', padding: '2rem', background: 'linear-gradient(to bottom right, #1e293b, #334155)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.05)', 
            padding: '2rem', 
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 1.5rem',
              background: passed ? 'rgba(34, 197, 94, 0.2)' : 'rgba(251, 146, 60, 0.2)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem'
            }}>
              {passed ? '✓' : '⚠'}
            </div>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: passed ? '#86efac' : '#fdba74' }}>
              {passed ? 'Great Job!' : 'Keep Learning!'}
            </h1>
            <p style={{ fontSize: '1.25rem', color: '#cbd5e1', marginBottom: '1rem' }}>
              You scored {result.score}%
            </p>
            <p style={{ color: '#94a3b8' }}>
              {result.correct} out of {result.total} questions correct
            </p>
          </div>

          <div style={{ 
            background: 'rgba(255, 255, 255, 0.05)', 
            padding: '2rem', 
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Review Your Answers</h2>
            {quiz && quiz.questions.map((question, idx) => {
              const questionResult = result.results.find(r => r.questionId === question.id);
              const userAnswer = answers[question.id];
              
              return (
                <div key={question.id} style={{ 
                  marginBottom: '1.5rem', 
                  padding: '1rem',
                  background: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '8px',
                  border: `2px solid ${questionResult?.isCorrect ? 'rgba(34, 197, 94, 0.3)' : 'rgba(251, 146, 60, 0.3)'}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <span style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: questionResult?.isCorrect ? 'rgba(34, 197, 94, 0.3)' : 'rgba(251, 146, 60, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.875rem'
                    }}>
                      {questionResult?.isCorrect ? '✓' : '✗'}
                    </span>
                    <p style={{ flex: 1, fontWeight: '500' }}>{question.question_text}</p>
                  </div>
                  <div style={{ marginLeft: '2.25rem' }}>
                    <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                      Your answer: <span style={{ color: questionResult?.isCorrect ? '#86efac' : '#fdba74' }}>{userAnswer}</span>
                    </p>
                    {!questionResult?.isCorrect && (
                      <p style={{ fontSize: '0.875rem', color: '#86efac' }}>
                        Correct answer: {questionResult?.correctAnswer}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
              Thank you for completing this cybersecurity awareness training.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // Quiz taking state
  const allAnswered = quiz ? quiz.questions.every(q => answers[q.id]) : false;

  return (
    <main style={{ minHeight: '100vh', padding: '2rem', background: 'linear-gradient(to bottom right, #1e293b, #334155)' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.05)', 
          padding: '2rem', 
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          marginBottom: '2rem',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
            {quiz?.title || 'Cybersecurity Quiz'}
          </h1>
          <p style={{ color: '#94a3b8' }}>
            Answer all {quiz?.questions.length || 0} questions to complete the training
          </p>
        </div>

        {/* Questions */}
        {quiz && quiz.questions.map((question, idx) => (
          <div key={question.id} style={{ 
            background: 'rgba(255, 255, 255, 0.05)', 
            padding: '2rem', 
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            marginBottom: '1.5rem'
          }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.125rem', color: '#e2e8f0' }}>
              Question {idx + 1}. {question.question_text}
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {question.options.map((option, optIdx) => {
                const optionLabels = ['A', 'B', 'C', 'D'];
                const optionLabel = optionLabels[optIdx];
                const isSelected = answers[question.id] === optionLabel;
                
                return (
                  <label
                    key={`${question.id}-${option}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '1rem',
                      background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                      border: `2px solid ${isSelected ? '#667eea' : 'rgba(255, 255, 255, 0.1)'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.2)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      }
                    }}
                  >
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value={optionLabel}
                      checked={isSelected}
                      onChange={() => handleAnswerChange(question.id, optionLabel)}
                      style={{ marginRight: '0.75rem' }}
                    />
                    <span style={{ fontWeight: '500', marginRight: '0.5rem' }}>{optionLabel}.</span>
                    <span>{option}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        {/* Error message */}
        {errorMessage && (
          <div style={{ 
            background: 'rgba(220, 38, 38, 0.1)', 
            padding: '1rem', 
            borderRadius: '8px',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            marginBottom: '1.5rem'
          }}>
            <p style={{ color: '#fca5a5', margin: 0 }}>{errorMessage}</p>
          </div>
        )}

        {/* Submit button */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={handleSubmit}
            disabled={status === 'submitting' || !allAnswered}
            style={{
              padding: '1rem 3rem',
              fontSize: '1.125rem',
              fontWeight: '600',
              background: allAnswered ? 'linear-gradient(to right, #667eea, #764ba2)' : 'rgba(100, 100, 100, 0.3)',
              color: allAnswered ? 'white' : '#666',
              border: 'none',
              borderRadius: '8px',
              cursor: allAnswered ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              opacity: status === 'submitting' ? 0.7 : 1
            }}
          >
            {status === 'submitting' ? 'Submitting...' : 'Submit Quiz'}
          </button>
          <p style={{ marginTop: '1rem', color: '#94a3b8', fontSize: '0.875rem' }}>
            {(() => {
              if (allAnswered) return 'Click submit when ready';
              const remaining = quiz ? quiz.questions.length - Object.keys(answers).length : 0;
              const plural = remaining === 1 ? '' : 's';
              return `Please answer ${remaining} more question${plural}`;
            })()}
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
