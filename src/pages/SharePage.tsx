import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { BRANCHES, CATEGORIES } from '../data/taxonomy';
import { LevelBadge, StatusBadge } from '../components/StatusBadge';
import type { ResourceLink, UserRole } from '../types';
import { relativeTime } from '../utils/cn';
import { LINK_TYPE_SUGGESTIONS, linkTypeIcon } from '../utils/linkType';

const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'] as const;
const DURATIONS = ['Under 1 month', '1-2 months', '3-4 months', '5-6 months', 'Over 6 months'];
const COSTS = [
  'Under TSh 25,000',
  'TSh 25,000 - 150,000',
  'TSh 150,000 - 400,000',
  'TSh 400,000 - 1,500,000',
  'Above TSh 1,500,000',
];

interface LinkDraft {
  label: string;
  url: string;
  type: string;
}

/**
 * Defined at module scope on purpose: a component declared inside a page body
 * gets a new identity on every render, so React remounts it and the input inside
 * loses focus and caret position after a single keystroke.
 */
function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="m20-label mb-1.5 block">
        {label}
      </label>
      {children}
      {hint && !error && <p className="m20-muted mt-1 text-[11px]">{hint}</p>}
      {error && (
        <p className="mt-1 text-[11.5px] font-medium" style={{ color: 'var(--m20-danger)' }}>
          {error}
        </p>
      )}
    </div>
  );
}
const EMPTY_LINK: LinkDraft = { label: '', url: '', type: 'github' };

