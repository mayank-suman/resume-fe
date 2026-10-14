// Copies the compiled CV (packages/cv/cv.pdf) into public/ so the site can
// offer it as a download. Run `npm run cv:build` at the repo root first.
import { copyFileSync, existsSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const source = path.join(path.dirname(require.resolve('@mayank/cv/package.json')), 'cv.pdf');
const target = path.resolve('public/mayank-suman-cv.pdf');

if (existsSync(source)) {
  copyFileSync(source, target);
  console.log(`CV synced: ${path.relative(process.cwd(), target)}`);
} else {
  rmSync(target, { force: true });
  console.warn('No packages/cv/cv.pdf found; the site will build without the CV download. Run `npm run cv:build` first.');
}
