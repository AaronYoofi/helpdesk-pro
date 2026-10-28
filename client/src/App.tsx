import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { Ticket, TicketCategory, TicketPriority, TicketStatus } from './types/ticket'
import './App.css'

const storageKey = 'helpdesk-pro-tickets-v1'
const categories: TicketCategory[] = ['Hardware', 'Software', 'Access', 'Network']
const priorities: TicketPriority[] = ['Urgent', 'High', 'Medium', 'Low']
const statuses: TicketStatus[] = ['Open', 'In progress', 'Escalated', 'Resolved']
const agents = ['Unassigned', 'Kwame Asante', 'Abena Osei', 'Esi Mensah', 'Kojo Boateng']
const themeStorageKey = 'helpdesk-pro-theme-v1'
type UserRole = 'employee' | 'it_agent' | 'admin'
type AuthUser = { id: string; full_name: string; email: string; role: UserRole }
type ApiTicket = { id: string; title: string; requester: string; category: TicketCategory; priority: TicketPriority; status: string; assignee: string | null; description: string; created_at: string; updated_at?: string | null }
const demoAccounts: Array<{ label: string; email: string; role: UserRole }> = [
  { label: 'Employee', email: 'ama.mensah@toptrust.demo', role: 'employee' },
  { label: 'IT agent', email: 'kwame.asante@toptrust.demo', role: 'it_agent' },
  { label: 'Administrator', email: 'kofi.mensah@toptrust.demo', role: 'admin' },
]

function mapApiTicket(ticket: ApiTicket): Ticket {
  const requester = ticket.requester || 'Fictional Employee'
  return {
    id: ticket.id,
    subject: ticket.title,
    requester,
    initials: requester.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join(''),
    category: ticket.category,
    priority: ticket.priority,
    status: (ticket.status === 'In Progress' ? 'In progress' : ticket.status) as TicketStatus,
    assignee: ticket.assignee || 'Unassigned',
    description: ticket.description,
    createdAt: ticket.created_at,
    updatedAt: ticket.updated_at ? `Updated ${new Intl.DateTimeFormat('en-GH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ticket.updated_at))}` : undefined,
  }
}
function SignInScreen({ error, onSignIn }: { error: string; onSignIn: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState('ama.mensah@toptrust.demo')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    await onSignIn(email, password)
    setBusy(false)
  }

  return <main className="auth-screen"><section className="auth-card"><a className="brand auth-brand" href="#overview"><span className="brand-mark">T</span><span className="brand-copy"><span>TopTrust <span className="brand-light">Bank</span></span><small>INTERNAL HELP DESK</small></span></a><p className="eyebrow">STAFF ACCESS</p><h1>Sign in to your help desk</h1><p className="auth-intro">Use a fictional demo account to view the service desk as an employee, IT agent, or administrator.</p><form className="auth-form" onSubmit={submit}><label className="form-field">Work email<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><label className="form-field">Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <p className="edit-error" role="alert">{error}</p>}<button type="submit" className="primary-button auth-submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button></form><div className="demo-access"><strong>Fictional demo access</strong><p>All three sample accounts use the password <code>TopTrustDemo!2026</code>.</p><div>{demoAccounts.map((account) => <button type="button" key={account.role} onClick={() => { setEmail(account.email); setPassword('TopTrustDemo!2026'); void onSignIn(account.email, 'TopTrustDemo!2026') }}><span>{account.label}</span><small>{account.email}</small></button>)}</div></div><small className="auth-footnote">Demo only · Do not enter real banking or customer information.</small></section></main>
}

