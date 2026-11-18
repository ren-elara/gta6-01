// Neon Harbor: Afterglow follows Kira's courier through a coastal city and a Bluewatch standoff.
// Its static canvas game includes traffic, pedestrians, vehicle theft, driving, aimed combat,
// police pursuit, two connected jobs, local saves, and a live chapter-completion transition.
// This standard-library entry copies the game and actual browser captures to the output folder,
// then delegates the deterministic source-and-image dossier to the unchanged kit library.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
const relativeSource = relative(out, here);
if (!relativeSource || (!relativeSource.startsWith('..') && !isAbsolute(relativeSource)) || ['game', 'screenshots', 'vendor', '.git', '.makefun'].some((folder) => out === join(here, folder) || out.startsWith(join(here, folder) + '/'))) {
  throw new Error('Output must be separate from source directories. Use MAKEFUN_OUTPUT_DIR=out.');
}
const captures = readdirSync(join(here, 'screenshots')).filter((name) => !name.startsWith('.'));
if (captures.length < 3 || captures.length > 4 || captures.some((name) => !/\.(jpe?g|png)$/i.test(name))) {
  throw new Error('Provide three or four browser screenshots before building the dossier.');
}

mkdirSync(out, { recursive: true });
// Remove only generated subtrees, so repeated builds cannot retain stale assets.
for (const name of ['game', 'screenshots']) rmSync(join(out, name), { recursive: true, force: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
