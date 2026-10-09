import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  loadCatalogue,
  branchOf,
  type CatalogueEntry,
} from '../data/catalogue';
import {
  buildSpecForEntry,
  specMetaForEntry,
  ARCHETYPE_COUNT,
} from '../data/specGenerator';
import { useData } from '../contexts/DataContext';
import { downloadProjectSpecSheet } from '../utils/pdf';
import { ProjectDetail } from './ProjectDetail';
import { LevelBadge } from './StatusBadge';
import type { Project } from '../types';
import { cn } from '../utils/cn';

type SortKey = 'date' | 'title' | 'branch' | 'level';

const PAGE_SIZE = 60;
const LEVEL_RANK: Record<string, number> = {
  Beginner: 0,
  Intermediate: 1,
  Advanced: 2,
};

export function CatalogueView() {
  const { flags, notes, toggleFlag, customProjects } = useData();
  const [baseEntries, setBaseEntries] = useState<CatalogueEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [branch, setBranch] = useState('all');
  const [level, setLevel] = useState('all');
  const [savedOnly, setSavedOnly] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({
    key: 'date',
    dir: 'desc',
  });
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<Project | null>(null);

  /** Specs are built on first open and kept, so reopening is instant. */
  const specCache = useRef(new Map<number, Project>());
  const getSpec = useCallback((entry: CatalogueEntry) => {
    let spec = specCache.current.get(entry.sourceId);
    if (!spec) {
      spec = buildSpecForEntry(entry);
      specCache.current.set(entry.sourceId, spec);
    }
    return spec;
  }, []);

  useEffect(() => {
    let alive = true;
    loadCatalogue()
      .then((data) => {
        if (alive) setBaseEntries(data);
      })
      .catch((e) => {
        if (alive) setError(e?.message ?? 'Failed to load catalogue');
      });
    return () => {
      alive = false;
    };
  }, []);

  /** Imported catalogue first, admin-posted projects on top as the newest records. */
  const entries = useMemo(
    () => (baseEntries ? [...customProjects, ...baseEntries] : null),
    [baseEntries, customProjects]
  );

  const categories = useMemo(() => {
    if (!entries) return [];
    const set = new Set<string>();
    entries.forEach((e) => e.categories.forEach((c) => set.add(c)));
    return Array.from(set).sort();
  }, [entries]);

  const branches = useMemo(() => {
    if (!entries) return [];
    const set = new Set<string>();
    entries.forEach((e) => {
      const b = branchOf(e);
      if (b) set.add(b);
    });
    return Array.from(set).sort();
  }, [entries]);

  const levels = useMemo(() => {
    if (!entries) return [];
    const set = new Set<string>();
    entries.forEach((e) => set.add(specMetaForEntry(e).level));
    return Array.from(set).sort(
      (a, b) => (LEVEL_RANK[a] ?? 0) - (LEVEL_RANK[b] ?? 0)
    );
  }, [entries]);

  const results = useMemo(() => {
    if (!entries) return [];
    const q = query.trim().toLowerCase();

    const filtered = entries.filter((e) => {
      if (category !== 'all' && !e.categories.includes(category)) return false;
      if (branch !== 'all' && branchOf(e) !== branch) return false;
      if (level !== 'all' && specMetaForEntry(e).level !== level) return false;
      if (savedOnly && !flags[`M20-${e.sourceId}`]) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.categories.some((c) => c.toLowerCase().includes(q))
      );
    });

    return filtered.sort((a, b) => {
      let cmp = 0;
      if (sort.key === 'date') cmp = a.date.localeCompare(b.date);
      else if (sort.key === 'title') cmp = a.title.localeCompare(b.title);
      else if (sort.key === 'level')
        cmp =
          (LEVEL_RANK[specMetaForEntry(a).level] ?? 0) -
          (LEVEL_RANK[specMetaForEntry(b).level] ?? 0);
      else
        cmp = (branchOf(a) ?? '').localeCompare(
          branchOf(b) ?? ''
        );
      if (cmp === 0) cmp = a.title.localeCompare(b.title);
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [entries, query, category, branch, level, savedOnly, sort, flags]);

  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [query, category, branch, level, savedOnly, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'title' ? 'asc' : 'desc' }
    );

  const reset = () => {
    setQuery('');
    setCategory('all');
    setBranch('all');
    setLevel('all');
    setSavedOnly(false);
  };

  if (error) {
    return (
      <div className="m20-card p-10 text-center">
        <p
          className="m20-mono text-[13px]"
          style={{ color: 'var(--m20-danger)' }}
        >
          CATALOGUE UNAVAILABLE
        </p>
        <p className="m20-muted mt-2 text-[13px]">{error}</p>
      </div>
    );
  }

  if (!entries) {
    return (
      <div className="m20-card p-12 text-center">
        <p
          className="m20-mono text-[12px]"
          style={{ color: 'var(--m20-muted)' }}
        >
          LOADING CATALOGUE…
        </p>
      </div>
    );
  }

  const visible = results.slice(0, limit);
  const savedCount = Object.keys(flags).length;

  return (
    <div>
      {/* controls */}
      <div
        className="m20-card p-4"
        style={{ backgroundColor: 'var(--m20-panel-alt)' }}
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
          <div>
            <label htmlFor="cat-q" className="m20-label mb-1.5 block">
              Search catalogue
            </label>
            <div className="relative">
              <span
                className="absolute top-1/2 left-2.5 -translate-y-1/2 text-[13px]"
                style={{ color: 'var(--m20-muted)' }}
                aria-hidden="true"
              >
                ⌕
              </span>
              <input
                id="cat-q"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Title or technology…"
                className="m20-input pl-8"
              />
            </div>
          </div>

          <div>
            <label htmlFor="cat-branch" className="m20-label mb-1.5 block">
              Branch
            </label>
            <select
              id="cat-branch"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="m20-input"
            >
              <option value="all">All branches</option>
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="cat-cat" className="m20-label mb-1.5 block">
              Category
            </label>
            <select
              id="cat-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="m20-input"
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="cat-level" className="m20-label mb-1.5 block">
              Level
            </label>
            <select
              id="cat-level"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="m20-input"
            >
              <option value="all">All levels</option>
              {levels.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="cat-sort" className="m20-label mb-1.5 block">
              Sort
            </label>
            <select
              id="cat-sort"
              value={`${sort.key}:${sort.dir}`}
              onChange={(e) => {
                const [k, d] = e.target.value.split(':');
                setSort({ key: k as SortKey, dir: d as 'asc' | 'desc' });
              }}
              className="m20-input"
            >
              <option value="date:desc">Newest first</option>
              <option value="date:asc">Oldest first</option>
              <option value="title:asc">Title A→Z</option>
              <option value="title:desc">Title Z→A</option>
              <option value="branch:asc">Branch A→Z</option>
              <option value="level:desc">Hardest first</option>
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <p className="m20-mono m20-muted text-[11px]">
            {results.length.toLocaleString('en-TZ')} /{' '}
            {entries.length.toLocaleString('en-TZ')} records
          </p>
          <button
            type="button"
            onClick={() => setSavedOnly((v) => !v)}
            className={cn('m20-btn m20-btn-sm', savedOnly && 'm20-btn-primary')}
            aria-pressed={savedOnly}
          >
            <span aria-hidden="true">{savedOnly ? '★' : '☆'}</span> Saved only
            <span className="m20-mono opacity-70">{savedCount}</span>
          </button>
          {(query || category !== 'all' || branch !== 'all' || level !== 'all' || savedOnly) && (
            <button type="button" onClick={reset} className="m20-btn m20-btn-sm">
              Clear filters
            </button>
          )}
          <span
            className="m20-mono ml-auto text-[10.5px]"
            style={{ color: 'var(--m20-muted)' }}
          >
            sort {sort.key} {sort.dir === 'asc' ? '↑' : '↓'}
          </span>
        </div>
      </div>

      {/* results */}
      {results.length === 0 ? (
        <div className="m20-card mt-3 p-10 text-center">
          <p
            className="m20-mono text-[13px]"
            style={{ color: 'var(--m20-muted)' }}
          >
            NO MATCHES
          </p>
          <p className="m20-muted mt-2 text-[13px]">
            Try a broader term, or clear the filters.
          </p>
          <button type="button" onClick={reset} className="m20-btn mt-4">
            Reset all filters
          </button>
        </div>
      ) : (
        <>
          <div className="m20-scroll-x mt-3">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr style={{ backgroundColor: 'var(--m20-panel-alt)' }}>
                  <th
                    className="m20-label border-b px-3 py-3"
                    style={{ borderColor: 'var(--m20-line)' }}
                  >
                    ID
                  </th>
                  <th
                    className="m20-label border-b px-3 py-3"
                    style={{ borderColor: 'var(--m20-line)' }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort('title')}
                      className="hover:opacity-70"
                    >
                      Project Title{' '}
                      {sort.key === 'title'
                        ? sort.dir === 'asc'
                          ? '▲'
                          : '▼'
                        : ''}
                    </button>
                  </th>
                  <th
                    className="m20-label border-b px-3 py-3"
                    style={{ borderColor: 'var(--m20-line)' }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort('branch')}
                      className="hover:opacity-70"
                    >
                      Branch{' '}
                      {sort.key === 'branch'
                        ? sort.dir === 'asc'
                          ? '▲'
                          : '▼'
                        : ''}
                    </button>
                  </th>
                  <th
                    className="m20-label border-b px-3 py-3"
                    style={{ borderColor: 'var(--m20-line)' }}
                  >
                    Categories
                  </th>
                  <th
                    className="m20-label border-b px-3 py-3"
                    style={{ borderColor: 'var(--m20-line)' }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort('date')}
                      className="hover:opacity-70"
                    >
                      Listed{' '}
                      {sort.key === 'date'
                        ? sort.dir === 'asc'
                          ? '▲'
                          : '▼'
                        : ''}
                    </button>
                  </th>
                  <th
                    className="m20-label border-b px-3 py-3 text-right"
                    style={{ borderColor: 'var(--m20-line)' }}
                  >
                    Specification
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((e, i) => {
                  const meta = specMetaForEntry(e);
                  const id = `M20-${e.sourceId}`;
                  const isSaved = !!flags[id];
                  const hasNote = !!notes[id];
                  return (
                    <tr
                      key={e.sourceId}
                      className="group cursor-pointer transition-colors hover:bg-[var(--m20-panel-alt)]"
                      style={{
                        backgroundColor:
                          i % 2 === 1
                            ? 'color-mix(in srgb, var(--m20-panel-alt) 45%, transparent)'
                            : 'transparent',
                      }}
                      onClick={() => setSelected(getSpec(e))}
                    >
                      <td
                        className="m20-mono border-b px-3 py-2.5 text-[11.5px] font-bold whitespace-nowrap"
                        style={{
                          borderColor: 'var(--m20-line-soft)',
                          color: 'var(--m20-accent-ink)',
                        }}
                      >
                        {id}
                      </td>
                      <td
                        className="border-b px-3 py-2.5 text-[13.5px] font-semibold"
                        style={{
                          borderColor: 'var(--m20-line-soft)',
                          color: 'var(--m20-ink)',
                        }}
                      >
                        <span className="flex items-start gap-2">
                          <span
                            className="mt-[1px] shrink-0 text-[13px]"
                            style={{ color: 'var(--m20-accent)' }}
                            aria-hidden="true"
                          >
                            ▸
                          </span>
                          {e.title}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-1.5 pl-[19px]">
                          <LevelBadge level={meta.level} />
                          {e.custom && (
                            <span
                              className="m20-badge"
                              style={{
                                color: 'var(--m20-accent-ink)',
                                borderColor: 'var(--m20-accent)',
                              }}
                            >
                              new
                            </span>
                          )}
                          <span
                            className="m20-badge"
                            style={{
                              color: 'var(--m20-muted)',
                              borderColor: 'var(--m20-line)',
                            }}
                          >
                            {meta.label}
                          </span>
                          {hasNote && (
                            <span
                              className="m20-badge"
                              style={{
                                color: 'var(--m20-ok)',
                                borderColor: 'var(--m20-ok)',
                              }}
                            >
                              note
                            </span>
                          )}
                        </span>
                      </td>
                      <td
                        className="border-b px-3 py-2.5 text-[12.5px] whitespace-nowrap"
                        style={{
                          borderColor: 'var(--m20-line-soft)',
                          color: 'var(--m20-ink-soft)',
                        }}
                      >
                        {branchOf(e) ?? '—'}
                      </td>
                      <td
                        className="border-b px-3 py-2.5"
                        style={{ borderColor: 'var(--m20-line-soft)' }}
                      >
                        <div className="flex flex-wrap gap-1">
                          {e.categories.slice(0, 2).map((c) => (
                            <span
                              key={c}
                              className="m20-badge"
                              style={{
                                color: 'var(--m20-muted)',
                                borderColor: 'var(--m20-line)',
                                backgroundColor: 'var(--m20-panel-alt)',
                              }}
                            >
                              {c}
                            </span>
                          ))}
                          {e.categories.length > 2 && (
                            <span
                              className="m20-badge"
                              style={{
                                color: 'var(--m20-muted)',
                                borderColor: 'var(--m20-line)',
                              }}
                            >
                              +{e.categories.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td
                        className="m20-mono border-b px-3 py-2.5 text-[11.5px] whitespace-nowrap"
                        style={{
                          borderColor: 'var(--m20-line-soft)',
                          color: 'var(--m20-muted)',
                        }}
                      >
                        {e.date || '—'}
                      </td>
                      <td
                        className="border-b px-3 py-2.5 text-right"
                        style={{ borderColor: 'var(--m20-line-soft)' }}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              toggleFlag(id);
                            }}
                            className="m20-btn m20-btn-sm m20-btn-ghost"
                            style={{
                              color: isSaved
                                ? 'var(--m20-warn)'
                                : 'var(--m20-muted)',
                            }}
                            title={isSaved ? 'Remove from saved' : 'Save project'}
                            aria-label={isSaved ? `Unsave ${id}` : `Save ${id}`}
                          >
                            <span aria-hidden="true">
                              {isSaved ? '★' : '☆'}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              void downloadProjectSpecSheet(
                                getSpec(e),
                                notes[id]?.content
                              );
                            }}
                            className="m20-btn m20-btn-sm m20-btn-ghost"
                            style={{ color: 'var(--m20-muted)' }}
                            title="Download spec sheet PDF"
                            aria-label={`Download PDF for ${id}`}
                          >
                            <span aria-hidden="true">⭳</span>
                          </button>
                          <button
                            type="button"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setSelected(getSpec(e));
                            }}
                            className="m20-btn m20-btn-sm"
                            style={{ color: 'var(--m20-accent-ink)' }}
                          >
                            Open
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {limit < results.length && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setLimit((l) => l + PAGE_SIZE)}
                className="m20-btn"
              >
                Load {Math.min(PAGE_SIZE, results.length - limit)} more
              </button>
              <p className="m20-mono m20-muted text-[11px]">
                showing {visible.length.toLocaleString('en-TZ')} of{' '}
                {results.length.toLocaleString('en-TZ')}
              </p>
            </div>
          )}
        </>
      )}

      <p
        className="m20-muted mt-5 border-t pt-4 text-[11.5px] leading-relaxed"
        style={{ borderColor: 'var(--m20-line-soft)' }}
      >
        Every record opens a full 12-section specification in this app — objectives,
        architecture, phased build, bill of materials, validation gates, fault modes and
        safety notes — with PDF export, saved flag and field notes. The {ARCHETYPE_COUNT}{' '}
        engineering templates are original work written for M20 and selected from each
        title and its source categories, so entries that share a template share its
        structure. Only listing metadata (title, category, date) is taken from the
        nevonprojects.com catalogue; no article text is stored or reproduced.
      </p>

      {selected && (
        <ProjectDetail
          project={selected}
          onClose={() => setSelected(null)}
          onToggleFlag={toggleFlag}
          isFlagged={!!flags[selected.id]}
        />
      )}
    </div>
  );
}
