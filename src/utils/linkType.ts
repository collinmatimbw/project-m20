/** Shared helpers for the free-text resource-link "type" field. */

/** Offered as datalist shortcuts; anything else can be typed. */
export const LINK_TYPE_SUGGESTIONS = [
  'GitHub repository',
  'Documentation',
  'Video walkthrough',
  'Write-up / article',
  'Other resource',
];

const ICONS: [string[], string][] = [
  [['github', 'git', 'code', 'repo'], '⌥'],
  [['doc', 'readme', 'guide'], '☷'],
  [['video', 'youtube', 'watch', 'demo'], '▶'],
  [['write', 'article', 'blog', 'note'], '✎'],
];

/** Best-effort icon for whatever free text was entered. */
export function linkTypeIcon(type: string): string {
  const key = type.trim().toLowerCase();
  for (const [needles, icon] of ICONS) {
    if (needles.some((n) => key.includes(n))) return icon;
  }
  return '↗';
}
