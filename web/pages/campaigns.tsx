import { useEffect, useState } from 'react';
import { listCampaigns, createCampaign, startCampaign, getReport } from '../lib/api';
import { withAuth } from '../lib/withAuth';
import AdminNav from '../components/AdminNav';

interface Campaign {
  id: string;
  company_id: string;
  month: string;
  status: string;
  phishing_template_id?: string;
  quiz_id?: string;
  started_at?: string;
  closed_at?: string;
}

function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [report, setReport] = useState<any>(null);
  
  // Form state
  const [companyId, setCompanyId] = useState('11111111-1111-1111-1111-111111111111');
  const [month, setMonth] = useState('2026-02-01');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await listCampaigns();
      setCampaigns(data);
    } catch (err) {
      setError('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    setError('');
    if (!companyId || !month) {
      setError('Company ID and month are required');
      return;
    }
    
    setLoading(true);
    try {
      await createCampaign({ company_id: companyId, month });
      await load();
      setShowCreateForm(false);
      setMonth('2026-02-01');
    } catch (err: any) {
      setError(err.message || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  const start = async (id: string) => {
    setLoading(true);
    try {
      await startCampaign(id);
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to start campaign');
    } finally {
      setLoading(false);
    }
  };

  const loadReport = async (id: string) => {
    setLoading(true);
    try {
      const data = await getReport(id);
      setReport(data);
      setSelectedCampaign(id);
    } catch (err: any) {
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return '#94a3b8';
      case 'active': return '#86efac';
      case 'closed': return '#fca5a5';
      default: return '#cbd5e1';
    }
  };

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
            <h1 style={{ marginBottom: '0.5rem' }}>Campaign Management</h1>
            <p style={{ color: '#94a3b8' }}>Create and manage phishing awareness campaigns</p>
          </div>
          <button
            className="button"
            onClick={() => setShowCreateForm(!showCreateForm)}
            style={{
              background: 'linear-gradient(to right, #667eea, #764ba2)',
              padding: '0.75rem 1.5rem'
            }}
          >
            {showCreateForm ? 'Cancel' : '+ New Campaign'}
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

        {showCreateForm && (
          <div className="card" style={{ marginBottom: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Create New Campaign</h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                  Company ID
                </label>
                <input
                  className="input"
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  placeholder="11111111-1111-1111-1111-111111111111"
                  disabled={loading}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                  Campaign Month
                </label>
                <input
                  className="input"
                  type="date"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  disabled={loading}
                />
              </div>
              <button
                className="button"
                onClick={create}
                disabled={loading}
                style={{ marginTop: '0.5rem' }}
              >
                {loading ? 'Creating...' : 'Create Campaign'}
              </button>
            </div>
          </div>
        )}

        {loading && campaigns.length === 0 ? (
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
            <p style={{ color: '#94a3b8' }}>Loading campaigns...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>No campaigns yet</p>
            <button
              className="button"
              onClick={() => setShowCreateForm(true)}
            >
              Create Your First Campaign
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="card"
                style={{
                  borderLeft: `4px solid ${getStatusColor(campaign.status)}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                      <h3 style={{ margin: 0 }}>Campaign - {new Date(campaign.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        background: `${getStatusColor(campaign.status)}33`,
                        color: getStatusColor(campaign.status)
                      }}>
                        {campaign.status}
                      </span>
                    </div>
                    <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '0.5rem 0' }}>
                      ID: {campaign.id}
                    </p>
                    {campaign.started_at && (
                      <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '0.25rem 0' }}>
                        Started: {new Date(campaign.started_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {campaign.status === 'scheduled' && (
                      <button
                        className="button"
                        onClick={() => start(campaign.id)}
                        disabled={loading}
                        style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#86efac' }}
                      >
                        Start
                      </button>
                    )}
                    <button
                      className="button"
                      onClick={() => loadReport(campaign.id)}
                      disabled={loading}
                    >
                      View Report
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {report && selectedCampaign && (
          <div className="card" style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Campaign Report</h2>
              <button
                className="button"
                onClick={() => { setReport(null); setSelectedCampaign(null); }}
                style={{ background: 'rgba(100, 100, 100, 0.2)' }}
              >
                Close
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '1rem', borderRadius: '8px' }}>
                <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '0 0 0.5rem 0' }}>Total Employees</p>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{report.totals?.employees || 0}</p>
              </div>
              <div style={{ background: 'rgba(251, 146, 60, 0.1)', padding: '1rem', borderRadius: '8px' }}>
                <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '0 0 0.5rem 0' }}>Email Opens</p>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{report.totals?.opens || 0}</p>
              </div>
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '8px' }}>
                <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '0 0 0.5rem 0' }}>Link Clicks</p>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{report.totals?.clicks || 0}</p>
              </div>
              <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '1rem', borderRadius: '8px' }}>
                <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '0 0 0.5rem 0' }}>Quiz Completions</p>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{report.totals?.quiz_attempts || 0}</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '0 0 0.5rem 0' }}>Open Rate</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {((report.kpis?.open_rate || 0) * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '0 0 0.5rem 0' }}>Click Rate</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {((report.kpis?.click_rate || 0) * 100).toFixed(1)}%
                </p>
              </div>
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

export default withAuth(Campaigns);
