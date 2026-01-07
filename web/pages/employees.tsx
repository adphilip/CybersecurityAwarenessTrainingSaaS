import { useEffect, useState } from 'react';
import { listEmployees } from '../lib/api';
import { withAuth } from '../lib/withAuth';

function Employees() {
  const [companyId, setCompanyId] = useState('11111111-1111-1111-1111-111111111111');
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listEmployees(companyId);
      setEmployees(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="main">
      <div className="card">
        <h1>Employees</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <input className="input" value={companyId} onChange={(e) => setCompanyId(e.target.value)} />
          <button className="button" onClick={load} disabled={loading}>Refresh</button>
        </div>
        <table className="table">
          <thead>
            <tr><th>Email</th><th>Active</th><th>Created</th></tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id}>
                <td>{e.email}</td>
                <td>{String(e.active)}</td>
                <td>{e.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

export default withAuth(Employees);
