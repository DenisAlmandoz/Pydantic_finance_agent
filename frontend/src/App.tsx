import { FormEvent, useEffect, useState } from 'react'
import {
  Activity, ArrowDownRight, ArrowUpRight, BarChart3, Bot, ChevronDown,
  CircleHelp, Command, Download, LayoutDashboard, LoaderCircle, Menu,
  MessageSquare, MoreHorizontal, Plus, Search, Send, Settings2, ShieldCheck,
  Sparkles, WalletCards, X,
} from 'lucide-react'
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'

type Metric = { label: string; value: number; change: number; format: 'currency' | 'percent' | 'number' }
type Period = { month: string; revenue: number; expenses: number; net_income: number }
type Dashboard = { metrics: Metric[]; monthly: Period[]; synthetic: boolean }
type ChatTurn = { role: 'assistant' | 'user'; text: string }

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const SESSION_ID = window.localStorage.getItem('ledgerline-session') ?? crypto.randomUUID()
window.localStorage.setItem('ledgerline-session', SESSION_ID)

function currency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

function formatMetric(metric: Metric) {
  if (metric.format === 'currency') return currency(metric.value)
  if (metric.format === 'percent') return `${metric.value.toFixed(1)}%`
  return metric.value.toLocaleString()
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('ledgerline-token') ?? 'demo-analyst-token')
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [apiState, setApiState] = useState<'loading' | 'online' | 'offline'>('loading')
  const [chatOpen, setChatOpen] = useState(true)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [sending, setSending] = useState(false)
  const [turns, setTurns] = useState<ChatTurn[]>([
    { role: 'assistant', text: 'Good morning. I have the synthetic finance pack ready. Ask me to compare periods, calculate a variance, or summarize a metric.' },
  ])

  useEffect(() => {
    localStorage.setItem('ledgerline-token', token)
    let alive = true
    fetch(`${API}/api/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => {
        if (!response.ok) throw new Error('API unavailable')
        return response.json() as Promise<Dashboard>
      })
      .then((data) => { if (alive) { setDashboard(data); setApiState('online') } })
      .catch(() => { if (alive) setApiState('offline') })
    return () => { alive = false }
  }, [token])

  async function sendMessage(event: FormEvent) {
    event.preventDefault()
    const question = prompt.trim()
    if (!question || sending) return
    setPrompt('')
    setTurns((current) => [...current, { role: 'user', text: question }])
    setSending(true)
    try {
      const response = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: question, session_id: SESSION_ID }),
      })
      if (!response.ok) throw new Error(response.status === 403 ? 'This role can view the dashboard but cannot use the analyst assistant.' : 'The assistant could not reach the API.')
      const result = await response.json() as { answer: string; mode: string }
      setTurns((current) => [...current, { role: 'assistant', text: result.answer }])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request failed.'
      setTurns((current) => [...current, { role: 'assistant', text: `${message} Start the API with: uv run uvicorn app.main:app --reload --app-dir backend.` }])
    } finally {
      setSending(false)
    }
  }

  const latest = dashboard?.monthly[dashboard.monthly.length - 1]
  const previous = dashboard?.monthly[dashboard.monthly.length - 2]
  const chartData = dashboard?.monthly.map((period) => ({
    month: new Date(`${period.month}-01`).toLocaleDateString('en-US', { month: 'short' }),
    Revenue: period.revenue,
    Expenses: period.expenses,
  })) ?? []

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
        <div className="brand"><span className="brand-mark"><Activity size={19} strokeWidth={2.4} /></span><span>ledgerline</span><button className="icon-button mobile-close" aria-label="Close menu" onClick={() => setMobileMenu(false)}><X size={18} /></button></div>
        <div className="workspace-switch"><span className="workspace-avatar">N</span><span className="workspace-copy"><strong>Northstar Capital</strong><small>Finance workspace</small></span><ChevronDown size={15} /></div>
        <div className="nav-label">WORKSPACE</div>
        <nav className="main-nav">
          <button className="nav-item active"><LayoutDashboard size={17} />Overview</button>
          <button className="nav-item" onClick={() => setChatOpen(true)}><MessageSquare size={17} />Analyst assistant<span className="nav-dot" /></button>
          <button className="nav-item"><BarChart3 size={17} />Reports</button>
          <button className="nav-item"><WalletCards size={17} />Transactions</button>
        </nav>
        <div className="nav-label recent-label">RECENT ANALYSIS <button className="icon-button" aria-label="New analysis"><Plus size={15} /></button></div>
        <div className="recent-list"><button>October performance review</button><button>Operating margin trend</button><button>Quarterly revenue variance</button></div>
        <div className="sidebar-bottom">
          <div className="data-status"><span className="status-dot" /><div><strong>Synthetic data</strong><small>Demo workspace</small></div><ShieldCheck size={16} /></div>
          <button className="profile-row"><span className="profile-avatar">JD</span><span><strong>Jordan Davis</strong><small>Finance analyst</small></span><MoreHorizontal size={18} /></button>
        </div>
      </aside>
      {mobileMenu && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileMenu(false)} />}

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu-button" aria-label="Open menu" onClick={() => setMobileMenu(true)}><Menu size={19} /></button>
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>Overview</strong></div>
          <div className="topbar-actions"><div className="search-box"><Search size={15} /><span>Search anything</span><kbd><Command size={11} /> K</kbd></div><button className="icon-button help-button" aria-label="Help"><CircleHelp size={18} /></button><div className="role-select"><ShieldCheck size={14} /><select aria-label="Demo user role" value={token} onChange={(event) => setToken(event.target.value)}><option value="demo-admin-token">Admin</option><option value="demo-analyst-token">Analyst</option><option value="demo-viewer-token">Viewer</option></select><ChevronDown size={12} /></div></div>
        </header>

        <div className="content-wrap">
          <section className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" />FINANCE INTELLIGENCE <span className="date-range">JAN — DEC 2026</span></div><h1>Overview<span className="heading-period">.</span></h1><p>A clear view of performance, cash flow, and what needs attention.</p></div><div className="heading-actions"><button className="button-secondary"><Download size={15} />Export</button><button className="button-primary" onClick={() => setChatOpen(true)}><Sparkles size={15} />Ask Ledgerline</button></div></section>

          <div className="synthetic-banner"><span className="banner-icon"><ShieldCheck size={16} /></span><span><strong>Synthetic dataset</strong> &nbsp;All figures are generated for demonstration and do not represent real company financials.</span><button aria-label="Dismiss synthetic data notice" onClick={(event) => event.currentTarget.parentElement?.remove()}><X size={15} /></button></div>

          <section className="metric-grid" aria-label="Key metrics">
            {dashboard?.metrics.map((metric, index) => <article className={`metric-panel metric-${index + 1}`} key={metric.label}><div className="metric-top"><span>{metric.label}</span><button className="icon-button metric-menu" aria-label={`${metric.label} options`}><MoreHorizontal size={17} /></button></div><div className="metric-value">{formatMetric(metric)}</div><div className="metric-foot"><span className={`change-pill ${metric.change < 0 ? 'change-down' : ''}`}>{metric.change < 0 ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />}{Math.abs(metric.change).toFixed(1)}{metric.format === 'percent' || metric.format === 'currency' ? '%' : ''}</span><span>vs. prior period</span></div><span className="metric-index">0{index + 1}</span></article>) ?? <div className="loading-metrics">{apiState === 'offline' ? 'API unavailable. Start the backend to load demo metrics.' : 'Loading synthetic finance data…'}</div>}
          </section>

          <section className="analysis-grid">
            <article className="panel chart-panel"><div className="panel-header"><div><div className="panel-kicker">PERFORMANCE</div><h2>Revenue & expenses</h2></div><div className="chart-actions"><button className="chart-filter selected">12 months</button><button className="icon-button" aria-label="Chart options"><MoreHorizontal size={18} /></button></div></div><div className="chart-legend"><span><i className="legend-swatch revenue-swatch" />Revenue</span><span><i className="legend-swatch expense-swatch" />Expenses</span><span className="chart-units">USD · monthly</span></div><div className="chart-area">{chartData.length > 0 ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 8, right: 8, left: 2, bottom: 0 }}><defs><linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#168b75" stopOpacity={0.19} /><stop offset="95%" stopColor="#168b75" stopOpacity={0} /></linearGradient><linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d2a153" stopOpacity={0.11} /><stop offset="95%" stopColor="#d2a153" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#e8ebe6" strokeDasharray="3 5" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#89918a', fontSize: 11, fontFamily: 'DM Mono' }} dy={10} /><YAxis axisLine={false} tickLine={false} tickFormatter={(value: number) => `$${value / 1000}k`} tick={{ fill: '#89918a', fontSize: 10, fontFamily: 'DM Mono' }} width={47} /><Tooltip formatter={(value) => currency(Number(value))} contentStyle={{ border: '1px solid #e6e9e4', borderRadius: 5, fontFamily: 'DM Sans', fontSize: 12 }} /><Area type="monotone" dataKey="Revenue" stroke="#14856f" strokeWidth={2.4} fill="url(#revenueFill)" activeDot={{ r: 4, fill: '#14856f', stroke: '#fff', strokeWidth: 2 }} /><Area type="monotone" dataKey="Expenses" stroke="#d2a153" strokeWidth={1.8} fill="url(#expenseFill)" activeDot={{ r: 3, fill: '#d2a153', stroke: '#fff', strokeWidth: 2 }} /></AreaChart></ResponsiveContainer> : <div className="chart-empty">Connect to the API to load synthetic monthly data.</div>}</div><div className="chart-summary"><span><i className="summary-bar" />{latest ? currency(latest.revenue) : '—'} <small>latest revenue</small></span><span><i className="summary-bar expense-bar" />{latest ? currency(latest.expenses) : '—'} <small>latest expenses</small></span><span className="chart-period">{previous?.month} → {latest?.month}</span></div></article>

            <article className="panel insight-panel"><div className="panel-header"><div><div className="panel-kicker">ASSISTED ANALYSIS</div><h2>Signals to watch</h2></div><span className="sparkle-badge"><Sparkles size={15} /></span></div><div className="signal-list"><div className="signal-item"><span className="signal-index">01</span><div><strong>Revenue momentum</strong><p>{latest && previous ? `Revenue moved ${(((latest.revenue - previous.revenue) / previous.revenue) * 100).toFixed(1)}% from the prior synthetic period.` : 'Connect the API to calculate period changes.'}</p></div><span className="signal-positive">UP</span></div><div className="signal-item"><span className="signal-index">02</span><div><strong>Margin discipline</strong><p>Net income and expenses are tracked together to keep the operating picture in context.</p></div><span className="signal-neutral">TRACK</span></div><div className="signal-item"><span className="signal-index">03</span><div><strong>Next review</strong><p>Check expense growth against revenue before drawing conclusions from a single period.</p></div><span className="signal-neutral">NOTE</span></div></div><button className="insight-cta" onClick={() => setChatOpen(true)}>Explore with the assistant <ArrowUpRight size={15} /></button></article>
          </section>

          <section className="bottom-grid"><article className="panel table-panel"><div className="panel-header"><div><div className="panel-kicker">MONTHLY DETAIL</div><h2>Recent periods</h2></div><button className="text-button">View all <ArrowUpRight size={14} /></button></div><div className="table-wrap"><table><thead><tr><th>PERIOD</th><th>REVENUE</th><th>EXPENSES</th><th>NET INCOME</th><th>MARGIN</th></tr></thead><tbody>{[...(dashboard?.monthly ?? [])].slice(-5).reverse().map((row) => <tr key={row.month}><td><span className="period-marker" />{new Date(`${row.month}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</td><td>{currency(row.revenue)}</td><td>{currency(row.expenses)}</td><td className="income-cell">{currency(row.net_income)}</td><td>{(row.net_income / row.revenue * 100).toFixed(1)}%</td></tr>)}</tbody></table>{!dashboard && <div className="table-empty">Monthly figures appear when the API is running.</div>}</div></article><article className="panel notes-panel"><div className="panel-header"><div><div className="panel-kicker">WORKSPACE NOTES</div><h2>Keep in context</h2></div><button className="icon-button" aria-label="Add note"><Plus size={17} /></button></div><div className="note-block"><span className="note-date">ANALYSIS GUIDANCE</span><p>These figures are synthetic. Use them to explore workflows, not to make business or investment decisions.</p></div><div className="note-footer"><span className="note-avatar">JD</span><span>Jordan Davis <small>· workspace admin</small></span><span className="note-time">Just now</span></div></article></section>

          <footer className="page-footer"><span>LEDGERLINE FINANCE INTELLIGENCE</span><span><span className={`footer-dot ${apiState}`} />{apiState === 'online' ? 'API connected' : apiState === 'loading' ? 'Connecting…' : 'API disconnected'} <i /> DEMO ENVIRONMENT</span></footer>
        </div>
      </main>

      <aside className={`assistant-drawer ${chatOpen ? 'drawer-open' : ''}`}>
        <div className="assistant-header"><div className="assistant-title"><span className="assistant-avatar"><Bot size={18} /></span><div><strong>Ledgerline</strong><small><span className="online-dot" />Finance assistant</small></div></div><div className="assistant-controls"><button className="icon-button" title="New conversation" aria-label="New conversation" onClick={() => setTurns([{ role: 'assistant', text: 'Fresh session. What would you like to analyze?' }])}><Plus size={17} /></button><button className="icon-button drawer-close" title="Close assistant" aria-label="Close assistant" onClick={() => setChatOpen(false)}><X size={17} /></button></div></div>
        <div className="assistant-context"><span className="context-pulse" />SYNTHETIC FINANCIALS <span>·</span> 12 PERIODS <button title="Context settings" aria-label="Context settings"><Settings2 size={14} /></button></div>
        <div className="chat-stream">{turns.map((turn, index) => <div className={`chat-turn ${turn.role}`} key={`${index}-${turn.role}`}><span className="turn-avatar">{turn.role === 'assistant' ? <Sparkles size={13} /> : 'JD'}</span><div className="turn-content">{turn.role === 'assistant' && <strong className="turn-name">Ledgerline <small>· {index === 0 ? '09:41' : 'now'}</small></strong>}<p>{turn.text}</p>{turn.role === 'assistant' && index > 0 && <div className="answer-tools"><button title="Copy response" aria-label="Copy response" onClick={() => void navigator.clipboard?.writeText(turn.text)}><Download size={13} /></button><span><ShieldCheck size={12} /> Based on synthetic data</span></div>}</div></div>)}{sending && <div className="typing-indicator"><LoaderCircle size={14} className="spin" />Analyzing your question…</div>}</div>
        <div className="suggestion-area"><span className="suggestion-label">START WITH A QUESTION</span><div className="suggestions"><button onClick={() => setPrompt('What was the average revenue across the periods?')}>Average revenue <ArrowUpRight size={12} /></button><button onClick={() => setPrompt('Compare the latest revenue and expenses.')}>Revenue vs. expenses <ArrowUpRight size={12} /></button><button onClick={() => setPrompt('What changed between 245000 and 258000?')}>Calculate a change <ArrowUpRight size={12} /></button></div></div>
        <form className="chat-composer" onSubmit={sendMessage}><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ask about your financials…" rows={2} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage(event as unknown as FormEvent) } }} /><div className="composer-bottom"><span><kbd>↵</kbd> to send · <kbd>⇧ ↵</kbd> new line</span><button type="submit" disabled={!prompt.trim() || sending} aria-label="Send question"><Send size={15} /></button></div></form>
        <div className="assistant-disclaimer"><ShieldCheck size={12} /> For demonstration only. Not financial advice.</div>
      </aside>
      {!chatOpen && <button className="assistant-reopen" onClick={() => setChatOpen(true)} title="Open finance assistant" aria-label="Open finance assistant"><Bot size={19} /></button>}
    </div>
  )
}

export default App