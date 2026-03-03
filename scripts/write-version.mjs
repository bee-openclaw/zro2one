import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

let hash = 'dev';
try {
  hash = execSync('git rev-parse --short HEAD', { cwd: join(__dirname, '..') })
    .toString()
    .trim();
} catch {
  // not a git repo or no commits yet
}

const versionFile = join(publicDir, 'version.json');
writeFileSync(versionFile, JSON.stringify({ version: hash }));
console.log(`[version] wrote ${versionFile} → ${hash}`);
