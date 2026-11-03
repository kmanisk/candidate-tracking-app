import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, BriefcaseBusiness, CalendarDays,
  Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3,
  FilterX, KanbanSquare, LayoutDashboard, Mail, MapPin, Menu, MoreHorizontal,
  Pencil, Plus, Search, SlidersHorizontal, Trash2, UsersRound, X,
} from 'lucide-react';
import { api } from './api';
import { STAGES } from './types';
import type { Candidate, CandidateInput, Page, Stage, Stats, View } from './types';
import { candidateForm, emptyForm, formatDate, initials, shortDate, stageClass } from './utils';

const VIEWS: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'candidates', label: 'Candidates', icon: UsersRound },
  { id: 'pipeline', label: 'Hiring pipeline', icon: KanbanSquare },
];
const EMPTY_PAGE: Page = { items: [], total: 0, page: 1, pages: 1, limit: 10 };
const EMPTY_COUNTS = Object.fromEntries(STAGES.map(s => [s, 0])) as Record<Stage, number>;

function Avatar({ name, size = 'normal' }: { name: string; size?: 'normal' | 'large' }) {
  const palette = ['mint', 'blue', 'peach', 'lilac', 'sand'];
  const color = palette[name.charCodeAt(0) % palette.length];
  return <span className={'avatar avatar-' + color + (size === 'large' ? ' avatar-large' : '')}>{initials(name)}</span>;
}

function StageBadge({ stage }: { stage: Stage }) {
  return <span className={'stage-badge ' + stageClass(stage)}><span className="status-dot" />{stage}</span>;
}

