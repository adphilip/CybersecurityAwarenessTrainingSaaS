import { useEffect, useState } from 'react';
import { listEmployees, importEmployees, deactivateEmployee, listCompanies } from '../lib/api';
import { withAuth } from '../lib/withAuth';
import AdminNav from '../components/AdminNav';

interface Employee {
  id: string;
  email: string;
  active: boolean;
  created_at: string;
}

interface Company {
  id: string;
  name: string;
}

function Employees() {
  const [companyId, setCompanyId] = useState('11111111-1111-1111-1111-111111111111');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await listEmployees(companyId);
      setEmployees(data);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    try {
      const data = await listCompanies();
      setCompanies(data);
      if (data.length > 0 && !companyId) {
        setCompanyId(data[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load companies:', err);
    }
  };

  const handleImport = async () => {
    if (!companyId) {
      setError('Please select a company');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const result = await importEmployees(companyId, csvText);
      
      if (result.imported === 0 && result.skipped > 0) {
        setSuccess(`No new employees imported. ${result.skipped} employee(s) already exist.`);
      } else if (result.imported > 0 && result.skipped > 0) {
        setSuccess(`Successfully imported ${result.imported} employee(s). ${result.skipped} already existed.`);
      } else {
        setSuccess(`Successfully imported ${result.imported} employee(s)`);
      }
      
      setCsvText('');
      setShowImport(false);
      await load();
    } catch (err: any) {
      let errorMsg = err.message || 'Failed to import employees';
      
      // Parse specific error messages
      if (errorMsg.includes('foreign key constraint')) {
        errorMsg = 'Selected company does not exist. Please select a valid company from the dropdown.';
      } else if (errorMsg.includes('uuid')) {
        errorMsg = 'Invalid company ID format. Please select a company from the dropdown.';
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this employee?')) {
      return;
    }

    setLoading(true);
    try {
      await deactivateEmployee(id);
      setSuccess('Employee deactivated');
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate employee');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (companyId) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const activeEmployees = employees.filter(e => e.active);
  const inactiveEmployees = employees.filter(e => !e.active);

  return (
    <>
      <AdminNav />
      <main className="main">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '2rem' 
        }}>
          <div>
            <h1 style={{ marginBottom: '0.5rem' }}>Employee Management</h1>
            <p style={{ color: '#94a3b8' }}>
              {activeEmployees.length} active employees
              {inactiveEmployees.length > 0 && ` • ${inactiveEmployees.length} inactive`}
            </p>
          </div>
          <button
            className="button"
            onClick={() => setShowImport(!showImport)}
            style={{
              background: 'linear-gradient(to right, #667eea, #764ba2)',
              padding: '0.75rem 1.5rem'
            }}
          >
            {showImport ? 'Cancel' : '+ Import CSV'}
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(220, 38, 38, 0.1)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem'
          }}>
            <p style={{ color: '#fca5a5', margin: 0 }}>{error}</p>
          </div>
        )}

        {success && (
          <div style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem'
          }}>
            <p style={{ color: '#86efac', margin: 0 }}>{success}</p>
          </div>
        )}

        {showImport && (
          <div className="card" style={{ marginBottom: '2rem' }}>
            <h2 style={{ marginBottom: '1rem' }}>Import Employees from CSV</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Paste CSV data with email column. Example:
            </p>
            <pre style={{ 
              background: 'rgba(0, 0, 0, 0.3)', 
              padding: '0.75rem', 
              borderRadius: '6px',
              fontSize: '0.875rem',
              marginBottom: '1rem',
              overflow: 'auto'
            }}>
{`email
john@company.com
jane@company.com`}
            </pre>
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="company-select" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Company
              </label>
              <select
                id="company-select"
                className="input"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                disabled={loading || companies.length === 0}
                style={{ marginBottom: '0.5rem' }}
              >
                {companies.length === 0 && (
                  <option value="">Loading companies...</option>
                )}
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '1rem' }}>
                Select the company to import employees for
              </p>
            </div>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Paste CSV data here..."
              rows={8}
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                color: 'white',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                resize: 'vertical'
              }}
            />
            <button
              className="button"
              onClick={handleImport}
              disabled={loading || !csvText.trim()}
              style={{ marginTop: '1rem' }}
            >
              {loading ? 'Importing...' : 'Import Employees'}
            </button>
          </div>
        )}

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0 }}>Active Employees ({activeEmployees.length})</h2>
            <button
              className="button"
              onClick={load}
              disabled={loading}
              style={{ background: 'rgba(100, 100, 100, 0.2)' }}
            >
              Refresh
            </button>
          </div>

          {loading && employees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                margin: '0 auto 1rem',
                border: '4px solid rgba(99, 102, 241, 0.3)',
                borderTop: '4px solid #667eea',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <p style={{ color: '#94a3b8' }}>Loading employees...</p>
            </div>
          ) : activeEmployees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>No active employees</p>
              <button
                className="button"
                onClick={() => setShowImport(true)}
              >
                Import Employees
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: '#94a3b8', fontSize: '0.875rem', fontWeight: '500' }}>
                      Email
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: '#94a3b8', fontSize: '0.875rem', fontWeight: '500' }}>
                      Status
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: '#94a3b8', fontSize: '0.875rem', fontWeight: '500' }}>
                      Joined
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', color: '#94a3b8', fontSize: '0.875rem', fontWeight: '500' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activeEmployees.map((employee) => (
                    <tr key={employee.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #667eea, #764ba2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.875rem',
                            fontWeight: 'bold'
                          }}>
                            {employee.email.charAt(0).toUpperCase()}
                          </div>
                          <span>{employee.email}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: 'rgba(34, 197, 94, 0.2)',
                          color: '#86efac'
                        }}>
                          ACTIVE
                        </span>
                      </td>
                      <td style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                        {new Date(employee.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <button
                          className="button"
                          onClick={() => handleDeactivate(employee.id)}
                          disabled={loading}
                          style={{ 
                            background: 'rgba(239, 68, 68, 0.2)', 
                            color: '#fca5a5',
                            fontSize: '0.875rem',
                            padding: '0.5rem 1rem'
                          }}
                        >
                          Deactivate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {inactiveEmployees.length > 0 && (
          <div className="card" style={{ marginTop: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Inactive Employees ({inactiveEmployees.length})</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: '#94a3b8', fontSize: '0.875rem', fontWeight: '500' }}>
                      Email
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: '#94a3b8', fontSize: '0.875rem', fontWeight: '500' }}>
                      Status
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: '#94a3b8', fontSize: '0.875rem', fontWeight: '500' }}>
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {inactiveEmployees.map((employee) => (
                    <tr key={employee.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', opacity: 0.6 }}>
                      <td style={{ padding: '1rem' }}>{employee.email}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: 'rgba(100, 100, 100, 0.2)',
                          color: '#94a3b8'
                        }}>
                          INACTIVE
                        </span>
                      </td>
                      <td style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                        {new Date(employee.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

export default withAuth(Employees);
