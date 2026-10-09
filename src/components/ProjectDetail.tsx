import { useEffect, useMemo, useState } from 'react';
import type { Project } from '../types';
import { useData } from '../contexts/DataContext';
import { downloadProjectSpecSheet } from '../utils/pdf';
import { LevelBadge, MetaTag } from './StatusBadge';
import { ProjectImage } from './ProjectImage';
import { formatDateTime } from '../utils/cn';
import { CURRENCY, formatInrAsTSh } from '../utils/currency';

type SectionId =
  | 'overview'
  | 'problem'
  | 'objectives'
  | 'prereq'
  | 'architecture'
  | 'phases'
  | 'bom'
  | 'validation'
  | 'trouble'
  | 'extensions'
  | 'deliverables'
  | 'safety'
  | 'notes';

const TOC: { id: SectionId; label: string; code: string }[] = [
  { id: 'overview', label: 'Overview', code: '01' },
  { id: 'problem', label: 'Problem Statement', code: '02' },
  { id: 'objectives', label: 'Learning Objectives', code: '03' },
  { id: 'prereq', label: 'Prerequisites', code: '04' },
  { id: 'architecture', label: 'System Architecture', code: '05' },
  { id: 'phases', label: 'Build Phases', code: '06' },
  { id: 'bom', label: 'Bill of Materials', code: '07' },
  { id: 'validation', label: 'Validation Checklist', code: '08' },
  { id: 'trouble', label: 'Troubleshooting', code: '09' },
  { id: 'extensions', label: 'Extension Ideas', code: '10' },
  { id: 'deliverables', label: 'Deliverables', code: '11' },
  { id: 'safety', label: 'Safety Notes', code: '12' },
  { id: 'notes', label: 'Field Notes', code: '13' },
];

function SectionHead({ code, children }: { code: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline gap-2.5">
      <span className="m20-mono text-[11px] font-bold" style={{ color: 'var(--m20-accent)' }}>
        {code}
      </span>
      <h3
        className="text-[15px] font-bold tracking-[0.02em]"
        style={{ color: 'var(--m20-ink)' }}
      >
        {children}
      </h3>
      <span className="m20-rule mt-1 flex-1" />
    </div>
  );
}

function NumList({ items }: { items: string[] }) {
  return (
    <ol className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3">
          <span
            className="m20-mono mt-[3px] shrink-0 text-[10.5px] font-bold"
            style={{ color: 'var(--m20-accent)' }}
          >
            {String(i + 1).padStart(2, '0')}
          </span>
          <span className="m20-prose text-[14px]">{it}</span>
        </li>
      ))}
    </ol>
  );
}

