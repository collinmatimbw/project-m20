/**
 * Image fetcher for the catalogue.
 *
 * Reads src/data/catalogue.json, downloads each post's project image into
 * public/images/, and writes the local path back into the record as `image`.
 * Posts with no usable image are recorded as resolved-with-nothing so they are
 * not retried on a later run.
 *
 * Resumable. Progress lives in scripts/.image-state.json (gitignored): a run skips
 * any sourceId already resolved, so interrupting and re-running is safe.
 *
 * Posts are fetched in batches through the REST `include` parameter rather than
 * one request per post. A per-post approach produced thousands of connections and
 * tripped repeated transport-level failures, each costing a full backoff ladder.
 *
 * Usage:
 *   node scripts/fetch-images.mjs              # everything outstanding
 *   node scripts/fetch-images.mjs 35087 35073  # only these source ids
 */

import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ORIGIN = 'https://nevonprojects.com';
const UA = 'M20-Learning-Index/1.0 (image fetcher)';

const POST_BATCH = 10; // 15+ ids in `include` returns 403 (WAF URL-length limit).
const DOWNLOAD_WORKERS = 2; // concurrent image GETs
const BATCH_DELAY_MS = 800; // politeness pause between post requests
const DOWNLOAD_DELAY_MS = 500; // politeness pause per worker between image GETs

/*
 * The site sits behind a WAF that returns 403 after a burst of requests. Once it
 * starts refusing, continuing only deepens the block, so abort and let the run be
 * resumed later. State is checkpointed, so an abort costs at most one batch.
 */
const MAX_CONSECUTIVE_403 = 5;

class BlockedError extends Error {}
let consecutive403 = 0;

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const catalogueFile = resolve(root, 'src', 'data', 'catalogue.json');
const metaFile = resolve(root, 'src', 'data', 'catalogue.meta.json');
const stateFile = resolve(root, 'scripts', '.image-state.json');
const imageDir = resolve(root, 'public', 'images');

/** Publishes progress so an interrupted run can be resumed exactly. */
async function checkpoint() {
  await writeFile(catalogueFile, JSON.stringify(records), 'utf8');
  await writeFile(stateFile, JSON.stringify(state), 'utf8');
}

/* Site furniture that appears in post bodies but is not a project photo. */
const JUNK = [
  'buy-now',
  'op-delivery',
  'branding-',
  'tech-support',
  'nevonprojects',
  'logo',
  'banner',
  'whatsapp',
  'payment',
  'discount',
  'certificate',
  'footer',
  'header',
];

const isJunk = (u) => {
  const name = decodeURIComponent(u.split('/').pop() ?? '').toLowerCase();
  return JUNK.some((j) => name.includes(j));
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * fetch with bounded retries. Transport errors and 5xx/429 are retried with a
 * short backoff; anything else is surfaced immediately.
 */
async function request(url, kind, attempt = 1) {
  const MAX = 4;
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA } });
    if (res.status === 429 || res.status >= 500) {
      if (attempt >= MAX) throw new Error(`${res.status} (gave up)`);
      await sleep(attempt * 2000);
      return request(url, kind, attempt + 1);
    }
    if (res.status === 403) {
      consecutive403 += 1;
      if (consecutive403 >= MAX_CONSECUTIVE_403) {
        throw new BlockedError(`403 x${consecutive403} — WAF has blocked us, stopping`);
      }
      if (attempt >= MAX) throw new Error(`403 (gave up)`);
      await sleep(attempt * 3000);
      return request(url, kind, attempt + 1);
    }
    consecutive403 = 0;
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    if (kind === 'json') return await res.json();
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    if (err instanceof BlockedError) throw err;
    const retriable = /fetch failed|ECONNRESET|ETIMEDOUT|socket|network/i.test(err.message);
    if (!retriable || attempt >= MAX) throw err;
    await sleep(attempt * 2000);
    return request(url, kind, attempt + 1);
  }
}

/** First real project image in the post body, preferring the -web-main file. */
function pickImage(html) {
  const srcs = [...String(html).matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) =>
    m[1].replace(/&amp;/g, '&')
  );
  const clean = srcs.filter((u) => u.startsWith('http') && !isJunk(u));
  if (!clean.length) return null;
  const main = clean.find((u) => /-web-main\.\w+$/i.test(u));
  return main ?? clean[0];
}

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

/* ------------------------------------------------------------------- run */

const only = process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number);
const wanted = only.length ? new Set(only) : null;

const records = JSON.parse(await readFile(catalogueFile, 'utf8'));
let state = { done: {} };
try {
  state = JSON.parse(await readFile(stateFile, 'utf8'));
} catch {
  /* first run */
}
state.done ??= {};

  await mkdir(imageDir, { recursive: true });

const todo = records.filter(
  (r) => (!wanted || wanted.has(r.sourceId)) && !(r.sourceId in state.done)
);
console.log(`› ${todo.length} outstanding of ${records.length} total`);
if (!todo.length) {
  console.log('✓ nothing to do');
  process.exit(0);
}

const byId = new Map(todo.map((r) => [r.sourceId, r]));
const noImage = [];
let saved = 0;
let bytes = 0;
const failures = [];

/** Resolves one record: pick its image URL, download it, update the record. */
async function resolveOne(r, url) {
  const label = `${r.sourceId}`;

  if (!url) {
    noImage.push({ sourceId: r.sourceId, title: r.title });
    state.done[r.sourceId] = null;
    return;
  }

  const ext = (extname(url.split('?')[0]) || '.jpg').toLowerCase();
  const name = `M20-${label}${ext}`;
  const dest = resolve(imageDir, name);

  try {
    await stat(dest);
  } catch {
    const buf = await request(url, 'buffer');
    if (buf.byteLength < 1024) throw new Error('suspiciously small');
    await writeFile(dest, buf);
    bytes += buf.byteLength;
  }

  r.image = `/images/${name}`;
  state.done[r.sourceId] = name;
  saved += 1;
}