function statusText(status: string): string {
  const words = status.replace('-', ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function SharePage({ role }: { role: UserRole }) {
  const isAdmin = role === 'admin';
  const { sharedProjects, addSharedProject, updateSharedProjectStatus, sync } = useData();
  const [form, setForm] = useState({
    title: '',
    branch: '',
    category: '',
    description: '',
    difficulty: '' as '' | (typeof DIFFICULTIES)[number],
    techStack: '',
    duration: '',
    estimatedCost: '',
    authorName: '',
    authorEmail: '',
    authorBio: '',
  });
  const [links, setLinks] = useState<LinkDraft[]>([{ ...EMPTY_LINK }]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<{ title: string; id: string } | null>(null);

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [k]: e.target.value }));
      setErrors((prev) => {
        if (!prev[k]) return prev;
        const n = { ...prev };
        delete n[k];
        return n;
      });
    };

  const isValidUrl = (u: string) => {
    try {
      const url = new URL(u);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (form.title.trim().length < 6) e.title = 'Give a project title of at least 6 characters.';
    if (!form.branch) e.branch = 'Select a branch.';
    if (!form.category.trim()) e.category = 'Name the technology or subject area.';
    if (form.description.trim().length < 40)
      e.description = 'Describe the project in at least 40 characters — what it does and what you learned.';
    if (!form.difficulty) e.difficulty = 'Select a difficulty level.';
    if (!form.techStack.trim()) e.techStack = 'List the technologies you used.';
    if (!form.duration) e.duration = 'Choose how long it took.';
    if (!form.estimatedCost) e.estimatedCost = 'Choose an approximate cost.';
    if (form.authorName.trim().length < 2) e.authorName = 'Enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.authorEmail.trim()))
      e.authorEmail = 'Enter a valid email address.';

    const filled = links.filter((l) => l.url.trim() || l.label.trim());
    filled.forEach((l, i) => {
      if (!l.label.trim()) e[`link-${i}-label`] = 'Add a label.';
      if (!l.url.trim()) e[`link-${i}-url`] = 'Add a URL.';
      else if (!isValidUrl(l.url.trim())) e[`link-${i}-url`] = 'Enter a full http(s) URL.';
    });

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    const cleaned: ResourceLink[] = links
      .filter((l) => l.url.trim() && l.label.trim())
      .map((l) => ({ label: l.label.trim(), url: l.url.trim(), type: l.type }));

    const created = addSharedProject({
      title: form.title.trim(),
      branch: form.branch,
      category: form.category.trim(),
      description: form.description.trim(),
      difficulty: form.difficulty as (typeof DIFFICULTIES)[number],
      techStack: form.techStack
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      duration: form.duration,
      estimatedCost: form.estimatedCost,
      resourceLinks: cleaned,
      authorName: form.authorName.trim(),
      authorEmail: form.authorEmail.trim(),
      authorBio: form.authorBio.trim() || 'M20 community contributor',
    });

    setSubmitted({ title: created.title, id: created.id });
    setForm({
      title: '',
      branch: '',
      category: '',
      description: '',
      difficulty: '',
      techStack: '',
      duration: '',
      estimatedCost: '',
      authorName: '',
      authorEmail: '',
      authorBio: '',
    });
    setLinks([{ ...EMPTY_LINK }]);
  };

  const counts = (s: 'pending' | 'approved' | 'rejected') =>
    sharedProjects.filter((p) => p.status === s).length;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-7 sm:px-6 sm:py-9">
      <header className="m20-ticks m20-card p-5 sm:p-7">
        <p className="m20-label">Section 03 — Project Sharing Platform</p>
        <h1
          className="mt-1.5 text-[26px] leading-tight font-bold sm:text-[32px]"
          style={{ color: 'var(--m20-ink)' }}
        >
          Share a Project
        </h1>
        <p className="m20-muted mt-2 max-w-2xl text-[14px] leading-relaxed">
          Built something worth passing on? Submit it here so others can study it,
          reproduce it, or build something better. Submissions enter as{' '}
          <strong className="m20-ink-soft">pending</strong> and are reviewed before
          appearing as approved on the community board.
        </p>
      </header>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <form onSubmit={handleSubmit} noValidate className="m20-card p-5 sm:p-6">
          <p className="m20-label mb-4">Project Information</p>

          <div className="space-y-4">
            <Field id="sp-title" label="Project Title *" error={errors.title}>
              <input
                id="sp-title"
                className="m20-input"
                value={form.title}
                onChange={set('title')}
                placeholder="e.g. Low-cost air quality monitor with LoRa uplink"
                aria-invalid={!!errors.title}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="sp-branch" label="Branch *" error={errors.branch}>
                <select
                  id="sp-branch"
                  className="m20-input"
                  value={form.branch}
                  onChange={set('branch')}
                  aria-invalid={!!errors.branch}
                >
                  <option value="">Select branch…</option>
                  {BRANCHES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </Field>

              <Field id="sp-category" label="Technology / Category *" error={errors.category}>
                <input
                  id="sp-category"
                  className="m20-input"
                  list="sp-cat-list"
                  value={form.category}
                  onChange={set('category')}
                  placeholder="Start typing…"
                  aria-invalid={!!errors.category}
                />
                <datalist id="sp-cat-list">
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Field>
            </div>

            <Field
              id="sp-desc"
              label="Description *"
              error={errors.description}
              hint={`${form.description.length} characters — what it does, how it works, and what you learned.`}
            >
              <textarea
                id="sp-desc"
                rows={5}
                className="m20-input resize-y"
                value={form.description}
                onChange={set('description')}
                placeholder="Share the design decisions, the parts that worked, and the things that did not."
                aria-invalid={!!errors.description}
              />
            </Field>
          </div>

          <div className="my-5 m20-rule" />
          <p className="m20-label mb-4">Technical Details</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="sp-diff" label="Difficulty *" error={errors.difficulty}>
              <select
                id="sp-diff"
                className="m20-input"
                value={form.difficulty}
                onChange={set('difficulty')}
                aria-invalid={!!errors.difficulty}
              >
                <option value="">Select…</option>
                {DIFFICULTIES.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </Field>

            <Field id="sp-dur" label="Time Taken *" error={errors.duration}>
              <select
                id="sp-dur"
                className="m20-input"
                value={form.duration}
                onChange={set('duration')}
                aria-invalid={!!errors.duration}
              >
                <option value="">Select…</option>
                {DURATIONS.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </Field>

            <Field id="sp-cost" label="Approximate Cost *" error={errors.estimatedCost}>
              <select
                id="sp-cost"
                className="m20-input"
                value={form.estimatedCost}
                onChange={set('estimatedCost')}
                aria-invalid={!!errors.estimatedCost}
              >
                <option value="">Select…</option>
                {COSTS.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              id="sp-stack"
              label="Tech Stack *"
              error={errors.techStack}
              hint="Comma separated, e.g. ESP32, MQTT, React, PostgreSQL"
            >
              <input
                id="sp-stack"
                className="m20-input"
                value={form.techStack}
                onChange={set('techStack')}
                placeholder="ESP32, Arduino, BME280, MQTT"
                aria-invalid={!!errors.techStack}
              />
            </Field>
          </div>

          <div className="my-5 m20-rule" />
          <p className="m20-label mb-1">Resource Links</p>
          <p className="m20-muted mb-3 text-[11.5px]">
            Repository, documentation, a video walkthrough or a write-up. Add as many as
            are useful.
          </p>

          <div className="space-y-2.5">
            <datalist id="m20-link-type-suggestions">
              {LINK_TYPE_SUGGESTIONS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            {links.map((link, i) => (
              <div
                key={i}
                className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)_auto]"
              >
                <div>
                  {i === 0 ? (
                    <span className="m20-label block">Label</span>
                  ) : null}
                  <input
                    className="m20-input"
                    value={link.label}
                    onChange={(e) => {
                      const next = [...links];
                      next[i] = { ...next[i], label: e.target.value };
                      setLinks(next);
                    }}
                    placeholder="Repository"
                    aria-label={`Link ${i + 1} label`}
                  />
                  {errors[`link-${i}-label`] && (
                    <p className="mt-1 text-[11px]" style={{ color: 'var(--m20-danger)' }}>
                      {errors[`link-${i}-label`]}
                    </p>
                  )}
                </div>

                <div>
                  {i === 0 ? (
                    <span className="m20-label block">URL</span>
                  ) : null}
                  <input
                    className="m20-input"
                    value={link.url}
                    onChange={(e) => {
                      const next = [...links];
                      next[i] = { ...next[i], url: e.target.value };
                      setLinks(next);
                    }}
                    placeholder="https://github.com/you/project"
                    aria-label={`Link ${i + 1} URL`}
                  />
                  {errors[`link-${i}-url`] && (
                    <p className="mt-1 text-[11px]" style={{ color: 'var(--m20-danger)' }}>
                      {errors[`link-${i}-url`]}
                    </p>
                  )}
                </div>

                <div>
                  {i === 0 ? (
                    <span className="m20-label block">Type</span>
                  ) : null}
                  <input
                    className="m20-input"
                    list="m20-link-type-suggestions"
                    value={link.type}
                    onChange={(e) => {
                      const next = [...links];
                      next[i] = { ...next[i], type: e.target.value };
                      setLinks(next);
                    }}
                    placeholder="GitHub, video, notes…"
                    aria-label={`Link ${i + 1} type`}
                  />
                </div>

                <div className={i === 0 ? 'sm:pt-[22px]' : ''}>
                  <button
                    type="button"
                    onClick={() => setLinks(links.filter((_, j) => j !== i))}
                    disabled={links.length === 1}
                    className="m20-btn h-[38px] w-[38px] p-0"
                    title="Remove this link"
                    aria-label={`Remove link ${i + 1}`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setLinks([...links, { ...EMPTY_LINK }])}
            className="m20-btn m20-btn-sm mt-2.5"
          >
            + Add another link
          </button>

          <div className="my-5 m20-rule" />
          <p className="m20-label mb-4">Author Information</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="sp-name" label="Your Name *" error={errors.authorName}>
              <input
                id="sp-name"
                className="m20-input"
                value={form.authorName}
                onChange={set('authorName')}
                placeholder="Your name"
                autoComplete="name"
                aria-invalid={!!errors.authorName}
              />
            </Field>

            <Field id="sp-email" label="Email Address *" error={errors.authorEmail}>
              <input
                id="sp-email"
                type="email"
                className="m20-input"
                value={form.authorEmail}
                onChange={set('authorEmail')}
                placeholder="you@example.com"
                autoComplete="email"
                aria-invalid={!!errors.authorEmail}
              />
            </Field>
          </div>

          <div className="mt-4">
            <Field
              id="sp-bio"
              label="Short Bio"
              hint="Optional. A sentence about your background or what you are working on."
            >
              <textarea
                id="sp-bio"
                rows={2}
                className="m20-input resize-y"
                value={form.authorBio}
                onChange={set('authorBio')}
                placeholder="Third-year electronics student, interested in embedded systems."
              />
            </Field>
          </div>

          {submitted && (
            <div
              className="mt-5 border p-3.5"
              style={{
                borderColor: 'var(--m20-ok)',
                backgroundColor: 'var(--m20-ok-soft)',
              }}
              role="status"
            >
              <p className="text-[13px] font-semibold" style={{ color: 'var(--m20-ok)' }}>
                ✓ Submission received
              </p>
              <p className="m20-muted mt-1 text-[12.5px]">
                “{submitted.title}” is pending review. Set its status from the submissions list.
              </p>
              <p className="m20-muted mt-1 text-[12px]">
                {sync.lastEvent?.id === submitted.id && sync.lastEvent.ok
                  ? 'Also appended to the Google Sheet.'
                  : 'Queued for the Google Sheet — it will retry automatically.'}
              </p>
            </div>
          )}

          <button type="submit" className="m20-btn m20-btn-primary mt-5 w-full py-2.5">
            Submit for Review
          </button>
        </form>

        {/* submissions */}
        <aside className="m20-card flex flex-col p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <p className="m20-label">Your Submissions</p>
            <span className="m20-mono m20-muted text-[11px]">{sharedProjects.length} total</span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {(['pending', 'approved', 'rejected'] as const).map((s) => (
              <div
                key={s}
                className="m20-panel-alt border px-2 py-2 text-center"
                style={{ borderColor: 'var(--m20-line)' }}
              >
                <p
                  className="m20-mono text-[15px] leading-none font-bold"
                  style={{ color: 'var(--m20-ink)' }}
                >
                  {counts(s)}
                </p>
                <p className="m20-label mt-1 text-[8px]">{s.toUpperCase()}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 max-h-[640px] space-y-2.5 overflow-y-auto pr-1">
            {sharedProjects.length === 0 ? (
              <div
                className="m20-panel-alt border border-dashed p-8 text-center"
                style={{ borderColor: 'var(--m20-line)' }}
              >
                <p className="m20-mono text-[12px]" style={{ color: 'var(--m20-muted)' }}>
                  NOTHING SHARED YET
                </p>
                <p className="m20-muted mt-1.5 text-[12.5px]">
                  Submit a project and it will appear here.
                </p>
              </div>
            ) : (
              sharedProjects.map((p) => (
                <article
                  key={p.id}
                  className="m20-card p-3.5"
                  style={{ backgroundColor: 'var(--m20-panel-alt)' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      className="text-[13.5px] leading-snug font-bold"
                      style={{ color: 'var(--m20-ink)' }}
                    >
                      {p.title}
                    </h3>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="m20-muted mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed">
                    {p.description}
                  </p>

                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <LevelBadge level={p.difficulty} />
                    <span className="m20-badge" style={{ color: 'var(--m20-ink-soft)', borderColor: 'var(--m20-line)' }}>
                      {p.branch}
                    </span>
                    {p.techStack.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="m20-badge"
                        style={{ color: 'var(--m20-muted)', borderColor: 'var(--m20-line)' }}
                      >
                        {t}
                      </span>
                    ))}
                    {p.techStack.length > 3 && (
                      <span
                        className="m20-badge"
                        style={{ color: 'var(--m20-muted)', borderColor: 'var(--m20-line)' }}
                      >
                        +{p.techStack.length - 3}
                      </span>
                    )}
                  </div>

                  {p.resourceLinks.length > 0 && (
                    <ul className="mt-2.5 space-y-1">
                      {p.resourceLinks.map((l, i) => (
                        <li key={i}>
                          <a
                            href={l.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="m20-accent-ink inline-flex items-center gap-1.5 text-[12px] hover:underline"
                          >
                            <span aria-hidden="true">{linkTypeIcon(l.type)}</span>
                            {l.label}
                            {l.type.trim() && (
                              <span className="m20-muted">({l.type})</span>
                            )}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}

                  <p className="m20-mono m20-muted mt-2.5 text-[10.5px]">
                    {p.authorName} · {p.duration} · {relativeTime(p.createdAt)}
                  </p>

                  {isAdmin ? (
                    <div
                      className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t pt-2.5"
                      style={{ borderColor: 'var(--m20-line-soft)' }}
                    >
                      <span className="m20-label mr-1">Set status</span>
                      {(['pending', 'approved', 'rejected'] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => updateSharedProjectStatus(p.id, s)}
                          disabled={p.status === s}
                          className="m20-btn m20-btn-sm"
                          style={
                            p.status === s
                              ? { color: 'var(--m20-accent-ink)', borderColor: 'var(--m20-accent)' }
                              : undefined
                          }
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div
                      className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t pt-2.5"
                      style={{ borderColor: 'var(--m20-line-soft)' }}
                    >
                      <span className="m20-label mr-1">Status</span>
                      <span
                        className="text-[12.5px] font-semibold"
                        style={{ color: 'var(--m20-ink-soft)' }}
                      >
                        {statusText(p.status)}
                      </span>
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
