/**
 * Catalogue access.
 *
 * The catalogue is ~420 kB of listing metadata, so it is loaded lazily and
 * cached: the record list is only needed once the index page mounts.
 *
 * Provenance: titles, permalinks, category names and dates are listing metadata
 * pulled from the nevonprojects.com WordPress REST API. No article body text is
 * stored. Project images are separate local copies under public/images/, added by
 * scripts/fetch-images.mjs. See scripts/fetch-catalogue.mjs and catalogue.meta.json.
 */

import rawMeta from './catalogue.meta.json';
import type { Project } from '../types';

export interface CatalogueEntry {
  sourceId: number;
  title: string;
  url: string;
  date: string;
  categories: string[];
  /** Local copy of the post's project image, e.g. "/images/M20-35087.jpg". */
  image?: string | null;
  /**
   * Entries below are optional overrides carried by projects posted manually
   * from the admin console. Imported catalogue records never set them, so branch
   * and level keep being derived from the title and categories for those.
   */
  custom?: boolean;
  branch?: Project['branch'];
  level?: Project['level'];
  /** Admin-written overview shown as the specification's opening section. */
  summary?: string;
}

export interface CatalogueMeta {
  generatedAt: string;
  source: string;
  endpoint: string;
  note: string;
  count: number;
}

export const CATALOGUE_META = rawMeta as CatalogueMeta;

/** Total records in the catalogue, as recorded when the metadata was fetched. */
export const CATALOGUE_COUNT = rawMeta.count;

/** Site category -> the five M20 branches used elsewhere in the app. */
const BRANCH_MAP: Record<string, string> = {
  'Electronics Projects': 'Electronics',
  'Hardware Projects': 'Electronics',
  Arduino: 'Electronics',
  Embedded: 'Electronics',
  'IT Projects': 'Software',
  'Engineering/Diploma/Bsc-IT/Msc-IT Projects': 'Software',
  'Software installation': 'Software',
  'Android Projects': 'Software',
  'iOS Projects': 'Software',
  'Cloud Computing': 'Software',
  'NS2/NS3 Projects': 'Software',
  'J2me Projects': 'Software',
  Games: 'Software',
  'Maths / Calculations': 'Software',
  'Mechanical Projects': 'Mechanical',
  'Mechanical Design': 'Mechanical',
  Pneumatic: 'Mechanical',
  'Mini Projects': 'Mechanical',
};

export function deriveBranch(categories: string[]): string | null {
  for (const c of categories) {
    const b = BRANCH_MAP[c];
    if (b) return b;
  }
  return null;
}

/**
 * Source ids of manually posted projects start here: imported records come from
 * the source site's post ids (five digits), so this range cannot collide.
 */
export const CUSTOM_ID_BASE = 9_000_000;

/** Branch for an entry: an admin-posted override first, derivation second. */
export function branchOf(entry: CatalogueEntry): string | null {
  return entry.branch ?? deriveBranch(entry.categories);
}

let cache: Promise<CatalogueEntry[]> | null = null;

const NAMED_ENTITIES: Record<string, string> = {
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

/**
 * WordPress returns titles HTML-escaped, and the stored JSON keeps that raw
 * form, so decode once on load rather than at fetch time.
 */
function decodeTitle(s: string): string {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (match, body: string) => {
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

export function loadCatalogue(): Promise<CatalogueEntry[]> {
  if (!cache) {
    cache = import('./catalogue.json').then((m) =>
      ((m.default ?? m) as CatalogueEntry[]).map((e) =>
        e.title.includes('&') ? { ...e, title: decodeTitle(e.title) } : e
      )
    );
  }
  return cache;
}