function App() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [ticketsLoaded, setTicketsLoaded] = useState(false)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState('')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const savedTheme = localStorage.getItem(themeStorageKey)
      if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    } catch {
      return 'light'
    }
  })
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null)
  const [savingTicket, setSavingTicket] = useState(false)
  const [editError, setEditError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(themeStorageKey, theme)
    } catch {
      // The selected theme still applies for this session if storage is unavailable.
    }
  }, [theme])

  useEffect(() => {
    fetch('http://localhost:3001/api/auth/me', { credentials: 'include' })
      .then(async (response) => {
        if (response.status === 401) return null
        if (!response.ok) throw new Error('Could not check the sign-in session')
        return response.json() as Promise<{ user: AuthUser }>
      })
      .then((session) => setCurrentUser(session?.user || null))
      .catch(() => setAuthError('Cannot connect to the API. Make sure the server terminal is running.'))
      .finally(() => setAuthLoading(false))
  }, [])

  useEffect(() => {
    if (!currentUser || !ticketsLoaded || currentUser.role === 'employee') return
    try {
      localStorage.setItem(storageKey, JSON.stringify(tickets))
      setSaveMessage('Signed-in view · changes save to SQLite.')
    } catch {
      setSaveMessage('Browser storage is unavailable. Try opening the app through its Vite address.')
    }
  }, [tickets, currentUser, ticketsLoaded])

  // Employees only receive their own requests; IT roles also see fictional queue examples.
  useEffect(() => {
    setTicketsLoaded(false)
    if (!currentUser) {
      setTickets([])
      return
    }
    fetch('http://localhost:3001/api/tickets', { credentials: 'include' })
      .then((response) => {
        if (response.status === 401) throw new Error('401')
        if (!response.ok) throw new Error('Could not load tickets from the API')
        return response.json()
      })
      .then(async (databaseTickets: ApiTicket[]) => {
        const fromDatabase = databaseTickets.map(mapApiTicket)
        // Preserve old browser-only demo tickets by copying missing records to SQLite for staff roles.
        if (currentUser.role !== 'employee') {
          const existingIds = new Set(fromDatabase.map((ticket) => ticket.id))
          try {
            const cached = JSON.parse(localStorage.getItem(storageKey) || '[]') as Ticket[]
            for (const ticket of cached) {
              if (!ticket.id || existingIds.has(ticket.id)) continue
              const response = await fetch(`http://localhost:3001/api/tickets/${encodeURIComponent(ticket.id)}`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: ticket.subject, requester: ticket.requester, description: ticket.description, category: ticket.category, priority: ticket.priority, status: ticket.status, assignee: ticket.assignee }),
              })
              if (response.ok) {
                fromDatabase.push(mapApiTicket(await response.json() as ApiTicket))
                existingIds.add(ticket.id)
              }
            }
          } catch {
            // Keep the database-backed ticket list usable if an old browser cache cannot be migrated.
          }
        }
        setTickets(fromDatabase)
        setTicketsLoaded(true)
      })
      .catch((error: Error) => {
        if (error.message.includes('401')) {
          setCurrentUser(null)
          setAuthError('Your sign-in session ended. Please sign in again.')
        } else setSaveMessage('Could not load tickets from the database API.')
      })
  }, [currentUser])

  async function signIn(email: string, password: string) {
    setAuthError('')
    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const result = await response.json() as { user?: AuthUser; error?: string }
      if (!response.ok || !result.user) {
        setAuthError(result.error || 'Sign-in failed. Please try again.')
        return
      }
      setCurrentUser(result.user)
    } catch {
      setAuthError('Cannot connect to the API. Make sure the server terminal is running.')
    }
  }

  async function signOut() {
    try {
      await fetch('http://localhost:3001/api/auth/logout', { method: 'POST', credentials: 'include' })
    } finally {
      setCurrentUser(null)
      setTickets([])
      setEditingTicket(null)
      setFormOpen(false)
    }
  }

  function exportVisibleTickets() {
    const columns = ['Ticket ID', 'Subject', 'Requester', 'Category', 'Priority', 'Status', 'Assignee', 'Description', 'Created at']
    const rows = visibleTickets.map((ticket) => [ticket.id, ticket.subject, ticket.requester, ticket.category, ticket.priority, ticket.status, ticket.assignee, ticket.description, ticket.createdAt])
    const csv = [columns, ...rows].map((row) => row.map((value) => {
      const text = String(value)
      const safeText = /^[\t\r=+\-@]/.test(text) ? `'${text}` : text
      return `"${safeText.replaceAll('"', '""')}"`
    }).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const download = document.createElement('a')
    download.href = url
    download.download = `toptrust-bank-tickets-${new Date().toISOString().slice(0, 10)}.csv`
    download.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const visibleTickets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return tickets.filter((ticket) => {
      const matchesQuery = [ticket.id, ticket.subject, ticket.requester, ticket.assignee]
        .some((value) => value.toLowerCase().includes(normalizedQuery))
      return matchesQuery
        && (statusFilter === 'all' || ticket.status === statusFilter)
        && (priorityFilter === 'all' || ticket.priority === priorityFilter)
    })
  }, [tickets, query, statusFilter, priorityFilter])

  const openCount = tickets.filter((ticket) => ticket.status === 'Open' || ticket.status === 'Escalated').length
  const progressCount = tickets.filter((ticket) => ticket.status === 'In progress').length
  const resolvedCount = tickets.filter((ticket) => ticket.status === 'Resolved').length
  const categoryCounts = categories.map((category) => ({
    category,
    count: tickets.filter((ticket) => ticket.category === category && ticket.status !== 'Resolved').length,
  }))
  const openByCategory = Math.max(1, ...categoryCounts.map((item) => item.count))
  const weeklyVolume = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - (6 - index))
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const count = tickets.filter((ticket) => {
      const created = new Date(ticket.createdAt)
      const createdKey = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}-${String(created.getDate()).padStart(2, '0')}`
      return !Number.isNaN(created.getTime()) && createdKey === key
    }).length
    return { label: new Intl.DateTimeFormat('en-GH', { weekday: 'short' }).format(date), count }
  }), [tickets])
  const weekTotal = weeklyVolume.reduce((total, day) => total + day.count, 0)
  const chartScale = Math.max(4, Math.ceil(Math.max(1, ...weeklyVolume.map((day) => day.count)) / 4) * 4)
  const chartTicks = [chartScale, Math.round(chartScale * .75), Math.round(chartScale * .5), Math.round(chartScale * .25), 0]

  if (authLoading) return <main className="auth-screen"><p className="auth-loading">Connecting to TopTrust Bank Help Desk…</p></main>
  if (!currentUser) return <SignInScreen error={authError} onSignIn={signIn} />
  const userInitials = currentUser.full_name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
  const roleLabel = currentUser.role === 'admin' ? 'IT Administrator' : currentUser.role === 'it_agent' ? 'IT Support Agent' : 'Bank Employee'

  async function addTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    const requester = String(formData.get('requester')).trim()
    const payload = {
      requester,
      title: String(formData.get('subject')).trim(),
      category: String(formData.get('category')),
      priority: String(formData.get('priority')),
      description: String(formData.get('description')).trim(),
    }
    let response: Response
    try {
      response = await fetch('http://localhost:3001/api/tickets', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch {
      setSaveMessage('Could not connect to the database API. Is the server running?')
      return
    }
    if (!response.ok) {
      setSaveMessage('The API could not save this ticket. Please try again.')
      return
    }
    const saved = await response.json() as { id: string; title: string; requester: string; category: TicketCategory; priority: TicketPriority; status: TicketStatus; assignee: string | null; description: string; created_at: string }
    const newTicket: Ticket = {
      id: saved.id,
      subject: saved.title,
      requester: saved.requester,
      initials: saved.requester.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join(''),
      category: saved.category,
      priority: saved.priority,
      status: saved.status,
      assignee: saved.assignee || 'Unassigned',
      description: saved.description,
      createdAt: saved.created_at,
    }
    setTickets((current) => [newTicket, ...current])
    setFormOpen(false)
    setQuery('')
    setStatusFilter('all')
    setPriorityFilter('all')
    form.reset()
  }

  async function updateTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingTicket || savingTicket) return
    const formData = new FormData(event.currentTarget)
    const payload = {
      title: editingTicket.subject,
      requester: editingTicket.requester,
      description: String(formData.get('description')).trim(),
      category: String(formData.get('category')) as TicketCategory,
      priority: String(formData.get('priority')) as TicketPriority,
      status: String(formData.get('status')) as TicketStatus,
      assignee: String(formData.get('assignee')),
    }

    setSavingTicket(true)
    setEditError('')
    let response: Response
    try {
      response = await fetch(`http://localhost:3001/api/tickets/${encodeURIComponent(editingTicket.id)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch {
      setEditError('Could not connect to the database API. Check that the server terminal is still running, then try again.')
      setSavingTicket(false)
      return
    }

    if (!response.ok) {
      const problem = await response.json().catch(() => null) as { error?: string } | null
      setEditError(problem?.error || `The API could not save these changes (error ${response.status}).`)
      setSavingTicket(false)
      return
    }

    const saved = await response.json() as {
      id: string
      title: string
      requester: string
      category: TicketCategory
      priority: TicketPriority
      status: string
      assignee: string | null
      description: string
      created_at: string
      updated_at: string
    }
    const updatedTicket: Ticket = {
      ...editingTicket,
      id: saved.id,
      subject: saved.title,
      requester: saved.requester,
      initials: saved.requester.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join(''),
      category: saved.category,
      priority: saved.priority,
      status: (saved.status === 'In Progress' ? 'In progress' : saved.status) as TicketStatus,
      assignee: saved.assignee || 'Unassigned',
      description: saved.description,
      createdAt: saved.created_at,
      updatedAt: saved.updated_at ? `Updated ${new Intl.DateTimeFormat('en-GH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(saved.updated_at))}` : 'Updated just now',
    }
    setTickets((current) => current.map((ticket) => ticket.id === updatedTicket.id ? updatedTicket : ticket))
    setEditingTicket(null)
    setSavingTicket(false)
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#overview">Skip to main content</a>
      <aside className="sidebar" aria-label="Main navigation">
          <a className="brand" href="#overview" aria-label="TopTrust Bank Help Desk home"><span className="brand-mark">T</span><span className="brand-copy"><span>TopTrust <span className="brand-light">Bank</span></span><small>INTERNAL HELP DESK</small></span></a>
        <div className="workspace-label">IT SUPPORT</div>
        <nav className="side-nav">
          <a className="nav-item active" href="#overview"><span className="nav-icon">◫</span>Overview</a>
          <a className="nav-item" href="#tickets"><span className="nav-icon">▤</span>Tickets<span className="nav-count">{tickets.length}</span></a>
          <a className="nav-item" href="#analytics"><span className="nav-icon">⌁</span>Analytics</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card"><span className="help-icon">?</span><strong>Need a hand?</strong><p>Visit the support center for quick answers.</p><a href="#help">Open support center <span>↗</span></a></div>
          <div className="profile"><div className="avatar admin-avatar">{userInitials}</div><div><strong>{currentUser.full_name}</strong><small>{roleLabel}</small></div><button className="more-button" type="button" onClick={signOut} aria-label="Sign out" title="Sign out">↪</button></div>
        </div>
      </aside>

      <main className="main-content" id="overview">
        <header className="topbar"><div className="breadcrumbs">TopTrust Bank <span>/</span> IT Help Desk</div><div className="top-actions"><span className="today">{new Intl.DateTimeFormat('en-GH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(new Date())}</span><button type="button" className="theme-toggle" onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}><span aria-hidden="true">{theme === 'dark' ? '☀' : '◐'}</span><span className="theme-label">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span></button><div className="avatar admin-avatar small-avatar">{userInitials}</div></div></header>
        <section className="page-heading"><div><p className="eyebrow">TOPTRUST BANK · {roleLabel.toUpperCase()}</p><h1>Hi, {currentUser.full_name.split(' ')[0]}</h1><p className="subheading">{currentUser.role === 'employee' ? 'Your IT requests, at a glance.' : 'Your support queue, at a glance.'}</p></div></section>

        <section className="stat-grid" aria-label="Ticket summary">
          <article className="stat-card"><div className="stat-top"><span>Open tickets</span><span className="stat-icon blue">▤</span></div><div className="stat-value">{openCount}</div><div className="stat-foot"><span className="trend positive">Live</span> in the current queue</div></article>
          <article className="stat-card"><div className="stat-top"><span>In progress</span><span className="stat-icon violet">◷</span></div><div className="stat-value">{progressCount}</div><div className="stat-foot">Assigned and being worked</div></article>
          <article className="stat-card"><div className="stat-top"><span>Resolved</span><span className="stat-icon green">✓</span></div><div className="stat-value">{resolvedCount}</div><div className="stat-foot">Completed demo requests</div></article>
          <article className="stat-card"><div className="stat-top"><span>Total tickets</span><span className="stat-icon amber">◴</span></div><div className="stat-value">{tickets.length}</div><div className="stat-foot">Fictional bank demo records</div></article>
        </section>

        <nav className="quick-actions" aria-label="Quick actions">
          <button type="button" className="quick-action quick-action-primary" aria-haspopup="dialog" aria-expanded={formOpen} onClick={() => setFormOpen(true)}><span aria-hidden="true">＋</span> New ticket</button>
          <a className="quick-action" href="#tickets"><span aria-hidden="true">▤</span> View tickets</a>
          <a className="quick-action" href="#analytics"><span aria-hidden="true">↗</span> View analytics</a>
        </nav>

        <section className="content-grid" id="analytics">
          <article className="panel chart-panel"><div className="panel-heading"><div><h2>Ticket volume</h2><p>Tickets created in the past seven days</p></div><span className="period-label">LAST 7 DAYS</span></div><div className="chart-summary"><span><i className="legend-dot" />Tickets received</span><strong>{weekTotal} <small>tickets</small></strong></div><div className="volume-chart" aria-label="Ticket volume from the past seven days"><div className="chart-y-labels">{chartTicks.map((tick, index) => <span key={index}>{tick}</span>)}</div><div className="chart-area-wrap"><div className="chart-gridlines"><i /><i /><i /><i /><i /></div><div className="chart-bars">{weeklyVolume.map((day) => <div className="chart-bar-column" key={day.label}><div className="chart-bar" style={{ height: `${day.count / chartScale * 100}%` }} /><span>{day.label}</span></div>)}</div></div></div></article>
          <article className="panel category-panel"><div className="panel-heading"><div><h2>By category</h2><p>Unresolved tickets by type</p></div><span className="period-label">LIVE</span></div><div className="category-report">{categoryCounts.map(({ category, count }) => <div className="category-row" key={category}><span>{category}</span><div className="category-track"><i style={{ width: `${count / openByCategory * 100}%` }} /></div><strong>{count}</strong></div>)}</div><div className="category-total"><span>Open queue</span><strong>{openCount} <small>tickets</small></strong></div></article>
        </section>

        <section className="panel tickets-panel" id="tickets"><div className="tickets-heading"><div><h2>{currentUser.role === 'employee' ? 'My tickets' : 'Recent tickets'}</h2><p>{currentUser.role === 'employee' ? 'Requests submitted from your staff account' : 'A snapshot of your team’s latest requests'}</p></div><span className="save-indicator"><i />{saveMessage}</span></div><div className="ticket-toolbar"><label className="search-box"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Search tickets..." aria-label="Search by ticket, subject, requester, or assignee" /></label><label className="filter-select"><span aria-hidden="true">☷</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status"><option value="all">All status</option><option>Open</option><option>In progress</option><option>Escalated</option><option>Resolved</option></select></label><label className="filter-select"><select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} aria-label="Filter by priority"><option value="all">All priority</option>{priorities.map((priority) => <option key={priority}>{priority}</option>)}</select></label><button type="button" className="export-button" onClick={exportVisibleTickets}>Export CSV</button></div>
          <div className="table-wrap"><table><thead><tr><th>TICKET</th><th>SUBJECT</th><th>REQUESTER</th><th>PRIORITY</th><th>STATUS</th><th>ASSIGNEE</th><th aria-label="Actions" /></tr></thead><tbody>{visibleTickets.map((ticket) => <tr key={ticket.id}><td className="ticket-id">{ticket.id}</td><td className="subject-cell">{ticket.subject}<small>{ticket.updatedAt || ticket.createdAt}</small></td><td><span className="requester-cell"><i className={`mini-avatar ${ticket.initials.charCodeAt(0) % 2 ? 'avatar-alt' : ''}`}>{ticket.initials}</i>{ticket.requester}</span></td><td><span className={`priority-pill ${ticket.priority.toLowerCase()}`}><i />{ticket.priority}</span></td><td><span className={`status-pill ${ticket.status.toLowerCase().replaceAll(' ', '-')}`}>{ticket.status}</span></td><td><span className="assignee-cell"><i>{ticket.assignee === 'Unassigned' ? '—' : ticket.assignee.split(' ').map((name) => name[0]).join('')}</i>{ticket.assignee}</span></td><td>{currentUser.role !== 'employee' && <button type="button" className="row-more" onClick={() => { setEditError(''); setEditingTicket(ticket) }} aria-label={`Edit ${ticket.id}`}>Edit</button>}</td></tr>)}</tbody></table>{visibleTickets.length === 0 && <div className="empty-state">No tickets match your search and filters.</div>}</div><div className="table-footer"><span>Showing {visibleTickets.length} of {tickets.length} tickets</span><span className="demo-note">{currentUser.role === 'employee' ? 'Your requests only' : 'Fictional demo records'}</span></div>
        </section>
        <footer className="app-footer">© 2026 TopTrust Bank Help Desk <span>•</span> Fictional bank · Demo data only</footer>
      </main>

      {formOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormOpen(false) }}><section className="ticket-modal" role="dialog" aria-modal="true" aria-labelledby="ticket-form-title"><form className="ticket-modal-form" onSubmit={addTicket}><div className="modal-heading"><div><p className="eyebrow">TOPTRUST BANK · EMPLOYEE REQUEST</p><h2 id="ticket-form-title">Submit an IT ticket</h2><p>Describe the issue with your work device or bank system.</p></div><button className="close-button" type="button" onClick={() => setFormOpen(false)} aria-label="Close form">×</button></div><label className="form-field">Your name<input name="requester" required maxLength={60} value={currentUser.full_name} readOnly /></label><label className="form-field">Subject<input name="subject" required maxLength={100} placeholder="e.g. Branch workstation cannot connect" /></label><div className="form-row"><label className="form-field">Category<select name="category" required defaultValue=""><option value="" disabled>Choose category</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label className="form-field">Priority<select name="priority" required defaultValue=""><option value="" disabled>Choose priority</option>{priorities.map((priority) => <option key={priority}>{priority}</option>)}</select></label></div><label className="form-field">Description<textarea name="description" required minLength={10} maxLength={1000} rows={4} placeholder="What happened, and what have you tried so far?" /><small>Do not include customer names, account numbers, or other sensitive information.</small></label><div className="modal-actions"><button type="button" className="cancel-button" onClick={() => setFormOpen(false)}>Cancel</button><button type="submit" className="primary-button">Submit ticket</button></div></form></section></div>}
      {editingTicket && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !savingTicket) setEditingTicket(null) }}><section className="ticket-modal" role="dialog" aria-modal="true" aria-labelledby="edit-ticket-title"><form key={editingTicket.id} className="ticket-modal-form" onSubmit={updateTicket}><div className="modal-heading"><div><p className="eyebrow">{editingTicket.id} · IT STAFF</p><h2 id="edit-ticket-title">{editingTicket.subject}</h2><p>Requested by {editingTicket.requester}</p></div><button className="close-button" type="button" onClick={() => setEditingTicket(null)} aria-label="Close edit form">×</button></div><label className="form-field">Description<textarea name="description" required minLength={10} maxLength={1000} rows={4} defaultValue={editingTicket.description} /></label><div className="form-row"><label className="form-field">Category<select name="category" defaultValue={editingTicket.category}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label className="form-field">Priority<select name="priority" defaultValue={editingTicket.priority}>{priorities.map((priority) => <option key={priority}>{priority}</option>)}</select></label></div><div className="form-row"><label className="form-field">Status<select name="status" defaultValue={editingTicket.status}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label><label className="form-field">Assignee<select name="assignee" defaultValue={editingTicket.assignee}>{agents.map((agent) => <option key={agent}>{agent}</option>)}</select></label></div><p className="edit-hint">Set status to <strong>Escalated</strong> to raise the request for attention, or <strong>Resolved</strong> when complete.</p>{editError && <p className="edit-error" role="alert">{editError}</p>}<div className="modal-actions"><button type="button" className="cancel-button" disabled={savingTicket} onClick={() => setEditingTicket(null)}>Cancel</button><button type="submit" className="primary-button" disabled={savingTicket}>{savingTicket ? 'Saving…' : 'Save changes'}</button></div></form></section></div>}
    </div>
  )
}

export default App
