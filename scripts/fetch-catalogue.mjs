/**
 * One-off catalogue builder.
 *
 * Pulls factual listing metadata (id, title, permalink, category, date) from the
 * nevonprojects.com WordPress REST API and writes src/data/catalogue.json.
 *
 * Only listing metadata is collected: titles, URLs, category names and dates.
 * No article body text is fetched or stored. Titles are stored HTML-decoded.
 *
 * Usage:  node scripts/fetch-catalogue.mjs
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ORIGIN = 'https://nevonprojects.com';
const PER_PAGE = 100;
const FIELDS = 'id,title,link,categories,date';
const FIELDS_CAT = 'id,name,slug,parent,count';

const here = dirname(fileURLToPath(import.meta.url));
const outFile = resolve(here, '..', 'src', 'data', 'catalogue.json');
const metaFile = resolve(here, '..', 'src', 'data', 'catalogue.meta.json');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJSON(url, attempt = 1) {
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': 'M20-Learning-Index/1.0 (catalogue builder)' },
    });
    if (res.status === 429 || res.status >= 500) {
      if (attempt > 5) throw new Error(`giving up on ${url} (${res.status})`);
      const wait = attempt * 2000;
      console.warn(`  ${res.status} — retry ${attempt} in ${wait}ms`);
      await sleep(wait);
      return getJSON(url, attempt + 1);
    }
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
    return { data: await res.json(), total: Number(res.headers.get('x-wp-total') || 0) };
  } catch (err) {
    if (attempt > 5) throw err;
    const wait = attempt * 2000;
    console.warn(`  network error (${err.message}) — retry ${attempt} in ${wait}ms`);
    await sleep(wait);
    return getJSON(url, attempt + 1);
  }
}

const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '\u2013',
  mdash: '\u2014',
  hellip: '\u2026',
  rsquo: '\u2019',
  lsquo: '\u2018',
  ldquo: '\u201c',
  rdquo: '\u201d',
};

function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (match, body) => {
    if (body.startsWith('#')) {
      const code =
        body[1] === 'x' || body[1] === 'X'
          ? Number.parseInt(body.slice(2), 16)
          : Number.parseInt(body.slice(1), 10);
      return Number.isInteger(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });
}

function stripHTML(s) {
  return decodeEntities(String(s).replace(/<[^>]*>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();
}

console.log('› resolving categories');
const cats = [];
for (let page = 1; ; page++) {
  const { data, total } = await getJSON(
    `${ORIGIN}/wp-json/wp/v2/categories?per_page=${PER_PAGE}&page=${page}&_fields=${FIELDS_CAT}`
  );
  cats.push(...data);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  console.log(`  page ${page}/${pages} — ${cats.length} categories`);
  if (page >= pages) break;
  await sleep(400);
}
const catById = new Map(cats.map((c) => [c.id, c]));

console.log('› fetching posts');
const posts = [];
for (let page = 1; ; page++) {
  const url = `${ORIGIN}/wp-json/wp/v2/posts?per_page=${PER_PAGE}&page=${page}&_fields=${FIELDS}&orderby=date&order=desc`;
  const { data, total } = await getJSON(url);
  posts.push(...data);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  if (page % 5 === 0 || page === pages) {
    console.log(`  page ${page}/${pages} — ${posts.length} posts`);
  }
  if (page >= pages) break;
  await sleep(400);
}

/* Drop HTML entities in titles and map category ids to names. */
const seen = new Set();
const records = [];
for (const p of posts) {
  const title = stripHTML(p.title?.rendered || '');
  if (!title) continue;
  if (seen.has(p.link)) continue;
  seen.add(p.link);

  const branchNames = (p.categories || [])
    .map((id) => catById.get(id)?.name)
    .filter(Boolean)
    .filter((n) => !['Uncategorized', 'Featured'].includes(n));

  records.push({
    sourceId: p.id,
    title,
    url: p.link,
    date: (p.date || '').slice(0, 10),
    categories: branchNames,
  });
}

await mkdir(dirname(outFile), { recursive: true });
await writeFile(
  outFile,
  JSON.stringify(records, null, 0),
  'utf8'
);
await writeFile(
  metaFile,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      source: `${ORIGIN}/ (listing metadata only)`,
      endpoint: '/wp-json/wp/v2/posts + /wp-json/wp/v2/categories',
      note:
        'Titles, permalinks, category names and dates only. No article body text ' +
        'is stored. Follow the permalink for the full write-up.',
      count: records.length,
    },
    null,
    2
  ),
  'utf8'
);

console.log(`\n✓ wrote ${records.length} records`);
console.log(`  ${outFile}`);
console.log(`  ${metaFile}`);
