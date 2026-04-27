import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as api from './api';
import Landing from './Landing';
import './App.css';

// ─── Animation Variants ────────────────────────────────────────────────────────
const pageVariants = {
  initial: { opacity: 0, y: 15, filter: 'blur(10px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.4, ease: 'easeOut' } },
  exit: { opacity: 0, y: -15, filter: 'blur(10px)', transition: { duration: 0.3, ease: 'easeIn' } }
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.08 } }
};

const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

// ─── Icons (inline SVG) ──────────────────────────────────────────────────────
const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const ICONS = {
  dashboard: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
  template: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
  trigger: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  activity: "M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  plus: "M12 5v14 M5 12h14",
  trash: "M3 6h18 M19 6l-1 14H6L5 6 M8 6V4h8v2",
  edit: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  check: "M20 6L9 17l-5-5",
  x: "M18 6L6 18 M6 6l12 12",
  bolt: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  send: "M22 2L11 13 M22 2l-7 20-4-9-9-4 20-7z",
  refresh: "M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0 1 14.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
};

// ─── Utility ──────────────────────────────────────────────────────────────────
const timeAgo = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const initials = (name = '') => name.slice(0, 2).toUpperCase();

const AVATAR_COLORS = [
  ['#B5D4F4', '#0C447C'], ['#9FE1CB', '#085041'], ['#F5C4B3', '#712B13'],
  ['#F4C0D1', '#72243E'], ['#C0DD97', '#27500A'], ['#FAC775', '#633806'],
];
const avatarColor = (str = '') => AVATAR_COLORS[str.charCodeAt(0) % AVATAR_COLORS.length];

// ─── Shared Components ────────────────────────────────────────────────────────
function Avatar({ name }) {
  const [bg, fg] = avatarColor(name);
  return (
    <div className="avatar" style={{ background: bg, color: fg }}>{initials(name)}</div>
  );
}

function Toggle({ active, onToggle }) {
  return (
    <button className={`toggle ${active ? 'on' : 'off'}`} onClick={onToggle} title={active ? 'Disable' : 'Enable'}>
      <span className="thumb" />
    </button>
  );
}

function Badge({ type }) {
  const map = { comment: 'badge-comment', dm: 'badge-dm', story: 'badge-story', sent: 'badge-sent', failed: 'badge-failed', no_trigger: 'badge-neutral' };
  return <span className={`badge ${map[type] || 'badge-neutral'}`}>{type}</span>;
}