function CandidateFormModal({
  editing, onClose, onSave,
}: {
  editing: Candidate | null;
  onClose: () => void;
  onSave: (data: CandidateInput) => Promise<void>;
}) {
  const [form, setForm] = useState<CandidateInput>(() => editing ? candidateForm(editing) : emptyForm());
  const [skillsText, setSkillsText] = useState(() => (editing?.skills || []).join(', '));
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState('');
  const update = <K extends keyof CandidateInput>(key: K, value: CandidateInput[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));
  const localValue = form.interviewAt ? new Date(new Date(form.interviewAt).getTime() - new Date(form.interviewAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFailure('');
    try {
      await onSave({
        ...form,
        skills: [...new Set(skillsText.split(',').map(s => s.trim()).filter(Boolean))],
      });
    } catch (err) {
      setFailure(err instanceof Error ? err.message : 'Unable to save candidate');
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="overlay" role="presentation" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-label={editing ? 'Edit candidate' : 'Add candidate'}>
        <div className="modal-head">
          <div><div className="eyebrow">RECRUITMENT / CANDIDATES</div><h2>{editing ? 'Edit candidate' : 'Add a candidate'}</h2><p>Keep your pipeline accurate and up to date.</p></div>
          <button className="icon-button" onClick={onClose} aria-label="Close form"><X size={20} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="field-grid">
              <label className="field span-2">Full name <span>*</span><input required autoFocus minLength={2} maxLength={100} placeholder="e.g. Alex Morgan" value={form.name} onChange={e => update('name', e.target.value)} /></label>
              <label className="field">Email address <span>*</span><input required type="email" placeholder="alex@example.com" value={form.email} onChange={e => update('email', e.target.value)} /></label>
              <label className="field">Phone number<input type="tel" maxLength={30} placeholder="+91 90000 00000" value={form.phone} onChange={e => update('phone', e.target.value)} /></label>
              <label className="field">Applied position <span>*</span><input required minLength={2} maxLength={100} placeholder="Full Stack Developer" value={form.role} onChange={e => update('role', e.target.value)} /></label>
              <label className="field">Current stage<select value={form.stage} onChange={e => update('stage', e.target.value as Stage)}>{STAGES.map(s => <option key={s}>{s}</option>)}</select></label>
              <label className="field span-2">Skills <small>comma-separated</small><input placeholder="React, TypeScript, Node.js" value={skillsText} onChange={e => setSkillsText(e.target.value)} /></label>
              <label className="field">Experience <small>years</small><input type="number" min="0" max="40" step="0.5" value={form.experience} onChange={e => update('experience', Number(e.target.value))} /></label>
              <label className="field">Location<input maxLength={120} placeholder="e.g. Bengaluru" value={form.location} onChange={e => update('location', e.target.value)} /></label>
              <label className="field">Source<input maxLength={100} placeholder="Careers page" value={form.source} onChange={e => update('source', e.target.value)} /></label>
              <label className="field">Interview date<input type="datetime-local" value={localValue} onChange={e => update('interviewAt', e.target.value ? new Date(e.target.value).toISOString() : null)} /></label>
            </div>
            {failure && <div className="inline-error" role="alert">{failure}</div>}
          </div>
          <div className="modal-actions"><button type="button" className="button button-subtle" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={saving} type="submit">{saving ? 'Saving…' : editing ? 'Save changes' : 'Create candidate'} <ArrowRight size={16} /></button></div>
        </form>
      </section>
    </div>
  );
}

function ProfileDrawer({
  candidate, onClose, onEdit, onDelete, onStage, onNote,
}: {
  candidate: Candidate;
  onClose: () => void;
  onEdit: (candidate: Candidate) => void;
  onDelete: (candidate: Candidate) => Promise<void>;
  onStage: (candidate: Candidate, stage: Stage) => Promise<void>;
  onNote: (candidate: Candidate, note: string) => Promise<void>;
}) {
  const [note, setNote] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  async function submitNote(e: FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setWorking(true);
    setError('');
    try {
      await onNote(candidate, note);
      setNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add note');
    } finally {
      setWorking(false);
    }
  }
  return (
    <div className="drawer-scrim" role="presentation" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={'Profile of ' + candidate.name}>
        <div className="drawer-top"><span className="eyebrow">CANDIDATE PROFILE</span><button className="icon-button" onClick={onClose} aria-label="Close profile"><X size={20} /></button></div>
        <div className="profile-hero"><Avatar name={candidate.name} size="large" /><div><h2>{candidate.name}</h2><p>{candidate.role}</p></div></div>
        <div className="profile-status"><StageBadge stage={candidate.stage} /><span>Applied {formatDate(candidate.createdAt)}</span></div>
        <div className="profile-actions"><button className="button button-primary" onClick={() => onEdit(candidate)}><Pencil size={15} /> Edit profile</button><button className="button button-outline danger" onClick={() => onDelete(candidate)}><Trash2 size={15} /> Delete</button></div>
        <div className="drawer-section"><h3>Contact information</h3><div className="profile-row"><Mail size={16} /><a href={'mailto:' + candidate.email}>{candidate.email}</a></div><div className="profile-row"><MapPin size={16} /><span>{candidate.location || 'Not specified'}</span></div><div className="profile-row"><BriefcaseBusiness size={16} /><span>{candidate.experience} years experience</span></div><div className="profile-row"><ArrowUpRight size={16} /><span>Source: {candidate.source}</span></div>{candidate.interviewAt && <div className="profile-row"><CalendarDays size={16} /><span>Interview: {formatDate(candidate.interviewAt)}</span></div>}</div>
        <div className="drawer-section"><h3>Skills</h3><div className="skill-list">{candidate.skills.length ? candidate.skills.map(skill => <span className="skill" key={skill}>{skill}</span>) : <span className="muted">No skills recorded</span>}</div></div>
        <div className="drawer-section"><h3>Move to stage</h3><select className="full-select" aria-label="Update hiring stage" value={candidate.stage} onChange={e => { setError(''); void onStage(candidate, e.target.value as Stage).catch(err => setError(err.message)); }}>{STAGES.map(stage => <option key={stage}>{stage}</option>)}</select></div>
        <div className="drawer-section"><h3>Recruiter notes <span className="count-label">{candidate.notes.length}</span></h3>{candidate.notes.slice().reverse().map(item => <div key={item.id} className="note"><p>{item.text}</p><span>{item.author} · {formatDate(item.createdAt)}</span></div>)}<form onSubmit={submitNote} className="note-form"><textarea value={note} maxLength={1500} rows={3} placeholder="Add interview feedback or a private recruiter note…" onChange={e => setNote(e.target.value)} /><button disabled={working || !note.trim()} type="submit" className="button button-primary">Add note <Plus size={15} /></button></form></div>
        <div className="drawer-section"><h3>Activity history</h3><div className="timeline">{candidate.history.slice().reverse().map((event, i) => <div className="timeline-item" key={i}><span className="timeline-mark" /><div><strong>{event.from ? event.from + ' → ' + event.to : 'Applied'}</strong><small>{formatDate(event.at)}</small></div></div>)}</div>{candidate.history.length === 0 && <p className="muted">No recorded stage changes.</p>}</div>
        {error && <div className="inline-error" role="alert">{error}</div>}
      </aside>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>('overview');
  const [mobileNav, setMobileNav] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [page, setPage] = useState<Page>(EMPTY_PAGE);
  const [board, setBoard] = useState<Candidate[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [stage, setStage] = useState('');
  const [role, setRole] = useState('');
  const [skill, setSkill] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(false);
  const [boardLoading, setBoardLoading] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Candidate | null>(null);
  const [draggedId, setDraggedId] = useState('');
  const counts = stats?.byStage || EMPTY_COUNTS;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 260);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => { setPageNumber(1); }, [debouncedSearch, stage, role, skill]);

  useEffect(() => {
    let active = true;
    api.stats().then(data => { if (active) setStats(data); }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [revision]);

  useEffect(() => {
    if (view !== 'candidates') return;
    let active = true;
    setLoading(true);
    const params = new URLSearchParams({ page: String(pageNumber), limit: '10' });
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (stage) params.set('stage', stage);
    if (role) params.set('role', role);
    if (skill.trim()) params.set('skill', skill.trim());
    api.list(params).then(data => { if (active) setPage(data); }).catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [view, pageNumber, debouncedSearch, stage, role, skill, revision]);

  useEffect(() => {
    if (view !== 'pipeline') return;
    let active = true;
    setBoardLoading(true);
    async function fetchBoard() {
      const items: Candidate[] = [];
      let next = 1;
      let pages = 1;
      do {
        const data = await api.list(new URLSearchParams({ page: String(next), limit: '50' }));
        items.push(...data.items);
        pages = data.pages;
        next++;
      } while (next <= pages && next <= 100);
      if (active) setBoard(items);
    }
    fetchBoard().catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setBoardLoading(false); });
    return () => { active = false; };
  }, [view, revision]);

  const title = { overview: 'Recruitment overview', candidates: 'Candidate directory', pipeline: 'Hiring pipeline' }[view];
  const subtitle = { overview: 'A clear view of the people behind your hiring process.', candidates: 'Review, search and manage every application.', pipeline: 'Move applicants forward, one stage at a time.' }[view];
  const recent = useMemo(() => stats?.latest || [], [stats]);

  function updated() { setRevision(current => current + 1); }
  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(candidate: Candidate) { setEditing(candidate); setModalOpen(true); }
  function navigate(next: View) { setView(next); setMobileNav(false); setError(''); }
  async function openProfile(candidate: Candidate) {
    setSelected(candidate);
    try { setSelected(await api.get(candidate.id)); } catch (err) { setError((err as Error).message); }
  }
  async function saveCandidate(data: CandidateInput) {
    const saved = editing ? await api.update(editing.id, data) : await api.create(data);
    if (selected?.id === saved.id) setSelected(saved);
    setModalOpen(false);
    setEditing(null);
    updated();
  }
  async function changeStage(candidate: Candidate, next: Stage) {
    const result = await api.stage(candidate.id, next);
    if (selected?.id === candidate.id) setSelected(result);
    updated();
  }
  async function addNote(candidate: Candidate, note: string) {
    const result = await api.note(candidate.id, note);
    setSelected(result);
    updated();
  }
  async function removeCandidate(candidate: Candidate) {
    if (!window.confirm('Delete ' + candidate.name + '? This cannot be undone.')) return;
    try {
      await api.remove(candidate.id);
      setSelected(null);
      updated();
    } catch (err) { setError((err as Error).message); }
  }

  function renderRows(items: Candidate[]) {
    return items.map(candidate => (
      <tr key={candidate.id}>
        <td><button className="candidate-name" onClick={() => void openProfile(candidate)}><Avatar name={candidate.name} /><span><strong>{candidate.name}</strong><small>{candidate.email}</small></span></button></td>
        <td><span className="role-text">{candidate.role}</span></td>
        <td><StageBadge stage={candidate.stage} /></td>
        <td className="skills-cell"><div className="skill-list">{candidate.skills.slice(0, 2).map(s => <span className="skill" key={s}>{s}</span>)}{candidate.skills.length > 2 && <span className="skill skill-more">+{candidate.skills.length - 2}</span>}</div></td>
        <td className="date-cell">{formatDate(candidate.createdAt)}</td>
        <td className="actions-cell"><button className="icon-button" title={'View ' + candidate.name} aria-label={'View ' + candidate.name} onClick={() => void openProfile(candidate)}><ArrowUpRight size={17} /></button></td>
      </tr>
    ));
  }
  function table(items: Candidate[]) {
    return <div className="table-scroll"><table className="candidate-table"><thead><tr><th>Candidate</th><th>Position</th><th>Stage</th><th>Skills</th><th>Applied</th><th aria-label="Actions" /></tr></thead><tbody>{renderRows(items)}</tbody></table>{items.length === 0 && <div className="empty-list"><UsersRound size={28} /><h3>No candidates found</h3><p>Try adjusting filters or add your first applicant.</p></div>}</div>;
  }

  return (
    <div className="app-shell">
      <aside className={'sidebar' + (mobileNav ? ' sidebar-open' : '')}>
        <div className="brand"><span className="brand-mark"><span>H</span></span><span className="brand-name">hireline<span className="brand-dot">.</span><small>RECRUITMENT OS</small></span></div>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">{VIEWS.map(item => <button key={item.id} className={'nav-link' + (view === item.id ? ' nav-active' : '')} onClick={() => navigate(item.id)}><item.icon size={18} /><span>{item.label}</span>{item.id === 'candidates' && <span className="nav-count">{stats?.total ?? '—'}</span>}</button>)}</nav>
        <div className="sidebar-bottom"><div className="workspace-card"><span className="workspace-orb">H</span><div><strong>Hireline Demo</strong><small>Sample workspace</small></div><MoreHorizontal size={17} /></div><div className="sidebar-caption"><span className="online-dot" /> DEMO ENVIRONMENT <span>v1.0</span></div></div>
      </aside>

      <div className="main-panel">
        <header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileNav(!mobileNav)}><Menu size={21} /></button><span className="breadcrumbs">Workspace <ChevronRight size={14} /> <strong>{view === 'overview' ? 'Overview' : view === 'candidates' ? 'Candidates' : 'Pipeline'}</strong></span></div><div className="topbar-right"><span className="demo-tag"><span /> LIVE DEMO</span><span className="topbar-divider" /><div className="account"><span className="account-avatar">HR</span><span>Recruiter</span><ChevronDown size={14} /></div></div></header>
        <main className="content">
          <div className="page-heading"><div><div className="eyebrow">HIRELINE / WORKSPACE</div><h1>{title}</h1><p>{subtitle}</p></div><button className="button button-primary add-button" onClick={openCreate}><Plus size={17} /> Add candidate</button></div>
          <div className="public-note"><CircleHelp size={16} /><span>Portfolio demo with fictional candidate records. No sign-in is enabled; do not enter real personal information.</span></div>
          {error && <div className="global-error" role="alert"><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError('')}><X size={16} /></button></div>}

          {view === 'overview' && <>
            <div className="metrics">
              <div className="metric"><div className="metric-top"><span>Total candidates</span><UsersRound size={20} /></div><div className="metric-value">{stats?.total ?? '—'}<span className="metric-chip">ALL TIME</span></div><span className="metric-foot"><ArrowUpRight size={14} /> Across all open roles</span></div>
              <div className="metric"><div className="metric-top"><span>In interviews</span><CalendarDays size={20} /></div><div className="metric-value">{counts.Interview}<span className="metric-chip">ACTIVE</span></div><span className="metric-foot"><Clock3 size={14} /> {stats?.upcoming ?? '—'} scheduled this week</span></div>
              <div className="metric"><div className="metric-top"><span>Selected</span><Check size={20} /></div><div className="metric-value">{counts.Selected}<span className="metric-chip metric-good">HIRED</span></div><span className="metric-foot"><ArrowUpRight size={14} /> Successfully moved forward</span></div>
              <div className="metric"><div className="metric-top"><span>Rejected</span><ArrowDownRight size={20} /></div><div className="metric-value">{counts.Rejected}<span className="metric-chip">CLOSED</span></div><span className="metric-foot"><ArrowDownRight size={14} /> Applications closed</span></div>
            </div>
            <div className="overview-grid">
              <section className="surface pipeline-summary"><div className="section-heading"><div><div className="eyebrow">PIPELINE HEALTH</div><h2>Hiring, at a glance</h2></div><button className="text-link" onClick={() => navigate('pipeline')}>View pipeline <ArrowRight size={15} /></button></div><p className="section-subtitle">Candidate distribution across your recruitment stages</p><div className="distribution-bar" role="img" aria-label="Distribution across recruitment stages">{STAGES.map(s => <div key={s} className={stageClass(s)} style={{ flexGrow: counts[s], flexBasis: counts[s] ? 0 : 0, minWidth: 0 }} />)}</div><div className="stage-stats">{STAGES.map(s => <div className="stage-stat" key={s}><span><span className={'stage-key ' + stageClass(s)} />{s}</span><strong>{counts[s]}</strong><small>{stats?.total ? Math.round(counts[s] / stats.total * 100) : 0}%</small></div>)}</div></section>
              <section className="surface upcoming-card"><div className="section-heading"><div><div className="eyebrow">COMING UP</div><h2>Interviews</h2></div><span className="section-count">NEXT 7 DAYS</span></div><div className="upcoming-count"><strong>{stats?.upcoming ?? '—'}</strong><span>Scheduled this week</span></div><div className="upcoming-bottom"><CalendarDays size={18} /><p>Keep candidate profiles updated with interview dates to see them here.</p></div></section>
            </div>
            <section className="surface recent-section"><div className="section-heading"><div><div className="eyebrow">RECENT ACTIVITY</div><h2>Latest candidates</h2></div><button className="text-link" onClick={() => navigate('candidates')}>View all candidates <ArrowRight size={15} /></button></div>{table(recent)}</section>
          </>}

          {view === 'candidates' && <section className="surface directory"><div className="directory-toolbar"><div><div className="eyebrow">CANDIDATE DATABASE</div><h2>All applications <span className="count-label">{page.total}</span></h2></div><span className="list-description">Searchable, filterable and up to date</span></div><div className="filters"><label className="search-field"><Search size={17} /><input aria-label="Search candidates" placeholder="Search name, email, role or skill…" value={search} onChange={e => setSearch(e.target.value)} /></label><label className="filter-select"><SlidersHorizontal size={16} /><select aria-label="Filter by stage" value={stage} onChange={e => setStage(e.target.value)}><option value="">All stages</option>{STAGES.map(s => <option key={s}>{s}</option>)}</select></label><label className="filter-select"><BriefcaseBusiness size={16} /><select aria-label="Filter by role" value={role} onChange={e => setRole(e.target.value)}><option value="">All roles</option>{stats?.roles.map(r => <option key={r}>{r}</option>)}</select></label><label className="filter-skill"><input aria-label="Filter by skill" placeholder="Skill..." value={skill} onChange={e => setSkill(e.target.value)} /></label>{(search || stage || role || skill) && <button className="button button-reset" onClick={() => { setSearch(''); setStage(''); setRole(''); setSkill(''); }}><FilterX size={15} /> Reset</button>}</div>{loading ? <div className="loading-state">Loading candidates…</div> : table(page.items)}<div className="pagination"><span>Showing {page.total ? (page.page - 1) * page.limit + 1 : 0}–{Math.min(page.page * page.limit, page.total)} of {page.total} applicants</span><div><button className="icon-button" aria-label="Previous page" disabled={pageNumber <= 1} onClick={() => setPageNumber(p => p - 1)}><ChevronLeft size={18} /></button><span>Page {page.page} of {page.pages}</span><button className="icon-button" aria-label="Next page" disabled={pageNumber >= page.pages} onClick={() => setPageNumber(p => p + 1)}><ChevronRight size={18} /></button></div></div></section>}

          {view === 'pipeline' && <><div className="board-toolbar"><div className="board-hint"><KanbanSquare size={18} /> Drag cards or use the stage selector to move candidates</div><span>{board.length} candidates in pipeline</span></div>{boardLoading ? <div className="loading-state">Loading pipeline…</div> : <div className="board">{STAGES.map(s => <section className="board-column" key={s} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const moving = board.find(c => c.id === draggedId); if (moving) void changeStage(moving, s).catch(err => setError(err.message)); setDraggedId(''); }}><div className="column-heading"><span className={'stage-key ' + stageClass(s)} /><h3>{s}</h3><span>{board.filter(c => c.stage === s).length}</span></div><div className="board-cards">{board.filter(c => c.stage === s).map(c => <article key={c.id} className={'board-card' + (draggedId === c.id ? ' dragging' : '')} draggable onDragStart={() => setDraggedId(c.id)} onDragEnd={() => setDraggedId('')}><button className="board-person" onClick={() => void openProfile(c)}><Avatar name={c.name} /><span><strong>{c.name}</strong><small>{c.role}</small></span><ArrowUpRight size={15} /></button><div className="board-skills">{c.skills.slice(0, 2).map(skill => <span className="skill" key={skill}>{skill}</span>)}</div><div className="board-card-bottom"><span><Clock3 size={13} /> {shortDate(c.updatedAt)}</span><select aria-label={'Move ' + c.name + ' to stage'} value={c.stage} onChange={e => void changeStage(c, e.target.value as Stage).catch(err => setError(err.message))}>{STAGES.map(option => <option key={option}>{option}</option>)}</select></div></article>)}{board.filter(c => c.stage === s).length === 0 && <div className="empty-column">Drop candidates here</div>}</div></section>)}</div>}</>}
          <footer className="footer"><span>HIRELINE / BUILT FOR BETTER HIRING</span><span>Portfolio demonstration · MERN Stack</span></footer>
        </main>
      </div>
      {mobileNav && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      {selected && <ProfileDrawer key={selected.id} candidate={selected} onClose={() => setSelected(null)} onEdit={openEdit} onStage={changeStage} onNote={addNote} onDelete={removeCandidate} />}
      {modalOpen && <CandidateFormModal key={editing?.id || 'new'} editing={editing} onClose={() => { setModalOpen(false); setEditing(null); }} onSave={saveCandidate} />}
    </div>
  );
}
