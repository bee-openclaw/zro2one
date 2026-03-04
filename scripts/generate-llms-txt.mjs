/**
 * generate-llms-txt.mjs
 * Generates public/llms.txt and public/llms-ctx.txt at build time.
 * Format: https://llmstxt.org/
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, basename } from 'path';
import { existsSync } from 'fs';

const CONTENT_DIR = new URL('../src/content/learn/', import.meta.url).pathname;
const PUBLIC_DIR = new URL('../public/', import.meta.url).pathname;
const SITE_URL = 'https://zro2.one';

// Pillar display names and order
const PILLAR_META = {
  foundations: { label: 'AI Foundations', order: 1 },
  current:     { label: 'This Week in AI', order: 2 },
  practice:    { label: 'Practice & Tools', order: 3 },
  building:    { label: 'Building with AI', order: 4 },
  futures:     { label: 'Futures & Research', order: 5 },
  industry:    { label: 'Industry & Applications', order: 6 },
};

/**
 * Parse YAML-ish frontmatter from a markdown file.
 * Returns { data, body } — data is an object of key/value pairs.
 */
function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };

  const yamlBlock = match[1];
  const body = match[2] ?? '';
  const data = {};

  for (const line of yamlBlock.split('\n')) {
    const kv = line.match(/^(\w[\w-]*):\s*(.+)$/);
    if (!kv) continue;
    const key = kv[1];
    let val = kv[2].trim();

    // Strip inline comments
    val = val.replace(/\s*#.*$/, '').trim();

    // Array: [a, b, c]
    if (val.startsWith('[') && val.endsWith(']')) {
      data[key] = val.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
    } else {
      // Strip surrounding quotes
      data[key] = val.replace(/^['"]|['"]$/g, '');
    }
  }

  return { data, body };
}

async function run() {
  // Ensure public dir exists
  if (!existsSync(PUBLIC_DIR)) {
    await mkdir(PUBLIC_DIR, { recursive: true });
  }

  const files = (await readdir(CONTENT_DIR)).filter(f => f.endsWith('.md'));

  const articles = [];

  for (const file of files) {
    const raw = await readFile(join(CONTENT_DIR, file), 'utf-8');
    const { data, body } = parseFrontmatter(raw);

    if (data.draft === 'true' || data.draft === true) continue;

    const slug = basename(file, '.md');
    articles.push({
      slug,
      title: data.title ?? slug,
      description: data.description ?? '',
      pillar: data.pillar ?? 'foundations',
      date: data.date ?? '',
      body: body.trim(),
    });
  }

  // Sort articles within each pillar by date descending, then title
  articles.sort((a, b) => {
    if (a.date && b.date) return b.date.localeCompare(a.date);
    return a.title.localeCompare(b.title);
  });

  // Group by pillar
  const byPillar = {};
  for (const article of articles) {
    const p = article.pillar;
    if (!byPillar[p]) byPillar[p] = [];
    byPillar[p].push(article);
  }

  // Sort pillars by defined order, unknowns last
  const sortedPillars = Object.keys(byPillar).sort((a, b) => {
    const oa = PILLAR_META[a]?.order ?? 99;
    const ob = PILLAR_META[b]?.order ?? 99;
    return oa - ob;
  });

  // ── Build llms.txt (frontmatter summary only) ──────────────────────────────
  const lines = [
    `# Zro2One`,
    ``,
    `> AI education for everyone — from essential to research depth.`,
    ``,
  ];

  const breakdown = {};

  for (const pillar of sortedPillars) {
    const label = PILLAR_META[pillar]?.label ?? pillar;
    const items = byPillar[pillar];
    breakdown[label] = items.length;

    lines.push(`## ${label}`);
    lines.push(``);

    for (const a of items) {
      const desc = a.description ? ` ${a.description}` : '';
      lines.push(`- [${a.title}](${SITE_URL}/learn/${a.slug}):${desc}`);
    }

    lines.push(``);
  }

  const llmsTxt = lines.join('\n').trimEnd() + '\n';
  await writeFile(join(PUBLIC_DIR, 'llms.txt'), llmsTxt, 'utf-8');
  console.log(`✅ public/llms.txt — ${articles.length} articles across ${sortedPillars.length} pillars`);

  // ── Build llms-ctx.txt (full body included) ────────────────────────────────
  const ctxLines = [
    `# Zro2One`,
    ``,
    `> AI education for everyone — from essential to research depth.`,
    `> Full article content included for LLM context.`,
    ``,
  ];

  for (const pillar of sortedPillars) {
    const label = PILLAR_META[pillar]?.label ?? pillar;
    const items = byPillar[pillar];

    ctxLines.push(`## ${label}`);
    ctxLines.push(``);

    for (const a of items) {
      ctxLines.push(`### [${a.title}](${SITE_URL}/learn/${a.slug})`);
      if (a.description) ctxLines.push(`> ${a.description}`);
      ctxLines.push(``);
      ctxLines.push(a.body);
      ctxLines.push(``);
      ctxLines.push(`---`);
      ctxLines.push(``);
    }
  }

  const llmsCtxTxt = ctxLines.join('\n').trimEnd() + '\n';
  await writeFile(join(PUBLIC_DIR, 'llms-ctx.txt'), llmsCtxTxt, 'utf-8');
  console.log(`✅ public/llms-ctx.txt — full content included`);

  // Print breakdown for reporting
  console.log('\nSection breakdown:');
  for (const [label, count] of Object.entries(breakdown)) {
    console.log(`  ${label}: ${count} articles`);
  }
}

run().catch(err => {
  console.error('❌ generate-llms-txt failed:', err);
  process.exit(1);
});
