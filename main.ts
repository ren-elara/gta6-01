// Neon Harbor: Afterglow follows Kira's courier through a coastal city and a Bluewatch standoff.
// Its static canvas game includes traffic, pedestrians, vehicle theft, driving, aimed combat,
// police pursuit, two connected jobs, local saves, and a live chapter-completion transition.
// This standard-library entry copies the game and actual browser captures to the output folder,
// then delegates the deterministic source-and-image dossier to the unchanged kit library.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, lstatSync, mkdirSync, realpathSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, basename, join, resolve, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const sourceRoot = realpathSync(here);
const out = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
const inside = (parent: string, child: string) => {
  const path = relative(parent, child);
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path));
};
// Resolve missing suffixes against the nearest real ancestor. In the grader,
// /bot has no Git metadata and /output may not have been created yet.
function prospectivePath(path: string): string {
  try { return realpathSync(path); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    try {
      if (lstatSync(path).isSymbolicLink()) throw new Error('Dangling output alias refused.');
    } catch (missing) {
      if ((missing as NodeJS.ErrnoException).code !== 'ENOENT') throw missing;
    }
    const parent = dirname(path);
    if (parent === path) throw error;
    return join(prospectivePath(parent), basename(path));
  }
}
const protectedRoots = ['game', 'screenshots', 'vendor', '.git', '.makefun'];
function checkOutput(path: string) {
  if (inside(path, sourceRoot) || protectedRoots.some((name) => inside(join(sourceRoot, name), path) || inside(prospectivePath(join(here, name)), path))) {
    throw new Error('Output must be separate from source and metadata directories. Use MAKEFUN_OUTPUT_DIR=out.');
  }
  // Output children are replaced, never followed through a link or hardlink.
  for (const name of ['game', 'screenshots', 'dossier.json']) {
    try {
      const entry = lstatSync(join(path, name));
      if (entry.isSymbolicLink() || (entry.isFile() && entry.nlink > 1)) throw new Error(`Output alias refused: ${name}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
}
checkOutput(out);
checkOutput(prospectivePath(out));
const screenshots = join(here, 'screenshots');
const captures = readdirSync(screenshots, { withFileTypes: true }).filter((entry) => !entry.name.startsWith('.'));
if (captures.length < 3 || captures.length > 4 || captures.some((entry) => !entry.isFile() || entry.name.length > 128 || !/^[A-Za-z0-9][A-Za-z0-9._ -]*\.(jpe?g|png)$/i.test(entry.name))) {
  throw new Error('Provide three or four browser screenshots before building the dossier.');
}
for (const capture of captures) {
  if (statSync(join(screenshots, capture.name)).size > 262144) throw new Error(`Screenshot ${capture.name} exceeds 256 KiB.`);
}

const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};
// Validate and assemble before touching previous output. The vendor uses only
// game/ and screenshots/, so these are the exact bytes it will derive from out/.
const dossier = buildDossier(here, caps);
if (Buffer.byteLength(dossier) > 1572864) throw new Error('Dossier exceeds the competition cap.');
mkdirSync(out, { recursive: true });
checkOutput(realpathSync(out));
// Remove only generated subtrees, so repeated builds cannot retain stale assets.
for (const name of ['game', 'screenshots']) rmSync(join(out, name), { recursive: true, force: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

rmSync(join(out, 'dossier.json'), { force: true });
writeFileSync(join(out, 'dossier.json'), dossier, { flag: 'wx' });