const batches = chunk([...byId.keys()], POST_BATCH);
const queue = [];

for (let bi = 0; bi < batches.length; bi++) {
  const ids = batches[bi];
  const url =
    `${ORIGIN}/wp-json/wp/v2/posts?per_page=${POST_BATCH}` +
    `&include=${ids.join(',')}&_fields=id,content`;

  let posts = null;
  try {
    posts = await request(url, 'json');
  } catch (err) {
    console.warn(`\n  batch ${bi + 1}/${batches.length} failed: ${err.message}`);
    if (err instanceof BlockedError) {
      await checkpoint();
      console.error(
        `\n✗ stopped after ${Object.keys(state.done).length}/${records.length} resolved. ` +
          `The site is refusing requests; wait a few minutes and re-run this script.`
      );
      process.exit(2);
    }
  }

  const seen = new Set();
  if (posts) {
    for (const p of posts) {
      seen.add(p.id);
      const r = byId.get(p.id);
      if (r) queue.push([r, pickImage(p?.content?.rendered || '')]);
    }
  }

  /*
   * A failed batch request must never look like "this post has no image" — that
   * silently burns the record and it never gets retried. Anything the API did not
   * actually answer is left unresolved and picked up by the solo pass below.
   */
  if (!posts) {
    console.warn(`  batch ${bi + 1}/${batches.length} unanswered; deferring ${ids.length}`);
  } else {
    for (const id of ids) if (!seen.has(id)) queue.push([byId.get(id), undefined]);
  }

  process.stdout.write(
    `\r  posts ${Math.min((bi + 1) * POST_BATCH, todo.length)}/${todo.length} · ` +
      `queued ${queue.length}`
  );

  if (bi < batches.length - 1) await sleep(BATCH_DELAY_MS);
}
console.log('');

/* Download with a small worker pool. */
let qi = 0;
let doneCount = 0;
async function worker() {
  while (qi < queue.length) {
    const item = queue[qi++];
    try {
      await resolveOne(item[0], item[1]);
    } catch (err) {
      failures.push(item[0].sourceId);
      console.warn(`  ${item[0].sourceId} FAILED: ${err.message}`);
      if (err instanceof BlockedError) {
        await checkpoint();
        console.error(
          `\n✗ stopped after ${Object.keys(state.done).length}/${records.length} resolved. ` +
            `The site is refusing requests; wait a few minutes and re-run this script.`
        );
        process.exit(2);
      }
    }
    doneCount += 1;
    if (doneCount % 20 === 0) {
      process.stdout.write(
        `\r  done ${doneCount}/${queue.length} · saved ${saved} · no image ${noImage.length}`
      );
      await checkpoint();
    }
    await sleep(DOWNLOAD_DELAY_MS);
  }
}
await Promise.all(Array.from({ length: DOWNLOAD_WORKERS }, worker));
console.log('');

/* Fallback: fetch anything the batch pass could not resolve, one at a time. */
const retry = queue.filter(([, u]) => u === undefined);
if (retry.length) {
  console.log(`  retrying ${retry.length} unanswered post(s) individually…`);
  for (const item of retry) {
    const r = item[0];
    try {
      const post = await request(
        `${ORIGIN}/wp-json/wp/v2/posts/${r.sourceId}?_fields=id,content`,
        'json'
      );
      const url = pickImage(post?.content?.rendered || '');
      const at = queue.indexOf(item);
      if (at >= 0) queue[at] = [r, url];
    } catch (err) {
      console.warn(`  ${r.sourceId} still unreachable: ${err.message}`);
    }
    await sleep(BATCH_DELAY_MS);
  }
  for (let i = 0; i < queue.length; i++) {
    const [r, url] = queue[i];
    /* undefined = the solo fetch also failed; leave it unresolved for next run. */
    if (url === undefined || r.sourceId in state.done) continue;
    try {
      await resolveOne(r, url);
    } catch (err) {
      console.warn(`  ${r.sourceId} FAILED: ${err.message}`);
    }
    await sleep(DOWNLOAD_DELAY_MS);
  }
}

await checkpoint();

/* Record which entries have no photo, so nothing retries them. */
try {
  const meta = JSON.parse(await readFile(metaFile, 'utf8'));
  const allNoImage = [
    ...(meta.images?.withoutImage ?? []),
    ...noImage.map((n) => n.sourceId),
  ];
  meta.images = {
    fetchedAt: new Date().toISOString(),
    source: 'nevonprojects.com — first project image in each post body',
    note:
      'Local copies of each post\'s first project image, stored in public/images/. ' +
      'Posts whose body contained no project image are listed in withoutImage.',
    withImage: Object.values(state.done).filter(Boolean).length,
    withoutImage: [...new Set(allNoImage)],
  };
  await writeFile(metaFile, JSON.stringify(meta, null, 2), 'utf8');
} catch (err) {
  console.warn(`  could not update catalogue.meta.json: ${err.message}`);
}

const totalDone = Object.keys(state.done).length;
console.log(
  `\n✓ ${totalDone}/${records.length} resolved · ${saved} saved this run · ` +
    `${noImage.length} without an image · ${failures.length} failed`
);
if (bytes) console.log(`  ${(bytes / 1024 / 1024).toFixed(1)} MB downloaded this run`);
if (failures.length) console.log(`  failed ids: ${failures.slice(0, 20).join(', ')}`);
