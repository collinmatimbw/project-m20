/**
 * Google Sheets sync for request and share submissions.
 *
 * Submissions are always stored in localStorage first (see DataContext), so the
 * app never loses one. This module is the delivery layer on top: it POSTs each
 * submission to a Google Apps Script web app that appends a row to a Sheet.
 *
 * The endpoint is universal: every visitor posts to the same Apps Script web
 * app, with no per-browser setup. Resolution, in order:
 *   1. VITE_SUBMIT_SHEET_URL at build time (escape hatch for a swapped deployment)
 *   2. UNIVERSAL_ENDPOINT baked into the source
 *
 * If the POST fails, the submission is queued in localStorage and retried on the
 * next flush (page load, network reconnect, or the 90s interval). The Apps Script
 * side deduplicates on submission id, so a retry after a partially delivered
 * request cannot create a second row.
 *
 * Status changes go through the same path: the whole record is re-posted and the
 * row is rewritten in place, so the sheet's Status and Last Updated columns track
 * the app without a separate patch endpoint. Because the server rewrites every data
 * column on an update, callers must always re-post the full record.
 *
 * POSTs use Content-Type: text/plain so the browser treats them as simple
 * requests — Apps Script answers no CORS preflight, and the raw body is still
 * readable as e.postData.contents.
 */

import type { ProjectRequest, SharedProject } from '../types';

export type SubmissionKind = 'request' | 'share';

export interface SheetSubmission {
  kind: SubmissionKind;
  id: string;
  submittedAt: string;
  /** Free-text note for the sheet's Sync Log, e.g. "new submission" / "status change". */
  reason?: string;
  fields: Record<string, string>;
}

export interface QueuedSubmission {
  sub: SheetSubmission;
  attempts: number;
  lastError: string;
  queuedAt: string;
}

export interface SyncState {
  pending: number;
  lastSyncedAt: string | null;
  lastEvent: { id: string; ok: boolean; at: string } | null;
  lastError: string | null;
}

/**
 * The one Apps Script web app every visitor posts to (execute as Me, access
 * Anyone). Override with VITE_SUBMIT_SHEET_URL at build time if the deployment
 * is ever replaced.
 */
const UNIVERSAL_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbyV6B5Bznw7BxySQNyGplXUSyhwL7VO0CoIXzAMeJKIyYdY4ndis7niK047VIWNWW_j7Q/exec';

const QUEUE_KEY = 'm20_sheet_queue';
const META_KEY = 'm20_sheet_meta';
const EVENT = 'm20:sheet-sync';

/*
 * Apps Script is a cold-start platform: a web app that has been idle routinely
 * takes 8-20s to answer, and occasionally much longer. A short client timeout
 * aborts the request while the server is still writing the row, which looks like
 * a failed send and forces a re-queue even though the row was created. Measured
 * warm POSTs are ~8s, so 30s leaves real headroom.
 */
const TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 10;

type Meta = { lastSyncedAt: string | null; lastEvent: SyncState['lastEvent']; lastError: string | null };

const listeners = new Set<() => void>();

