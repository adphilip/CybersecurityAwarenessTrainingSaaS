import { useEffect, useState } from 'react';
import { listCampaigns, createCampaign } from '../lib/api';

export default function Campaigns() {
  const [companyId, setCompanyId] = useState('11111111-1111-1111-1111-111111111111');
  const [month, setMonth] = useState('2026-01-01');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const data = await listCampaigns();
    setCampaigns(data);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    setLoading(true);
    try {
      await createCampaign({ company_id: companyId, month });
      await load();
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="main">
      <div className="card">
        <h1>Campaigns</h1>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input className="input" value={companyId} onChange={(e) => setCompanyId(e.target.value)} />
          <input className="input" value={month} onChange={(e) => setMonth(e.target.value)} />
          <button className="button" onClick={create} disabled={loading}>Create</button>
        </div>
        {campaigns.map((c) => (
          <div key={c.id} className="card">
            <div><strong>ID:</strong> {c.id}</div>
            <div><strong>Month:</strong> {c.month}</div>
            <div><strong>Status:</strong> {c.status}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
