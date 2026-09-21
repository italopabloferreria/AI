'use client';

import { useEffect, useState } from 'react';
import './crm.css';

type LeadRow = {
  lead: { id: string; name: string; company: string; email: string; whatsapp: string; initialProblem: string; status: string; createdAt: string };
  digitalCheck?: { status: string; score?: number; primaryOpportunity?: string };
};
type LeadDetail = LeadRow & { answers: { questionKey: string; answerJson: unknown }[]; recommendations: { id?: string; title: string; description: string }[] };
type LeadsResponse = { leads: LeadRow[]; error?: string };

const stages = [
  ['created', 'Novo'], ['qualified', 'Qualificado'], ['contacted', 'Contato'],
  ['proposal', 'Proposta'], ['won', 'Ganho'], ['lost', 'Perdido'],
] as const;

export default function CRMPage() {
  const [key, setKey] = useState('');
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [selected, setSelected] = useState<LeadDetail | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);

  async function loadLeads() {
    setLoading(true); setError('');
    try {
      const query = new URLSearchParams();
      if (search) query.set('search', search);
      if (status) query.set('status', status);
      const response = await fetch(`/api/crm/leads?${query}`, { headers: { 'x-crm-admin-key': key } });
      const data = (await response.json()) as LeadsResponse;
      if (!response.ok) throw new Error(data.error || 'Não foi possível carregar os leads.');
      setLeads(data.leads);
    } catch (err) { setError(err instanceof Error ? err.message : 'Erro ao carregar o CRM.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (key) void loadLeads(); }, [key, status]);

  async function openLead(id: string) {
    const response = await fetch(`/api/crm/leads/${id}`, { headers: { 'x-crm-admin-key': key } });
    const data = (await response.json()) as LeadDetail & { error?: string };
    if (!response.ok) { setError(data.error || 'Não foi possível abrir o lead.'); return; }
    setSelected(data);
  }

  async function moveLead(leadId: string, nextStatus: string) {
    const response = await fetch('/api/crm/leads', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-crm-admin-key': key },
      body: JSON.stringify({ leadId, status: nextStatus }),
    });
    if (response.ok) { await loadLeads(); if (selected?.lead.id === leadId) setSelected({ ...selected, lead: { ...selected.lead, status: nextStatus } }); }
    else { const data = (await response.json()) as { error?: string }; setError(data.error || 'Não foi possível atualizar o lead.'); }
  }

  if (!key) return (
    <main className="crm-login">
      <div className="crm-login-card">
        <span className="crm-kicker">!AI / CRM</span>
        <h1>Seu pipeline, sem perder contexto.</h1>
        <p>Use a chave padrão <b>admin123</b> no ambiente local. Depois, altere-a em Configurações.</p>
        <form onSubmit={(event) => { event.preventDefault(); setKey((event.currentTarget.elements.namedItem('key') as HTMLInputElement).value); }}>
          <input name="key" type="password" placeholder="Chave administrativa" autoComplete="current-password" required />
          <button className="crm-button" type="submit">Entrar</button>
        </form>
        {error && <p className="crm-error">{error}</p>}
      </div>
    </main>
  );

  return (
    <main className="crm-shell">
      <header className="crm-header"><div><span className="crm-kicker">!AI / CRM</span><h1>Pipeline comercial</h1></div><div className="crm-header-actions"><button className="crm-ghost" onClick={() => setSettingsOpen(true)}>Configurações</button><button className="crm-ghost" onClick={() => setKey('')}>Sair</button></div></header>
      <section className="crm-toolbar">
        <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void loadLeads()} placeholder="Buscar por nome, empresa ou e-mail" />
        <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todas as etapas</option>{stages.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <button className="crm-button" onClick={() => void loadLeads()}>Atualizar</button>
      </section>
      {error && <p className="crm-error">{error}</p>}
      <section className="crm-board">
        {stages.map(([stage, label]) => <div className="crm-column" key={stage}><div className="crm-column-title"><span>{label}</span><b>{leads.filter((item) => item.lead.status === stage).length}</b></div>
          {leads.filter((item) => item.lead.status === stage).map((item) => <article className="crm-card" key={item.lead.id} onClick={() => void openLead(item.lead.id)}><strong>{item.lead.company}</strong><span>{item.lead.name}</span><small>{item.digitalCheck?.score ? `Score ${item.digitalCheck.score}` : 'Digital Check pendente'}</small><select value={item.lead.status} onClick={(e) => e.stopPropagation()} onChange={(e) => void moveLead(item.lead.id, e.target.value)}>{stages.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></article>)}</div>)}
      </section>
      {loading && <p className="crm-muted">Carregando...</p>}
      {settingsOpen && <Settings keyValue={key} onClose={() => setSettingsOpen(false)} onChanged={(nextKey) => { setKey(nextKey); setSettingsOpen(false); }} />}
      {selected && <div className="crm-drawer-backdrop" onClick={() => setSelected(null)}><aside className="crm-drawer" onClick={(e) => e.stopPropagation()}><button className="crm-close" onClick={() => setSelected(null)}>Fechar ×</button><span className="crm-kicker">DETALHE DO LEAD</span><h2>{selected.lead.company}</h2><p><b>{selected.lead.name}</b><br />{selected.lead.email}<br />{selected.lead.whatsapp}</p><p>{selected.lead.initialProblem}</p>{selected.digitalCheck && <div className="crm-detail-box"><b>Digital Check</b><p>Status: {selected.digitalCheck.status}<br />Score: {selected.digitalCheck.score ?? '—'}<br />Foco: {selected.digitalCheck.primaryOpportunity ?? '—'}</p></div>}<h3>Recomendações</h3>{selected.recommendations?.length ? selected.recommendations.map((item) => <div className="crm-recommendation" key={item.id}><b>{item.title}</b><p>{item.description}</p></div>) : <p className="crm-muted">Nenhuma recomendação disponível.</p>}</aside></div>}
    </main>
  );
}

function Settings({ keyValue, onClose, onChanged }: { keyValue: string; onClose: () => void; onChanged: (key: string) => void }) {
  const [message, setMessage] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextKey = String(form.get('nextKey') || '');
    const response = await fetch('/api/crm/settings', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-crm-admin-key': keyValue },
      body: JSON.stringify({ currentKey: keyValue, nextKey }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) { setMessage(data.error || 'Não foi possível alterar a chave.'); return; }
    onChanged(nextKey);
  }
  return <div className="crm-drawer-backdrop" onClick={onClose}><aside className="crm-settings" onClick={(event) => event.stopPropagation()}><button className="crm-close" onClick={onClose}>Fechar ×</button><span className="crm-kicker">CONFIGURAÇÕES</span><h2>Acesso do CRM</h2><p>Altere a chave usada neste ambiente. Em produção, prefira Google OAuth com uma conta permitida.</p><form onSubmit={submit}><label>Nova chave<input name="nextKey" type="password" minLength={8} placeholder="Mínimo de 8 caracteres" required /></label><button className="crm-button" type="submit">Salvar chave</button></form>{message && <p className="crm-error">{message}</p>}</aside></div>;
}
