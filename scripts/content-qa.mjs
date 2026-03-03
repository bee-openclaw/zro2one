import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dir = path.join(root, 'src/content/learn');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));

const slugs = new Set(files.map((f) => f.replace(/\.md$/, '')));
let errors = 0;
let warnings = 0;

const required = ['title', 'depth', 'pillar', 'topic', 'date', 'readTime', 'description'];

function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return null;
  return m[1];
}

function getField(fm, key) {
  const rx = new RegExp(`^${key}:\\s*(.+)$`, 'm');
  const m = fm.match(rx);
  return m ? m[1].trim() : null;
}

for (const file of files) {
  const p = path.join(dir, file);
  const raw = fs.readFileSync(p, 'utf8');
  const slug = file.replace(/\.md$/, '');
  const fm = parseFrontmatter(raw);

  if (!fm) {
    console.log(`ERROR ${file}: missing frontmatter`);
    errors++;
    continue;
  }

  for (const key of required) {
    if (!getField(fm, key)) {
      console.log(`ERROR ${file}: missing required frontmatter key '${key}'`);
      errors++;
    }
  }

  const body = raw.replace(/^---\n[\s\S]*?\n---\n/, '').trim();
  const wordCount = body.split(/\s+/).filter(Boolean).length;
  if (wordCount < 180) {
    console.log(`WARN  ${file}: short content (${wordCount} words)`);
    warnings++;
  }

  if (/\b(TODO|lorem ipsum|coming soon)\b/i.test(body)) {
    console.log(`WARN  ${file}: contains placeholder text`);
    warnings++;
  }

  const rel = getField(fm, 'related');
  if (rel && rel.startsWith('[') && rel.endsWith(']')) {
    const items = rel
      .slice(1, -1)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.replace(/^['"]|['"]$/g, ''));

    for (const r of items) {
      if (!slugs.has(r)) {
        console.log(`ERROR ${file}: related link '${r}' does not match any article slug`);
        errors++;
      }
      if (r === slug) {
        console.log(`ERROR ${file}: related link includes self ('${r}')`);
        errors++;
      }
    }
  }
}

console.log(`\nQA summary: ${files.length} articles checked, ${errors} errors, ${warnings} warnings.`);
if (errors > 0) process.exit(1);