function StatCard({ label, value, sub, subOk }) {
  return (
    <motion.div variants={itemVariants} className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      {sub && <div className={`stat-sub ${subOk !== false ? 'ok' : 'muted'}`}>{sub}</div>}
    </motion.div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="icon-btn" onClick={onClose}><Icon d={ICONS.x} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── DASHBOARD PAGE ───────────────────────────────────────────────────────────
function Dashboard({ stats, activity, onRefresh }) {
  return (
    <motion.div className="page" variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <div className="page-header">
        <h1>Dashboard</h1>
        <button className="btn btn-ghost" onClick={onRefresh}>
          <Icon d={ICONS.refresh} size={14} /> Refresh
        </button>
      </div>

      <motion.div className="stats-grid" variants={staggerContainer} initial="initial" animate="animate">
        <StatCard label="Total messages sent" value={stats.totalSent} sub={`+${Math.floor(Math.random()*50)+10} today`} />
        <StatCard label="Comment triggers" value={stats.commentTriggered} sub={`+${Math.floor(Math.random()*25)+5} today`} />
        <StatCard label="DM auto-replies" value={stats.dmAutoReplied} sub={`+${Math.floor(Math.random()*15)+2} today`} />
        <StatCard label="Active triggers" value={`${stats.activeTriggersCount} / ${stats.totalTriggersCount}`} sub="running now" />
      </motion.div>

      <div className="section-title">Recent activity</div>
      <motion.div variants={itemVariants} initial="initial" animate="animate" className="card activity-card">
        {activity.length === 0 && <p className="empty-state">No activity yet. Waiting for comments...</p>}
        {activity.map(a => (
          <div key={a.id} className="activity-row">
            <Avatar name={a.username} />
            <div className="act-info">
              <span className="act-name">@{a.username}</span>
              <span className="act-meta">
                {a.type === 'comment' ? `Commented "${a.commentText}"` : `DM: "${a.commentText}"`}
                {a.triggerKeyword && ` → triggered "${a.triggerKeyword}"`}
              </span>
            </div>
            <div className="act-right">
              <Badge type={a.status === 'sent' ? a.type : a.status} />
              <span className="act-time">{timeAgo(a.timestamp)}</span>
            </div>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}

// ─── TEMPLATES PAGE ───────────────────────────────────────────────────────────
function Templates() {
  const [templates, setTemplates] = useState([]);
  const [modal, setModal] = useState(null); // null | 'create' | {id,name,message}
  const [form, setForm] = useState({ name: '', message: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => api.getTemplates().then(setTemplates), []);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm({ name: '', message: '' }); setModal('create'); };
  const openEdit = (t) => { setForm({ name: t.name, message: t.message }); setModal(t); };

  const save = async () => {
    if (!form.name || !form.message) return;
    setSaving(true);
    try {
      if (modal === 'create') await api.createTemplate(form);
      else await api.updateTemplate(modal.id, form);
      await load();
      setModal(null);
    } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    await api.deleteTemplate(id);
    load();
  };

  return (
    <motion.div className="page" variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <div className="page-header">
        <h1>Message templates</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          <Icon d={ICONS.plus} size={14} /> New template
        </button>
      </div>

      <motion.div className="templates-grid" variants={staggerContainer} initial="initial" animate="animate">
        {templates.map(t => (
          <motion.div variants={itemVariants} key={t.id} className="card template-card">
            <div className="template-icon"><Icon d={ICONS.template} size={18} /></div>
            <div className="template-body">
              <div className="template-name">{t.name}</div>
              <div className="template-preview">{t.message}</div>
            </div>
            <div className="template-actions">
              <button className="icon-btn" onClick={() => openEdit(t)} title="Edit"><Icon d={ICONS.edit} /></button>
              <button className="icon-btn danger" onClick={() => remove(t.id)} title="Delete"><Icon d={ICONS.trash} /></button>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {modal && (
        <Modal title={modal === 'create' ? 'New template' : 'Edit template'} onClose={() => setModal(null)}>
          <div className="modal-body">
            <label>Template name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Product link" />
            <label>Message to send</label>
            <textarea
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder="Hey! Here's the link you asked for: https://..."
              rows={5}
            />
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : <><Icon d={ICONS.check} size={14} /> Save</>}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </motion.div>
  );
}

// ─── TRIGGERS PAGE ────────────────────────────────────────────────────────────
function Triggers() {
  const [triggers, setTriggers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ keyword: '', matchType: 'exact', triggerOn: 'comment', templateId: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [t, tmpl] = await Promise.all([api.getTriggers(), api.getTemplates()]);
    setTriggers(t);
    setTemplates(tmpl);
  }, []);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm({ keyword: '', matchType: 'exact', triggerOn: 'comment', templateId: templates[0]?.id || '' });
    setModal('create');
  };

  const save = async () => {
    if (!form.keyword || !form.templateId) return;
    setSaving(true);
    try {
      if (modal === 'create') await api.createTrigger(form);
      else await api.updateTrigger(modal.id, form);
      await load();
      setModal(null);
    } finally { setSaving(false); }
  };

  const toggle = async (id) => {
    await api.toggleTrigger(id);
    load();
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this trigger?')) return;
    await api.deleteTrigger(id);
    load();
  };

  return (
    <motion.div className="page" variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <div className="page-header">
        <h1>Triggers</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          <Icon d={ICONS.plus} size={14} /> New trigger
        </button>
      </div>

      <div className="card triggers-table-card">
        <table className="triggers-table">
          <thead>
            <tr>
              <th>Keyword</th>
              <th>Match type</th>
              <th>Trigger on</th>
              <th>Template</th>
              <th>Times fired</th>
              <th>Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {triggers.length === 0 && (
              <tr><td colSpan={7} className="empty-state">No triggers yet. Create one above.</td></tr>
            )}
            {triggers.map(t => (
              <tr key={t.id}>
                <td><span className="keyword-pill">{t.keyword}</span></td>
                <td><span className="muted-text">{t.matchType}</span></td>
                <td><span className="muted-text">{t.triggerOn}</span></td>
                <td>{t.templateName}</td>
                <td className="fired-count">{t.totalFired.toLocaleString()}</td>
                <td><Toggle active={t.active} onToggle={() => toggle(t.id)} /></td>
                <td>
                  <div className="row-actions">
                    <button className="icon-btn" onClick={() => { setForm({ keyword: t.keyword, matchType: t.matchType, triggerOn: t.triggerOn, templateId: t.templateId }); setModal(t); }}><Icon d={ICONS.edit} /></button>
                    <button className="icon-btn danger" onClick={() => remove(t.id)}><Icon d={ICONS.trash} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal === 'create' ? 'New trigger' : 'Edit trigger'} onClose={() => setModal(null)}>
          <div className="modal-body">
            <label>Keyword (comment must contain / equal this)</label>
            <input value={form.keyword} onChange={e => setForm(f => ({ ...f, keyword: e.target.value.toUpperCase() }))} placeholder="e.g. LINK" />

            <label>Match type</label>
            <select value={form.matchType} onChange={e => setForm(f => ({ ...f, matchType: e.target.value }))}>
              <option value="exact">Exact match (comment = keyword only)</option>
              <option value="contains">Contains (keyword anywhere in comment)</option>
              <option value="any">Any message (catch-all default reply)</option>
            </select>

            <label>Trigger on</label>
            <select value={form.triggerOn} onChange={e => setForm(f => ({ ...f, triggerOn: e.target.value }))}>
              <option value="comment">Comment on post / reel</option>
              <option value="dm">Direct message</option>
              <option value="both">Both comment & DM</option>
            </select>

            <label>Send this template</label>
            <select value={form.templateId} onChange={e => setForm(f => ({ ...f, templateId: e.target.value }))}>
              <option value="">Select a template…</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : <><Icon d={ICONS.check} size={14} /> Save</>}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </motion.div>
  );
}

// ─── ACTIVITY LOG PAGE ────────────────────────────────────────────────────────
function ActivityLog() {
  const [activity, setActivity] = useState([]);
  const [filter, setFilter] = useState('all');

  const load = useCallback(() => api.getActivity(200).then(d => setActivity(d.data)), []);
  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'all' ? activity : activity.filter(a => a.type === filter || a.status === filter);

  return (
    <motion.div className="page" variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <div className="page-header">
        <h1>Activity log</h1>
        <div className="filter-row">
          {['all', 'comment', 'dm', 'sent', 'failed'].map(f => (
            <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
      </div>

      <div className="card">
        <table className="activity-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Event</th>
              <th>Comment / message</th>
              <th>Trigger</th>
              <th>Template</th>
              <th>Status</th>
              <th>Provider</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={8} className="empty-state">No activity yet.</td></tr>}
            {filtered.map(a => (
              <tr key={a.id}>
                <td><div className="user-cell"><Avatar name={a.username} /><span>@{a.username}</span></div></td>
                <td><Badge type={a.type} /></td>
                <td className="comment-cell" title={a.commentText}>{a.commentText?.slice(0, 40)}{a.commentText?.length > 40 ? '…' : ''}</td>
                <td>{a.triggerKeyword ? <span className="keyword-pill small">{a.triggerKeyword}</span> : <span className="muted-text">—</span>}</td>
                <td><span className="muted-text">{a.templateName || '—'}</span></td>
                <td><Badge type={a.status} /></td>
                <td><span className="muted-text">{a.provider || '—'}</span></td>
                <td className="muted-text">{timeAgo(a.timestamp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

// ─── SETTINGS PAGE ────────────────────────────────────────────────────────────
function Settings() {
  const [testForm, setTestForm] = useState({ commentText: 'LINK', commenterUsername: 'test_user', commenterId: '' });
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const runTest = async () => {
    setTesting(true);
    try {
      const r = await api.testComment(testForm);
      setTestResult(r);
    } catch (e) {
      setTestResult({ error: e.message });
    } finally { setTesting(false); }
  };

  return (
    <motion.div className="page" variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <div className="page-header"><h1>Settings & setup</h1></div>

      <div className="settings-grid">
        <div className="card settings-card">
          <div className="settings-card-title">Meta API credentials</div>
          <div className="settings-card-sub">Set these in your <code>.env</code> file in the backend folder</div>
          <div className="env-block">
            <div className="env-row"><span className="env-key">META_APP_ID</span><span className="env-desc">From Meta Developer Console → Your App</span></div>
            <div className="env-row"><span className="env-key">META_APP_SECRET</span><span className="env-desc">From App → Settings → Basic</span></div>
            <div className="env-row"><span className="env-key">META_ACCESS_TOKEN</span><span className="env-desc">Long-lived Page Access Token</span></div>
            <div className="env-row"><span className="env-key">META_INSTAGRAM_ACCOUNT_ID</span><span className="env-desc">IG Business Account ID</span></div>
            <div className="env-row"><span className="env-key">META_WEBHOOK_VERIFY_TOKEN</span><span className="env-desc">Any secret string you choose</span></div>
          </div>
        </div>

        <div className="card settings-card">
          <div className="settings-card-title">ManyChat API (backup)</div>
          <div className="settings-card-sub">Used when Meta DM send fails</div>
          <div className="env-block">
            <div className="env-row"><span className="env-key">MANYCHAT_API_KEY</span><span className="env-desc">ManyChat → Settings → API</span></div>
            <div className="env-row"><span className="env-key">MANYCHAT_PAGE_ID</span><span className="env-desc">Your ManyChat Page ID</span></div>
          </div>
        </div>

        <div className="card settings-card">
          <div className="settings-card-title">Webhook URL</div>
          <div className="settings-card-sub">Register this in Meta Developer Console → Webhooks</div>
          <div className="webhook-url">
            <code>https://your-domain.com/webhook</code>
          </div>
          <div className="settings-steps">
            <div className="step"><span className="step-num">1</span>Go to <strong>developers.facebook.com</strong></div>
            <div className="step"><span className="step-num">2</span>Your App → Webhooks → Add subscription</div>
            <div className="step"><span className="step-num">3</span>Object: <code>instagram</code>, fields: <code>comments</code>, <code>messages</code></div>
            <div className="step"><span className="step-num">4</span>Verify token = <code>META_WEBHOOK_VERIFY_TOKEN</code> from your .env</div>
            <div className="step"><span className="step-num">5</span>Use ngrok for local testing: <code>ngrok http 4000</code></div>
          </div>
        </div>

        <div className="card settings-card">
          <div className="settings-card-title">Test automation</div>
          <div className="settings-card-sub">Simulate a comment without a real webhook</div>
          <div className="test-form">
            <label>Comment text</label>
            <input value={testForm.commentText} onChange={e => setTestForm(f => ({ ...f, commentText: e.target.value }))} placeholder="e.g. LINK" />
            <label>Commenter username</label>
            <input value={testForm.commenterUsername} onChange={e => setTestForm(f => ({ ...f, commenterUsername: e.target.value }))} placeholder="test_user" />
            <label>Commenter IG user ID (optional)</label>
            <input value={testForm.commenterId} onChange={e => setTestForm(f => ({ ...f, commenterId: e.target.value }))} placeholder="leave blank for mock" />
            <button className="btn btn-primary" onClick={runTest} disabled={testing}>
              <Icon d={ICONS.send} size={14} /> {testing ? 'Testing…' : 'Run test'}
            </button>
          </div>
          {testResult && (
            <div className={`test-result ${testResult.error ? 'error' : testResult.sent ? 'success' : 'warn'}`}>
              <pre>{JSON.stringify(testResult, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── APP SHELL ────────────────────────────────────────────────────────────────
const PAGES = ['dashboard', 'templates', 'triggers', 'activity', 'settings'];

export default function App() {
  const [view, setView] = useState('landing');
  const [page, setPage] = useState('dashboard');
  const [stats, setStats] = useState({ totalSent: 0, commentTriggered: 0, dmAutoReplied: 0, failedSends: 0, activeTriggersCount: 0, totalTriggersCount: 0 });
  const [activity, setActivity] = useState([]);

  const loadDashboard = useCallback(async () => {
    const [s, a] = await Promise.all([api.getStats(), api.getActivity(20)]);
    setStats(s);
    setActivity(a.data || []);
  }, []);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  if (view === 'landing') {
    return (
      <div className="app-wrapper">
        <video className="global-video-bg" src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260228_065522_522e2295-ba22-457e-8fdb-fbcd68109c73.mp4" autoPlay loop muted playsInline />
        <Landing onEnterApp={() => setView('app')} />
      </div>
    );
  }

  return (
    <div className="app-wrapper">
      <video className="global-video-bg" src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260228_065522_522e2295-ba22-457e-8fdb-fbcd68109c73.mp4" autoPlay loop muted playsInline />
      <div className="app">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <div className="brand-dot" />
            <span style={{ fontFamily: 'Barlow', fontWeight: 700, fontSize: '18px', letterSpacing: '-0.5px' }}>InstaAuto</span>
          </div>
          <nav>
            {PAGES.map(p => (
              <button key={p} className={`nav-item ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>
                <Icon d={ICONS[p === 'activity' ? 'activity' : p]} size={16} />
                <span>{p === 'activity' ? 'Activity log' : p.charAt(0).toUpperCase() + p.slice(1)}</span>
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div className="status-dot" />
            <span>Backend connected</span>
          </div>
        </aside>

        <main className="main">
          <AnimatePresence mode="wait">
            {page === 'dashboard' && <Dashboard key="dashboard" stats={stats} activity={activity} onRefresh={loadDashboard} />}
            {page === 'templates' && <Templates key="templates" />}
            {page === 'triggers' && <Triggers key="triggers" />}
            {page === 'activity' && <ActivityLog key="activity" />}
            {page === 'settings' && <Settings key="settings" />}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
