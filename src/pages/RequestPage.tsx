import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { BRANCHES, CATEGORIES } from '../data/taxonomy';
import { StatusBadge } from '../components/StatusBadge';
import type { Status } from '../components/StatusBadge';
import type { UserRole } from '../types';
import { formatDateTime, relativeTime } from '../utils/cn';

const EXPERIENCE = ['First-time builder', 'Some hobby experience', 'College student', 'Working professional'];
const TIMELINES = ['2-4 weeks', '1-2 months', '3-6 months', 'Academic semester', 'No fixed deadline'];
const BUDGETS = [
  'Under TSh 25,000',
  'TSh 25,000 - 150,000',
  'TSh 150,000 - 400,000',
  'TSh 400,000 - 1,500,000',
  'Above TSh 1,500,000',
];

interface Errors {
  [k: string]: string;
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
  children,
  hint,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
  hint?: string;
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

function statusText(status: Status): string {
  const words = status.replace('-', ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function RequestPage({ role }: { role: UserRole }) {
  const isAdmin = role === 'admin';
  const { requests, addRequest, updateRequestStatus, sync } = useData();
  const [form, setForm] = useState({
    title: '',
    branch: '',
    category: '',
    description: '',
    experience: '',
    timeline: '',
    budget: '',
    name: '',
    email: '',
  });
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState<{ title: string; id: string } | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((prev) => {
      if (!prev[k]) return prev;
      const n = { ...prev };
      delete n[k];
      return n;
    });
  };

  const validate = (): boolean => {
    const e: Errors = {};
    if (form.title.trim().length < 6) e.title = 'Give a project title of at least 6 characters.';
    if (!form.branch) e.branch = 'Select a branch.';
    if (!form.category.trim()) e.category = 'Name the technology or subject area.';
    if (form.description.trim().length < 30)
      e.description = 'Describe the project in at least 30 characters so it can be assessed.';
    if (!form.experience) e.experience = 'Tell us your experience level.';
    if (!form.timeline) e.timeline = 'Choose a timeline.';
    if (!form.budget) e.budget = 'Choose a budget range.';
    if (form.name.trim().length < 2) e.name = 'Enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim()))
      e.email = 'Enter a valid email address.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    const created = addRequest({
      title: form.title.trim(),
      branch: form.branch,
      category: form.category.trim(),
      description: form.description.trim(),
      experience: form.experience,
      timeline: form.timeline,
      budget: form.budget,
      email: form.email.trim(),
      name: form.name.trim(),
    });
    setSubmitted({ title: created.title, id: created.id });
    setForm({
      title: '',
      branch: '',
      category: '',
      description: '',
      experience: '',
      timeline: '',
      budget: '',
      name: '',
      email: '',
    });
  };

  const counts = (s: Status) => requests.filter((r) => r.status === s).length;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-7 sm:px-6 sm:py-9">
      <header className="m20-ticks m20-card p-5 sm:p-7">
        <p className="m20-label">Section 02 — Project Request Portal</p>
        <h1
          className="mt-1.5 text-[26px] leading-tight font-bold sm:text-[32px]"
          style={{ color: 'var(--m20-ink)' }}
        >
          Request a Project
        </h1>
        <p className="m20-muted mt-2 max-w-2xl text-[14px] leading-relaxed">
          Describe what you want to build and we will review it, check feasibility and
          availability, and get back to you with guidance on sourcing, scope and a build
          plan. Requests are stored in this browser and appended to the project
          Google Sheet, where status changes are written back to the same row.
        </p>
      </header>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        {/* form */}
        <form onSubmit={handleSubmit} noValidate className="m20-card p-5 sm:p-6">
          <p className="m20-label mb-4">Request Form</p>

          <div className="space-y-4">
            <Field id="rq-title" label="Project Title *" error={errors.title}>
              <input
                id="rq-title"
                className="m20-input"
                value={form.title}
                onChange={set('title')}
                placeholder="e.g. Solar-powered smart irrigation controller"
                aria-invalid={!!errors.title}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="rq-branch" label="Branch *" error={errors.branch}>
                <select
                  id="rq-branch"
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

              <Field
                id="rq-category"
                label="Technology / Category *"
                error={errors.category}
                hint="e.g. IoT, PLC, Machine Vision, CAD"
              >
                <input
                  id="rq-category"
                  className="m20-input"
                  list="rq-cat-list"
                  value={form.category}
                  onChange={set('category')}
                  placeholder="Start typing…"
                  aria-invalid={!!errors.category}
                />
                <datalist id="rq-cat-list">
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Field>
            </div>

            <Field
              id="rq-desc"
              label="Project Description *"
              error={errors.description}
              hint={`${form.description.length} characters — what it should do, and any constraints.`}
            >
              <textarea
                id="rq-desc"
                rows={5}
                className="m20-input resize-y"
                value={form.description}
                onChange={set('description')}
                placeholder="Explain the intended function, where it will be used, and anything you have already tried."
                aria-invalid={!!errors.description}
              />
            </Field>
          </div>