function TickList({ items }: { items: string[] }) {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => {
        const on = checked.has(i);
        return (
          <li key={i}>
            <button
              type="button"
              onClick={() =>
                setChecked((prev) => {
                  const n = new Set(prev);
                  if (n.has(i)) n.delete(i);
                  else n.add(i);
                  return n;
                })
              }
              className="flex w-full items-start gap-2.5 rounded-[2px] px-2 py-1.5 text-left transition-colors hover:bg-[var(--m20-panel-alt)]"
            >
              <span
                className="mt-[2px] flex h-4 w-4 shrink-0 items-center justify-center border text-[10px]"
                style={{
                  borderColor: on ? 'var(--m20-accent)' : 'var(--m20-line)',
                  backgroundColor: on ? 'var(--m20-accent)' : 'transparent',
                  color: '#fff',
                }}
              >
                {on ? '✓' : ''}
              </span>
              <span
                className="text-[13.5px] leading-relaxed"
                style={{
                  color: on ? 'var(--m20-muted)' : 'var(--m20-ink-soft)',
                  textDecoration: on ? 'line-through' : undefined,
                }}
              >
                {it}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function ProjectDetail({
  project,
  onClose,
  onToggleFlag,
  isFlagged,
}: {
  project: Project;
  onClose: () => void;
  onToggleFlag: (id: string) => void;
  isFlagged: boolean;
}) {
  const { notes, saveNote, deleteNote } = useData();
  const d = project.description;
  const storedNote = notes[project.id];
  const [draft, setDraft] = useState(storedNote?.content ?? '');
  const [dirty, setDirty] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>('overview');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setDraft(storedNote?.content ?? '');
    setDirty(false);
  }, [project.id, storedNote?.content]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSection(visible[0].target.id as SectionId);
      },
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 }
    );
    TOC.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [project.id]);

  const bomTotal = useMemo(
    () =>
      d.billOfMaterials.reduce(
        (acc, i) => acc + (Number(i.estimatedCost) || 0) * i.quantity,
        0
      ),
    [d.billOfMaterials]
  );

  const scrollTo = (id: SectionId) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadProjectSpecSheet(project, draft);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex">
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: 'rgba(8,15,26,0.62)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      <article
        className="relative z-10 ml-auto flex h-full w-full flex-col border-l sm:max-w-[min(1180px,94vw)]"
        style={{ backgroundColor: 'var(--m20-bg)' }}
        role="dialog"
        aria-modal="true"
        aria-label={project.title}
      >
        {/* toolbar */}
        <div
          className="sticky top-0 z-20 flex items-center gap-2 border-b px-4 py-2.5 sm:px-6"
          style={{
            borderColor: 'var(--m20-line)',
            backgroundColor: 'color-mix(in srgb, var(--m20-bg) 94%, transparent)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span className="m20-mono text-[11px] font-bold" style={{ color: 'var(--m20-accent)' }}>
            {project.id}
          </span>
          <span className="m20-muted hidden text-[11px] sm:inline">
            / {project.branch} / {project.category}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleFlag(project.id)}
              className="m20-btn m20-btn-sm"
              style={
                isFlagged
                  ? { color: 'var(--m20-warn)', borderColor: 'var(--m20-warn)' }
                  : undefined
              }
              title={isFlagged ? 'Remove from saved' : 'Save this project'}
            >
              <span aria-hidden="true">{isFlagged ? '★' : '☆'}</span>
              <span className="hidden sm:inline">{isFlagged ? 'Saved' : 'Save'}</span>
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="m20-btn m20-btn-sm m20-btn-primary"
              title="Download full spec sheet as PDF"
            >
              <span aria-hidden="true">⭳</span>
              {exporting ? 'Generating…' : 'PDF'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="m20-btn m20-btn-sm"
              aria-label="Close specification"
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* TOC rail */}
          <nav
            className="hidden w-[190px] shrink-0 overflow-y-auto border-r p-4 lg:block"
            style={{ borderColor: 'var(--m20-line-soft)' }}
            aria-label="Specification sections"
          >
            <p className="m20-label mb-2">Contents</p>
            <div className="sticky top-0 space-y-px">
              {TOC.map((t) => (
                <a
                  key={t.id}
                  href={`#${t.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollTo(t.id);
                  }}
                  data-active={activeSection === t.id}
                  className="m20-toc-link"
                >
                  <span className="mr-1.5 opacity-55">{t.code}</span>
                  {t.label}
                </a>
              ))}
            </div>
          </nav>

          {/* body */}
          <div className="m20-scroll-x min-w-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-[820px] px-4 py-7 sm:px-8 sm:py-10">
              {/* title block */}
              <header className="m20-ticks m20-card overflow-hidden">
                <ProjectImage
                  src={project.image}
                  alt={`Project photograph for ${project.title}`}
                  category={project.category}
                  className="border-b"
                />
                <div className="p-5 sm:p-7">
                  <p className="m20-label">
                    Project Specification Sheet · {project.level} · {project.duration}
                  </p>
                  <h1
                    className="mt-2 text-[22px] leading-tight font-bold sm:text-[27px]"
                    style={{ color: 'var(--m20-ink)' }}
                  >
                    {project.title}
                  </h1>
                  <div className="mt-4 flex flex-wrap items-center gap-1.5">
                    <LevelBadge level={project.level} />
                    <MetaTag>{project.branch}</MetaTag>
                    <MetaTag>{project.category}</MetaTag>
                    <MetaTag>{project.duration}</MetaTag>
                    <MetaTag>
                      {d.buildPhases.length} phases · {d.billOfMaterials.length} BOM lines
                    </MetaTag>
                  </div>
                  <div
                    className="mt-5 grid grid-cols-2 gap-3 border-t pt-4 sm:grid-cols-4"
                    style={{ borderColor: 'var(--m20-line-soft)' }}
                  >
                    {[
                      { l: 'Objectives', v: d.learningObjectives.length },
                      { l: 'Validation Gates', v: d.validationChecklist.length },
                      { l: 'Fault Modes', v: d.troubleshootingGuide.length },
                      { l: 'Est. Components', v: formatInrAsTSh(bomTotal) },
                    ].map((s) => (
                      <div key={s.l}>
                        <p className="m20-label">{s.l}</p>
                        <p
                          className="m20-mono mt-1 text-[15px] font-bold"
                          style={{ color: 'var(--m20-accent-ink)' }}
                        >
                          {s.v}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </header>

              <div className="mt-9 space-y-9">
                {/* 01 overview */}
                <section id="overview" className="scroll-mt-20">
                  <SectionHead code="01">Overview</SectionHead>
                  <div className="m20-prose m20-panel-alt border-l-2 p-4" style={{ borderLeftColor: 'var(--m20-accent)' }}>
                    <p>{d.overview}</p>
                  </div>
                </section>

                {/* 02 problem */}
                <section id="problem" className="scroll-mt-20">
                  <SectionHead code="02">Problem Statement</SectionHead>
                  <p className="m20-prose">{d.problemStatement}</p>
                </section>

                {/* 03 objectives */}
                <section id="objectives" className="scroll-mt-20">
                  <SectionHead code="03">Learning Objectives</SectionHead>
                  <NumList items={d.learningObjectives} />
                </section>

                {/* 04 prerequisites */}
                <section id="prereq" className="scroll-mt-20">
                  <SectionHead code="04">Prerequisites</SectionHead>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {d.prerequisites.map((p, i) => (
                      <li
                        key={i}
                        className="m20-card flex items-start gap-2.5 p-3"
                      >
                        <span
                          className="m20-mono mt-[2px] shrink-0 text-[11px]"
                          style={{ color: 'var(--m20-accent)' }}
                          aria-hidden="true"
                        >
                          ▸
                        </span>
                        <span className="m20-ink-soft text-[13.5px] leading-relaxed">{p}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* 05 architecture */}
                <section id="architecture" className="scroll-mt-20">
                  <SectionHead code="05">System Architecture</SectionHead>
                  <div
                    className="m20-card p-4 font-mono text-[12.5px] leading-[1.85] break-words"
                    style={{ color: 'var(--m20-ink-soft)' }}
                  >
                    <p className="m20-prose !font-sans !text-[14px]">{d.systemArchitecture}</p>
                  </div>
                </section>

                {/* 06 phases */}
                <section id="phases" className="scroll-mt-20">
                  <SectionHead code="06">Build Phases</SectionHead>
                  <div className="space-y-3">
                    {d.buildPhases.map((p) => (
                      <div key={p.phase} className="m20-card overflow-hidden">
                        <div
                          className="flex flex-wrap items-center gap-2.5 border-b px-4 py-3"
                          style={{
                            borderColor: 'var(--m20-line-soft)',
                            backgroundColor: 'var(--m20-panel-alt)',
                          }}
                        >
                          <span
                            className="m20-mono flex h-6 w-6 items-center justify-center text-[10.5px] font-bold text-white"
                            style={{ backgroundColor: 'var(--m20-accent)' }}
                          >
                            {p.phase}
                          </span>
                          <h4
                            className="text-[14px] font-bold"
                            style={{ color: 'var(--m20-ink)' }}
                          >
                            {p.title}
                          </h4>
                          <span
                            className="m20-mono m20-muted ml-auto text-[10.5px]"
                          >
                            {p.duration}
                          </span>
                        </div>
                        <div className="p-4">
                          <p className="m20-prose text-[13.5px]">{p.description}</p>
                          <p className="m20-label mt-4 mb-1.5">Tasks</p>
                          <TickList items={p.tasks} />
                          {p.deliverables.length > 0 && (
                            <>
                              <p className="m20-label mt-4 mb-1.5">Phase Deliverables</p>
                              <ul className="space-y-1">
                                {p.deliverables.map((dv, i) => (
                                  <li
                                    key={i}
                                    className="flex items-start gap-2 text-[13px]"
                                    style={{ color: 'var(--m20-ink-soft)' }}
                                  >
                                    <span style={{ color: 'var(--m20-accent)' }} aria-hidden="true">
                                      →
                                    </span>
                                    {dv}
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* 07 BOM */}
                <section id="bom" className="scroll-mt-20">
                  <SectionHead code="07">Bill of Materials</SectionHead>
                  <div className="m20-card m20-scroll-x">
                    <table className="w-full min-w-[640px] border-collapse text-left">
                      <thead>
                        <tr style={{ backgroundColor: 'var(--m20-panel-alt)' }}>
                          {['Component', 'Specification', 'Qty', `Unit ${CURRENCY}`, 'Notes'].map(
                            (h, i) => (
                              <th
                                key={h}
                                className="m20-label border-b px-3 py-2.5"
                                style={{
                                  borderColor: 'var(--m20-line)',
                                  textAlign: i === 2 || i === 3 ? 'right' : 'left',
                                }}
                              >
                                {h}
                              </th>
                            )
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {d.billOfMaterials.map((item, i) => (
                          <tr
                            key={i}
                            style={{
                              backgroundColor:
                                i % 2 === 1 ? 'color-mix(in srgb, var(--m20-panel-alt) 55%, transparent)' : 'transparent',
                            }}
                          >
                            <td
                              className="border-b px-3 py-2.5 text-[13px] font-semibold"
                              style={{ borderColor: 'var(--m20-line-soft)', color: 'var(--m20-ink)' }}
                            >
                              {item.component}
                            </td>
                            <td
                              className="border-b px-3 py-2.5 text-[12.5px]"
                              style={{ borderColor: 'var(--m20-line-soft)', color: 'var(--m20-ink-soft)' }}
                            >
                              {item.specification}
                            </td>
                            <td
                              className="m20-mono border-b px-3 py-2.5 text-[12.5px]"
                              style={{ borderColor: 'var(--m20-line-soft)', color: 'var(--m20-ink-soft)', textAlign: 'right' }}
                            >
                              {item.quantity}
                            </td>
                            <td
                              className="m20-mono border-b px-3 py-2.5 text-[12.5px] whitespace-nowrap"
                              style={{ borderColor: 'var(--m20-line-soft)', color: 'var(--m20-accent-ink)', textAlign: 'right' }}
                            >
                              {formatInrAsTSh(Number(item.estimatedCost) || 0)}
                            </td>
                            <td
                              className="border-b px-3 py-2.5 text-[12px]"
                              style={{ borderColor: 'var(--m20-line-soft)', color: 'var(--m20-muted)' }}
                            >
                              {item.notes ?? '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="m20-muted mt-2 text-[12px]">
                    Indicative component total ≈{' '}
                    <strong className="m20-ink-soft">{formatInrAsTSh(bomTotal)}</strong> —
                    excludes tools, consumables and shipping.
                  </p>
                </section>

                {/* 08 validation */}
                <section id="validation" className="scroll-mt-20">
                  <SectionHead code="08">Validation Checklist</SectionHead>
                  <div className="m20-card p-3">
                    <TickList items={d.validationChecklist} />
                  </div>
                </section>

                {/* 09 troubleshooting */}
                <section id="trouble" className="scroll-mt-20">
                  <SectionHead code="09">Troubleshooting Guide</SectionHead>
                  <div className="space-y-2">
                    {d.troubleshootingGuide.map((t, i) => (
                      <div key={i} className="m20-card p-3.5">
                        <div className="flex items-start gap-2">
                          <span
                            className="m20-mono mt-[1px] shrink-0 text-[11px]"
                            style={{ color: 'var(--m20-danger)' }}
                            aria-hidden="true"
                          >
                            ✕
                          </span>
                          <h4
                            className="text-[13.5px] font-bold"
                            style={{ color: 'var(--m20-ink)' }}
                          >
                            {t.issue}
                          </h4>
                        </div>
                        <dl className="mt-2.5 grid gap-2 pl-5 text-[12.5px] sm:grid-cols-2">
                          <div>
                            <dt className="m20-label mb-0.5">Probable Cause</dt>
                            <dd style={{ color: 'var(--m20-ink-soft)' }}>{t.cause}</dd>
                          </div>
                          <div>
                            <dt className="m20-label mb-0.5">Corrective Action</dt>
                            <dd style={{ color: 'var(--m20-ink-soft)' }}>{t.solution}</dd>
                          </div>
                        </dl>
                      </div>
                    ))}
                  </div>
                </section>

                {/* 10 extensions */}
                <section id="extensions" className="scroll-mt-20">
                  <SectionHead code="10">Extension Ideas</SectionHead>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {d.extensionIdeas.map((e, i) => (
                      <li
                        key={i}
                        className="m20-card m20-card-hover flex items-start gap-2.5 p-3"
                      >
                        <span
                          className="m20-mono mt-[2px] shrink-0 text-[10.5px]"
                          style={{ color: 'var(--m20-accent)' }}
                          aria-hidden="true"
                        >
                          +
                        </span>
                        <span className="m20-ink-soft text-[13px] leading-relaxed">{e}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* 11 deliverables */}
                <section id="deliverables" className="scroll-mt-20">
                  <SectionHead code="11">Deliverables</SectionHead>
                  <div className="m20-card p-4">
                    <TickList items={d.deliverables} />
                  </div>
                </section>

                {/* 12 safety */}
                <section id="safety" className="scroll-mt-20">
                  <SectionHead code="12">Safety Notes</SectionHead>
                  <div
                    className="border p-4"
                    style={{
                      borderColor: 'var(--m20-warn)',
                      backgroundColor: 'var(--m20-warn-soft)',
                    }}
                  >
                    <p
                      className="m20-mono mb-2 text-[11px] font-bold tracking-[0.1em] uppercase"
                      style={{ color: 'var(--m20-warn)' }}
                    >
                      ▲ Read before building
                    </p>
                    <ul className="space-y-1.5">
                      {d.safetyNotes.map((s, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-[13px] leading-relaxed"
                          style={{ color: 'var(--m20-ink-soft)' }}
                        >
                          <span style={{ color: 'var(--m20-warn)' }} aria-hidden="true">
                            ▪
                          </span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>

                {/* 13 field notes */}
                <section id="notes" className="scroll-mt-20">
                  <SectionHead code="13">Field Notes</SectionHead>
                  <div className="m20-card p-4">
                    <label htmlFor="field-note" className="m20-label mb-2 block">
                      Your working notes — saved in this browser
                    </label>
                    <textarea
                      id="field-note"
                      value={draft}
                      onChange={(e) => {
                        setDraft(e.target.value);
                        setDirty(true);
                      }}
                      rows={5}
                      placeholder="Record part numbers, measured values, deviations from the plan, and what you would do differently…"
                      className="m20-input resize-y"
                    />
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          saveNote(project.id, draft);
                          setDirty(false);
                        }}
                        disabled={!dirty}
                        className="m20-btn m20-btn-primary m20-btn-sm"
                      >
                        {storedNote ? 'Update note' : 'Save note'}
                      </button>
                      {storedNote && (
                        <button
                          type="button"
                          onClick={() => {
                            deleteNote(project.id);
                            setDraft('');
                            setDirty(false);
                          }}
                          className="m20-btn m20-btn-sm"
                          style={{ color: 'var(--m20-danger)' }}
                        >
                          Delete
                        </button>
                      )}
                      {storedNote && (
                        <span className="m20-muted text-[11px]">
                          saved {formatDateTime(storedNote.updatedAt)}
                        </span>
                      )}
                      {dirty && (
                        <span className="m20-mono text-[11px]" style={{ color: 'var(--m20-warn)' }}>
                          unsaved changes
                        </span>
                      )}
                    </div>
                    {storedNote && (
                      <button
                        type="button"
                        onClick={() => {
                          void downloadProjectSpecSheet(project, storedNote.content);
                        }}
                        className="m20-btn m20-btn-sm mt-3"
                      >
                        <span aria-hidden="true">⭳</span> Export PDF including this note
                      </button>
                    )}
                  </div>
                </section>

              </div>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
