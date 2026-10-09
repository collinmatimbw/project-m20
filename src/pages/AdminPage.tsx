import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { StatusBadge } from '../components/StatusBadge';
import type { Status } from '../components/StatusBadge';
import type { Project, SharedProject } from '../types';
import { BRANCHES, CATEGORIES, LEVELS } from '../data/taxonomy';
import { formatDateTime, relativeTime } from '../utils/cn';

type Section = 'overview' | 'requests' | 'shares' | 'post';

const REQUEST_STATUSES: Status[] = ['pending', 'under-review', 'approved', 'rejected'];
const SHARE_STATUSES: SharedProject['status'][] = ['pending', 'approved', 'rejected'];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AdminPage() {
  const {
    requests,
    sharedProjects,
    updateRequestStatus,
    updateSharedProjectStatus,
    customProjects,
    addCustomProject,
    removeCustomProject,
  } = useData();
  const [section, setSection] = useState<Section>('overview');
  const [filter, setFilter] = useState<Status | 'all'>('all');

  const [post, setPost] = useState({
    title: '',
    branch: BRANCHES[0] as Project['branch'],
    category: CATEGORIES[0],
    level: LEVELS[0] as Project['level'],
    summary: '',
    date: today(),
  });
  const [postError, setPostError] = useState('');
  const [posted, setPosted] = useState<string | null>(null);

  const setPostField = (patch: Partial<typeof post>) => {
    setPost((prev) => ({ ...prev, ...patch }));
    setPostError('');
  };

  const submitPost = (e: React.FormEvent) => {
    e.preventDefault();
    const title = post.title.trim();
    if (!title) {
      setPostError('Give the project a title.');
      return;
    }
    if (!post.category) {
      setPostError('Choose a category.');
      return;
    }
    const entry = addCustomProject({ ...post, title });
    setPost((prev) => ({ ...prev, title: '', summary: '' }));
    setPosted(entry.title);
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending').length;
  const pendingShares = sharedProjects.filter((s) => s.status === 'pending').length;
  const approvedRequests = requests.filter((r) => r.status === 'approved').length;
  const approvedShares = sharedProjects.filter((s) => s.status === 'approved').length;

  const sections: { id: Section; label: string; count: number }[] = [
    { id: 'overview', label: 'Overview', count: 0 },
    { id: 'requests', label: 'Requests', count: requests.length },
    { id: 'shares', label: 'Shared Builds', count: sharedProjects.length },
    { id: 'post', label: 'Post Project', count: customProjects.length },
  ];

  const visibleRequests = (filter === 'all' ? requests : requests.filter((r) => r.status === filter))
    .slice()
    .sort((a, b) => (a.status === 'pending' ? -1 : 1) - (b.status === 'pending' ? -1 : 1));

  const visibleShares = (filter === 'all' ? sharedProjects : sharedProjects.filter((s) => s.status === filter))
    .slice()
    .sort((a, b) => (a.status === 'pending' ? -1 : 1) - (b.status === 'pending' ? -1 : 1));

  const filterBar = (
    <div className="mt-4 flex flex-wrap items-center gap-1.5">
      <span className="m20-label mr-1">Filter</span>
      {(['all', 'pending', 'under-review', 'approved', 'rejected'] as const).map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => setFilter(s)}
          className="m20-btn m20-btn-sm"
          style={
            filter === s
              ? { color: 'var(--m20-accent-ink)', borderColor: 'var(--m20-accent)' }
              : undefined
          }
        >
          {s === 'all' ? 'All' : s === 'under-review' ? 'Review' : s}
        </button>
      ))}
    </div>
  );

  const empty = (msg: string) => (
    <div
      className="m20-panel-alt border border-dashed p-8 text-center"
      style={{ borderColor: 'var(--m20-line)' }}
    >
      <p className="m20-mono text-[12px]" style={{ color: 'var(--m20-muted)' }}>
        NOTHING HERE YET
      </p>
      <p className="m20-muted mt-1.5 text-[12.5px]">{msg}</p>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-7 sm:px-6 sm:py-9">
      <header className="m20-ticks m20-card p-5 sm:p-7">
        <p className="m20-label">Section 05 — Administration</p>
        <h1
          className="mt-1.5 text-[26px] leading-tight font-bold sm:text-[32px]"
          style={{ color: 'var(--m20-ink)' }}
        >
          Admin Console
        </h1>
        <p className="m20-muted mt-2 max-w-2xl text-[14px] leading-relaxed">
          Triage everything submitted through the Request and Share portals. Status
          changes are written back to the same storage the submitter sees, and pushed to
          the Google Sheet.
        </p>
      </header>

      <nav
        className="mt-5 border-b"
        style={{ borderColor: 'var(--m20-line)' }}
        aria-label="Admin sections"
      >
        <ul className="-mb-px flex flex-wrap gap-1">
          {sections.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setSection(s.id)}
                aria-current={section === s.id ? 'page' : undefined}
                className="border-b-2 px-4 py-2.5 text-[12px] font-semibold tracking-[0.1em] uppercase transition-colors"
                style={{
                  color: section === s.id ? 'var(--m20-accent-ink)' : 'var(--m20-muted)',
                  borderColor: section === s.id ? 'var(--m20-accent)' : 'transparent',
                }}
              >
                {s.label}
                {s.count > 0 && (
                  <span className="m20-mono ml-2 text-[10px] opacity-60">({s.count})</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {section === 'overview' && (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Requests pending', value: pendingRequests, tone: 'var(--m20-warn)' },
            { label: 'Requests approved', value: approvedRequests, tone: 'var(--m20-ok)' },
            { label: 'Builds pending', value: pendingShares, tone: 'var(--m20-warn)' },
            { label: 'Builds approved', value: approvedShares, tone: 'var(--m20-ok)' },
          ].map((c) => (
            <div key={c.label} className="m20-card p-5">
              <p className="m20-label">{c.label}</p>
              <p
                className="m20-mono mt-2 text-[34px] leading-none font-bold"
                style={{ color: c.value > 0 ? c.tone : 'var(--m20-ink)' }}
              >
                {c.value}
              </p>
              <p className="m20-muted mt-2 text-[12px]">
                {c.label.toLowerCase().includes('request')
                  ? `of ${requests.length} total`
                  : `of ${sharedProjects.length} total`}
              </p>
            </div>
          ))}

          <div className="sm:col-span-2 lg:col-span-4">
            <p className="m20-label mb-2">Needs attention</p>
            {pendingRequests + pendingShares === 0 ? (
              <div
                className="m20-card p-5"
                style={{ borderColor: 'var(--m20-ok)' }}
              >
                <p className="text-[13px] font-semibold" style={{ color: 'var(--m20-ok)' }}>
                  ✓ Queue clear
                </p>
                <p className="m20-muted mt-1 text-[12.5px]">
                  No pending requests or shared builds right now.
                </p>
              </div>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {pendingRequests > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilter('pending');
                      setSection('requests');
                    }}
                    className="m20-card m20-card-hover p-4 text-left"
                  >
                    <p className="text-[13px] font-bold" style={{ color: 'var(--m20-ink)' }}>
                      {pendingRequests} request{pendingRequests > 1 ? 's' : ''} awaiting review
                    </p>
                    <p className="m20-muted mt-1 text-[12px]">Tap to open the triage queue →</p>
                  </button>
                )}
                {pendingShares > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilter('pending');
                      setSection('shares');
                    }}
                    className="m20-card m20-card-hover p-4 text-left"
                  >
                    <p className="text-[13px] font-bold" style={{ color: 'var(--m20-ink)' }}>
                      {pendingShares} shared build{pendingShares > 1 ? 's' : ''} awaiting review
                    </p>
                    <p className="m20-muted mt-1 text-[12px]">Tap to open the triage queue →</p>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {section === 'requests' && (
        <div className="mt-5">
          {filterBar}
          <div className="mt-4 grid gap-2.5">
            {visibleRequests.length === 0
              ? empty('Submitted project requests will appear here for triage.')
              : visibleRequests.map((r) => (
                  <article key={r.id} className="m20-card p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="text-[15px] leading-snug font-bold" style={{ color: 'var(--m20-ink)' }}>
                          {r.title}
                        </h3>
                        <p className="m20-mono m20-muted mt-1 text-[10.5px]">
                          {r.name} · {r.email} · {relativeTime(r.createdAt)}
                        </p>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>

                    <p className="m20-muted mt-2.5 text-[13px] leading-relaxed">{r.description}</p>

                    <dl className="mt-3 grid gap-x-5 gap-y-2 sm:grid-cols-3">
                      {[
                        ['Branch', r.branch],
                        ['Category', r.category],
                        ['Experience', r.experience],
                        ['Timeline', r.timeline],
                        ['Budget', r.budget],
                        ['Submitted', formatDateTime(r.createdAt)],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <dt className="m20-label">{k}</dt>
                          <dd className="mt-0.5 text-[12.5px]" style={{ color: 'var(--m20-ink-soft)' }}>
                            {v}
                          </dd>
                        </div>
                      ))}
                    </dl>

                    <div
                      className="mt-3.5 flex flex-wrap items-center gap-1.5 border-t pt-3"
                      style={{ borderColor: 'var(--m20-line-soft)' }}
                    >
                      <span className="m20-label mr-1">Set status</span>
                      {REQUEST_STATUSES.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => updateRequestStatus(r.id, s)}
                          disabled={r.status === s}
                          className="m20-btn m20-btn-sm"
                          style={
                            r.status === s
                              ? { color: 'var(--m20-accent-ink)', borderColor: 'var(--m20-accent)' }
                              : undefined
                          }
                        >
                          {s === 'under-review' ? 'Review' : s}
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
          </div>
        </div>
      )}

      {section === 'shares' && (
        <div className="mt-5">
          {filterBar}
          <div className="mt-4 grid gap-2.5">
            {visibleShares.length === 0
              ? empty('Shared builds will appear here once contributors submit them.')
              : visibleShares.map((s) => (
                  <article key={s.id} className="m20-card p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="text-[15px] leading-snug font-bold" style={{ color: 'var(--m20-ink)' }}>
                          {s.title}
                        </h3>
                        <p className="m20-mono m20-muted mt-1 text-[10.5px]">
                          {s.authorName} · {s.authorEmail} · {relativeTime(s.createdAt)}
                        </p>
                      </div>
                      <StatusBadge status={s.status} />
                    </div>

                    <p className="m20-muted mt-2.5 text-[13px] leading-relaxed">{s.description}</p>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="m20-badge" style={{ color: 'var(--m20-ink-soft)', borderColor: 'var(--m20-line)' }}>
                        {s.branch}
                      </span>
                      <span className="m20-badge" style={{ color: 'var(--m20-muted)', borderColor: 'var(--m20-line)' }}>
                        {s.difficulty}
                      </span>
                      <span className="m20-badge" style={{ color: 'var(--m20-muted)', borderColor: 'var(--m20-line)' }}>
                        {s.duration}
                      </span>
                      <span className="m20-badge" style={{ color: 'var(--m20-muted)', borderColor: 'var(--m20-line)' }}>
                        {s.estimatedCost}
                      </span>
                      {s.techStack.map((t) => (
                        <span
                          key={t}
                          className="m20-badge"
                          style={{ color: 'var(--m20-accent-ink)', borderColor: 'var(--m20-accent)' }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>

                    {s.resourceLinks.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {s.resourceLinks.map((l) => (
                          <li key={l.url} className="m20-mono text-[11.5px]">
                            <span style={{ color: 'var(--m20-muted)' }}>{l.type}</span>{' '}
                            <a
                              href={l.url}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: 'var(--m20-accent-ink)' }}
                            >
                              {l.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div
                      className="mt-3.5 flex flex-wrap items-center gap-1.5 border-t pt-3"
                      style={{ borderColor: 'var(--m20-line-soft)' }}
                    >
                      <span className="m20-label mr-1">Set status</span>
                      {SHARE_STATUSES.map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => updateSharedProjectStatus(s.id, st)}
                          disabled={s.status === st}
                          className="m20-btn m20-btn-sm"
                          style={
                            s.status === st
                              ? { color: 'var(--m20-accent-ink)', borderColor: 'var(--m20-accent)' }
                              : undefined
                          }
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
          </div>
        </div>
      )}

      {section === 'post' && (
        <div className="mt-5">
          <div className="m20-card p-5 sm:p-7">
            <h2 className="text-[18px] font-bold" style={{ color: 'var(--m20-ink)' }}>
              Post a new project
            </h2>
            <p className="m20-muted mt-1.5 max-w-3xl text-[13px] leading-relaxed">
              Fill in the details below and the project will appear in the index for all
              users. The specification is generated from the template that best matches
              the category; you can override the overview with your own summary.
            </p>
            {posted && (
              <div
                className="mt-4 border p-3"
                style={{
                  borderColor: 'var(--m20-ok)',
                  backgroundColor: 'var(--m20-ok-soft)',
                }}
                role="status"
              >
                <p className="text-[13px] font-semibold" style={{ color: 'var(--m20-ok)' }}>
                  ✓ Posted — “{posted}” now appears in the project index.
                </p>
              </div>
            )}
            <form onSubmit={submitPost} noValidate className="mt-5 space-y-4">
              {postError && (
                <div
                  className="border p-3"
                  style={{
                    borderColor: 'var(--m20-danger)',
                    backgroundColor: 'var(--m20-danger-soft)',
                  }}
                  role="alert"
                >
                  <p className="text-[12.5px] font-semibold" style={{ color: 'var(--m20-danger)' }}>
                    {postError}
                  </p>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="post-title" className="m20-label mb-1.5 block">
                    Title
                  </label>
                  <input
                    id="post-title"
                    type="text"
                    className="m20-input"
                    value={post.title}
                    onChange={(e) => setPostField({ title: e.target.value })}
                    placeholder="e.g. Solar MPPT Charge Controller"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="post-branch" className="m20-label mb-1.5 block">
                    Branch
                  </label>
                  <select
                    id="post-branch"
                    className="m20-input"
                    value={post.branch}
                    onChange={(e) =>
                      setPostField({ branch: e.target.value as Project['branch'] })
                    }
                  >
                    {BRANCHES.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="post-category" className="m20-label mb-1.5 block">
                    Category
                  </label>
                  <select
                    id="post-category"
                    className="m20-input"
                    value={post.category}
                    onChange={(e) => setPostField({ category: e.target.value })}
                  >
                    <option value="">— choose —</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="post-level" className="m20-label mb-1.5 block">
                    Level
                  </label>
                  <select
                    id="post-level"
                    className="m20-input"
                    value={post.level}
                    onChange={(e) =>
                      setPostField({ level: e.target.value as Project['level'] })
                    }
                  >
                    {LEVELS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="post-date" className="m20-label mb-1.5 block">
                    Listed date
                  </label>
                  <input
                    id="post-date"
                    type="date"
                    className="m20-input"
                    value={post.date}
                    onChange={(e) => setPostField({ date: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="post-summary" className="m20-label mb-1.5 block">
                    Summary (optional — shown as the spec overview)
                  </label>
                  <textarea
                    id="post-summary"
                    className="m20-input"
                    rows={4}
                    value={post.summary}
                    onChange={(e) => setPostField({ summary: e.target.value })}
                    placeholder="A short description of what this project does and why it matters…"
                  />
                </div>
              </div>
              <button type="submit" className="m20-btn m20-btn-primary">
                Post project
              </button>
            </form>
          </div>

          {customProjects.length > 0 && (
            <div className="mt-5">
              <h2 className="text-[18px] font-bold" style={{ color: 'var(--m20-ink)' }}>
                Posted projects ({customProjects.length})
              </h2>
              <div className="mt-4 grid gap-2.5">
                {customProjects.map((p) => (
                  <article key={p.sourceId} className="m20-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="text-[15px] leading-snug font-bold" style={{ color: 'var(--m20-ink)' }}>
                          {p.title}
                        </h3>
                        <p className="m20-mono m20-muted mt-1 text-[10.5px]">
                          ID: M20-{p.sourceId} · {p.branch ?? '—'} · {p.categories[0] ?? '—'} · {p.date}
                        </p>
                      </div>
                    </div>
                    {p.summary && (
                      <p className="m20-muted mt-2 text-[13px] leading-relaxed">{p.summary}</p>
                    )}
                    <div className="mt-3.5 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => removeCustomProject(p.sourceId)}
                        className="m20-btn m20-btn-sm m20-btn-ghost"
                        style={{ color: 'var(--m20-danger)', borderColor: 'var(--m20-danger)' }}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