          <div className="my-5 m20-rule" />
          <p className="m20-label mb-4">Your Background</p>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="rq-exp" label="Experience *" error={errors.experience}>
              <select
                id="rq-exp"
                className="m20-input"
                value={form.experience}
                onChange={set('experience')}
                aria-invalid={!!errors.experience}
              >
                <option value="">Select…</option>
                {EXPERIENCE.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </Field>

            <Field id="rq-time" label="Timeline *" error={errors.timeline}>
              <select
                id="rq-time"
                className="m20-input"
                value={form.timeline}
                onChange={set('timeline')}
                aria-invalid={!!errors.timeline}
              >
                <option value="">Select…</option>
                {TIMELINES.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </Field>

            <Field id="rq-budget" label="Budget *" error={errors.budget}>
              <select
                id="rq-budget"
                className="m20-input"
                value={form.budget}
                onChange={set('budget')}
                aria-invalid={!!errors.budget}
              >
                <option value="">Select…</option>
                {BUDGETS.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="my-5 m20-rule" />
          <p className="m20-label mb-4">Contact</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="rq-name" label="Full Name *" error={errors.name}>
              <input
                id="rq-name"
                className="m20-input"
                value={form.name}
                onChange={set('name')}
                placeholder="Your name"
                autoComplete="name"
                aria-invalid={!!errors.name}
              />
            </Field>

            <Field id="rq-email" label="Email Address *" error={errors.email}>
              <input
                id="rq-email"
                type="email"
                className="m20-input"
                value={form.email}
                onChange={set('email')}
                placeholder="you@example.com"
                autoComplete="email"
                aria-invalid={!!errors.email}
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
                ✓ Request submitted
              </p>
              <p className="m20-muted mt-1 text-[12.5px]">
                “{submitted.title}” is now queued for review. Track it in the list on the right.
              </p>
              <p className="m20-muted mt-1 text-[12px]">
                {sync.lastEvent?.id === submitted.id && sync.lastEvent.ok
                  ? 'Also appended to the Google Sheet.'
                  : 'Queued for the Google Sheet — it will retry automatically.'}
              </p>
            </div>
          )}

          <button type="submit" className="m20-btn m20-btn-primary mt-5 w-full py-2.5">
            Submit Request
          </button>
        </form>

        {/* recent requests */}
        <aside className="m20-card flex flex-col p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <p className="m20-label">Recent Requests</p>
            <span className="m20-mono m20-muted text-[11px]">{requests.length} total</span>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {(['pending', 'under-review', 'approved', 'rejected'] as Status[]).map((s) => (
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
                <p className="m20-label mt-1 text-[8px]">
                  {s === 'under-review' ? 'REVIEW' : s.toUpperCase()}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 max-h-[640px] space-y-2.5 overflow-y-auto pr-1">
            {requests.length === 0 ? (
              <div className="m20-panel-alt border border-dashed p-8 text-center" style={{ borderColor: 'var(--m20-line)' }}>
                <p className="m20-mono text-[12px]" style={{ color: 'var(--m20-muted)' }}>
                  NO REQUESTS YET
                </p>
                <p className="m20-muted mt-1.5 text-[12.5px]">
                  Submit the form to create your first request.
                </p>
              </div>
            ) : (
              requests.map((r) => (
                <article
                  key={r.id}
                  className="m20-card p-3.5"
                  style={{ backgroundColor: 'var(--m20-panel-alt)' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      className="text-[13.5px] leading-snug font-bold"
                      style={{ color: 'var(--m20-ink)' }}
                    >
                      {r.title}
                    </h3>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="m20-muted mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed">
                    {r.description}
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <span className="m20-badge" style={{ color: 'var(--m20-ink-soft)', borderColor: 'var(--m20-line)' }}>
                      {r.branch}
                    </span>
                    <span className="m20-badge" style={{ color: 'var(--m20-muted)', borderColor: 'var(--m20-line)' }}>
                      {r.category}
                    </span>
                    <span className="m20-badge" style={{ color: 'var(--m20-muted)', borderColor: 'var(--m20-line)' }}>
                      {r.timeline}
                    </span>
                    <span className="m20-badge" style={{ color: 'var(--m20-muted)', borderColor: 'var(--m20-line)' }}>
                      {r.budget}
                    </span>
                  </div>
                  <p className="m20-mono m20-muted mt-2.5 text-[10.5px]">
                    {r.name} · {r.email} · {relativeTime(r.createdAt)}
                  </p>
                  <p className="m20-muted mt-1 text-[11px]">
                    Updated {formatDateTime(r.updatedAt)}
                  </p>

                  {/* reviewer controls — status changes are an admin action */}
                  {isAdmin ? (
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t pt-2.5" style={{ borderColor: 'var(--m20-line-soft)' }}>
                      <span className="m20-label mr-1">Set status</span>
                      {(['pending', 'under-review', 'approved', 'rejected'] as Status[]).map((s) => (
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
                  ) : (
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t pt-2.5" style={{ borderColor: 'var(--m20-line-soft)' }}>
                      <span className="m20-label mr-1">Status</span>
                      <span
                        className="text-[12.5px] font-semibold"
                        style={{ color: 'var(--m20-ink-soft)' }}
                      >
                        {statusText(r.status)}
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
