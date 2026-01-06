const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {})
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function health() {
  return api<{ status: string; app: string }>('/');
}

export async function listCampaigns() {
  return api<any[]>('/campaigns');
}

export async function listEmployees(companyId?: string) {
  const q = companyId ? `?company_id=${companyId}` : '';
  return api<any[]>(`/employees${q}`);
}

export async function createCampaign(payload: any) {
  return api('/campaigns', { method: 'POST', body: JSON.stringify(payload) });
}

export async function startCampaign(id: string) {
  return api(`/campaigns/${id}/start`, { method: 'POST' });
}

export async function getReport(id: string) {
  return api(`/reports/campaign/${id}`);
}

export async function submitQuiz(token: string, payload: any) {
  return api(`/quiz/${token}/submit`, { method: 'POST', body: JSON.stringify(payload) });
}
