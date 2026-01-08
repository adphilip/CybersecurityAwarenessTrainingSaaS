import { useEffect, useState } from 'react';
import { health, listCampaigns, getReport, startCampaign } from '../lib/api';
import { withAuth } from '../lib/withAuth';
import AdminNav from '../components/AdminNav';

function Dashboard() {
  const [status, setStatus] = useState<string>('checking...');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    health().then((r) => setStatus(r.status)).catch(() => setStatus('down'));
    listCampaigns().then(setCampaigns).catch(() => setCampaigns([]));
  }, []);

  const loadReport = async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      const r = await getReport(selectedId);
      setReport(r);
    } finally {
      setLoading(false);
    }
  };

  const start = async (id: string) => {
    setLoading(true);
    try {
      await startCampaign(id);
      const refreshed = await listCampaigns();
      setCampaigns(refreshed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AdminNav />
      <main className="main">
        <div className="card">
          <h1>Admin Dashboard</h1>
          <p>API Status: <strong style={{ color: status === 'ok' ? '#86efac' : '#fca5a5' }}>{status}</strong></p>
        </div>

      <div className="card">
        <h2>Campaigns</h2>
        {campaigns.length === 0 && <p>No campaigns found.</p>}
        {campaigns.map((c) => (
          <div key={c.id} style={{ marginBottom: 12 }}>
            <div><strong>ID:</strong> {c.id}</div>
            <div><strong>Month:</strong> {c.month}</div>
            <div><strong>Status:</strong> {c.status}</div>
            <button className="button" onClick={() => start(c.id)} disabled={loading}>Start</button>
            <button className="button" style={{ marginLeft: 8 }} onClick={() => setSelectedId(c.id)}>
              Select for report
            </button>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Report</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" placeholder="Campaign ID" value={selectedId} onChange={(e) => setSelectedId(e.target.value)} />
          <button className="button" onClick={loadReport} disabled={loading || !selectedId}>Load</button>
        </div>
        {loading && <p>Loading...</p>}
        {report && (
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{JSON.stringify(report, null, 2)}</pre>
        )}
      </div>
      </main>
    </>
  );
}

export default withAuth(Dashboard);