/* ------------------------------------------------------------------ storage */

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Sheet sync: could not persist ${key}`, err);
  }
}

function getMeta(): Meta {
  return read<Meta>(META_KEY, {
    lastSyncedAt: null,
    lastEvent: null,
    lastError: null,
  });
}

function setMeta(patch: Partial<Meta>): void {
  write(META_KEY, { ...getMeta(), ...patch });
}

export function getQueue(): QueuedSubmission[] {
  const q = read<QueuedSubmission[]>(QUEUE_KEY, []);
  return Array.isArray(q) ? q : [];
}

export function getSyncState(): SyncState {
  const meta = getMeta();
  return {
    pending: getQueue().length,
    lastSyncedAt: meta.lastSyncedAt,
    lastEvent: meta.lastEvent,
    lastError: meta.lastError,
  };
}

function notify(): void {
  const state = getSyncState();
  listeners.forEach((l) => l());
  window.dispatchEvent(new CustomEvent(EVENT, { detail: state }));
}

export function subscribeToSync(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/* ----------------------------------------------------------------- endpoint */

/**
 * Universal endpoint: a build-time override if one was baked in, otherwise the
 * Apps Script web app shipped with the source. A per-browser override stored
 * under the old `m20_sheet_endpoint` key is deliberately ignored so every
 * visitor posts to the same sheet.
 */
export function getEndpoint(): string {
  const fromEnv = import.meta.env.VITE_SUBMIT_SHEET_URL;
  if (typeof fromEnv === 'string' && fromEnv.trim()) return fromEnv.trim();
  return UNIVERSAL_ENDPOINT;
}

/* ------------------------------------------------------------------ delivery */

function message(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

async function post(endpoint: string, sub: SheetSubmission): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(sub),
      signal: controller.signal,
      redirect: 'follow',
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`endpoint responded ${res.status}`);

    if (text.trim()) {
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }
      if (parsed && typeof parsed === 'object') {
        const body = parsed as { ok?: boolean; error?: string };
        if (body.ok === false) throw new Error(body.error ?? 'endpoint reported a failure');
      }
    }
  } finally {
    clearTimeout(timer);
  }
}

function enqueue(sub: SheetSubmission, error: string): void {
  const queue = getQueue();
  const existing = queue.find((q) => q.sub.id === sub.id);
  if (existing) {
    /* keep the newest snapshot: a later status change must not be overwritten
       by the stale submission that failed earlier */
    existing.sub = sub;
    existing.lastError = error;
    existing.attempts += 1;
  } else {
    queue.push({
      sub,
      attempts: 1,
      lastError: error,
      queuedAt: new Date().toISOString(),
    });
  }
  write(QUEUE_KEY, queue.slice(-200));
  setMeta({ lastEvent: { id: sub.id, ok: false, at: new Date().toISOString() }, lastError: error });
}

function dequeue(id: string): void {
  write(
    QUEUE_KEY,
    getQueue().filter((q) => q.sub.id !== id)
  );
  setMeta({
    lastSyncedAt: new Date().toISOString(),
    lastEvent: { id, ok: true, at: new Date().toISOString() },
    lastError: null,
  });
}

/** Deliver one submission. Queues it if the POST fails. */
export async function pushSubmission(sub: SheetSubmission): Promise<boolean> {
  const endpoint = getEndpoint();
  try {
    await post(endpoint, sub);
    dequeue(sub.id);
    notify();
    return true;
  } catch (err) {
    enqueue(sub, message(err));
    notify();
    return false;
  }
}

/** Retry everything queued, oldest first. Stops retrying an entry past the cap. */
export async function flushQueue(): Promise<{ sent: number; remaining: number }> {
  const endpoint = getEndpoint();
  const queue = getQueue();
  if (queue.length === 0) {
    return { sent: 0, remaining: 0 };
  }

  /*
   * Rows queued while no endpoint was configured burned their attempt budget on
   * an error that can no longer happen; give them a fresh one now that every
   * browser points at the universal endpoint.
   */
  if (queue.some((item) => item.lastError === 'no sheet endpoint configured')) {
    for (const item of queue) {
      if (item.lastError === 'no sheet endpoint configured') item.attempts = 0;
    }
    write(QUEUE_KEY, queue);
  }

  let sent = 0;
  for (const item of queue) {
    if (item.attempts > MAX_ATTEMPTS) continue;
    try {
      await post(endpoint, item.sub);
      dequeue(item.sub.id);
      sent += 1;
    } catch (err) {
      const current = getQueue().find((q) => q.sub.id === item.sub.id);
      if (current) {
        current.attempts += 1;
        current.lastError = message(err);
        write(QUEUE_KEY, getQueue());
      }
      setMeta({ lastError: message(err) });
    }
  }
  notify();
  return { sent, remaining: getQueue().length };
}

/* ------------------------------------------------------------------ builders */

/** 'under-review' -> 'Under review', matching the badge wording in StatusBadge. */
function statusLabel(status: string): string {
  const words = status.replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function requestToSubmission(r: ProjectRequest, reason?: string): SheetSubmission {
  return {
    kind: 'request',
    id: r.id,
    submittedAt: r.createdAt,
    ...(reason ? { reason } : {}),
    fields: {
      'Project Title': r.title,
      Branch: r.branch,
      Category: r.category,
      Description: r.description,
      Experience: r.experience,
      Timeline: r.timeline,
      Budget: r.budget,
      Name: r.name,
      Email: r.email,
      Status: statusLabel(r.status),
      'Last Updated': r.updatedAt,
    },
  };
}

export function shareToSubmission(p: SharedProject, reason?: string): SheetSubmission {
  return {
    kind: 'share',
    id: p.id,
    submittedAt: p.createdAt,
    ...(reason ? { reason } : {}),
    fields: {
      'Project Title': p.title,
      Branch: p.branch,
      Category: p.category,
      Description: p.description,
      Difficulty: p.difficulty,
      'Tech Stack': p.techStack.join(', '),
      Duration: p.duration,
      'Estimated Cost': p.estimatedCost,
      'Resource Links': p.resourceLinks
        .map((l) => `${l.label}: ${l.url}`)
        .join('\n'),
      'Author Name': p.authorName,
      'Author Email': p.authorEmail,
      'Author Bio': p.authorBio,
      Status: statusLabel(p.status),
      'Last Updated': p.updatedAt,
    },
  };
}

/** Re-post a request whose status changed; the sheet row is updated in place. */
export function pushRequestStatus(record: ProjectRequest): Promise<boolean> {
  return pushSubmission(requestToSubmission(record, 'status change'));
}

/** Re-post a share whose status changed; the sheet row is updated in place. */
export function pushShareStatus(record: SharedProject): Promise<boolean> {
  return pushSubmission(shareToSubmission(record, 'status change'));
}
