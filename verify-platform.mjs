import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, linkSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { request } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Run with a TypeScript-capable Node. Child processes keep this repository as
// cwd even when testing a metadata-free source copy or a server fixture.
const repo = dirname(fileURLToPath(import.meta.url));
const temp = mkdtempSync(join(repo, '.platform-check-'));
const loader = process.env.NEON_NODE_LOADER;
const runtime = loader ? { command: loader, args: ['--library-path', process.env.NEON_NODE_LIBRARIES, process.env.NEON_NODE_BINARY] } : { command: process.execPath, args: [] };
const run = (entry, env = {}, args = []) => spawnSync(runtime.command, [...runtime.args, entry, ...args], { cwd: repo, env: { ...process.env, ...env }, encoding: 'utf8', timeout: 10000 });
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sourceFiles = ['main.ts', 'serve.ts', 'game', 'screenshots', 'vendor'];
const fixture = join(temp, 'checkout');
mkdirSync(fixture);
for (const name of sourceFiles) cpSync(join(repo, name), join(fixture, name), { recursive: true });
const tree = (dir, prefix = '') => readdirSync(join(dir, prefix)).sort().flatMap((name) => {
  const path = join(prefix, name), file = join(dir, path), info = lstatSync(file);
  assert.equal(info.isSymbolicLink(), false);
  return info.isDirectory() ? tree(dir, path) : [[path, hash(readFileSync(file))]];
});
const build = (output) => run(join(fixture, 'main.ts'), { MAKEFUN_OUTPUT_DIR: output });
const reject = (output, label) => assert.notEqual(build(output).status, 0, label);
const rawRequest = (path, method = 'GET') => new Promise((resolve, reject) => {
  const req = request({ hostname: '127.0.0.1', port: 8093, path, method }, (response) => {
    const chunks = [];
    response.on('data', (data) => chunks.push(data));
    response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks) }));
    response.on('error', reject);
  });
  req.on('error', reject); req.end();
});
let server;
try {
  const baseline = tree(fixture);
  const output = join(temp, 'built');
  assert.equal(build(output).status, 0, 'build without .git or .makefun');
  const first = tree(output);
  assert.equal(build(output).status, 0);
  assert.deepEqual(tree(output), first);
  const { buildDossier } = await import('./vendor/makefun-game.ts');
  assert.equal(hash(readFileSync(join(output, 'dossier.json'))), hash(buildDossier(output, {
    text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, game_max_files: 993, game_max_bytes: 50331648, game_path_max_bytes: 1000,
  })), 'output dossier matches unchanged vendor on final files');
  for (const path of [fixture, temp, dirname(temp), join(fixture, 'game'), join(fixture, 'game', 'new'), join(fixture, '.git'), join(fixture, '.makefun', 'new')]) reject(path, 'source/ancestor/metadata guard');
  const alias = join(temp, 'alias');
  symlinkSync(fixture, alias);
  for (const path of [alias, join(alias, 'game'), join(alias, 'game', 'new')]) reject(path, 'resolved source alias');
  const dangling = join(temp, 'dangling');
  symlinkSync(join(temp, 'absent'), dangling); reject(dangling, 'dangling alias');
  for (const name of ['game', 'screenshots', 'dossier.json']) {
    const directory = join(temp, `alias-${name.replace('.', '-')}`); mkdirSync(directory);
    symlinkSync(join(fixture, name === 'dossier.json' ? 'main.ts' : name), join(directory, name));
    reject(directory, 'output child alias');
  }
  assert.deepEqual(tree(fixture), baseline, 'rejected outputs do not mutate source');
  const linked = join(temp, 'hardlink'); mkdirSync(linked);
  const sentinel = join(linked, 'sentinel.ts');
  writeFileSync(sentinel, 'export const original = true;\n');
  linkSync(sentinel, join(linked, 'dossier.json'));
  reject(linked, 'dossier hardlink or host-emulated link');
  assert.equal(readFileSync(sentinel, 'utf8'), 'export const original = true;\n');
  if (lstatSync(join(linked, 'dossier.json')).isSymbolicLink()) console.log('NOTE host emulates hardlinks as symlinks; native nlink branch requires a native filesystem');
  assert.equal(hash(readFileSync(join(fixture, 'vendor/makefun-game.ts'))), 'dc67187521b24025ff952f8c231485a6eb92d6d71d29edd2a08154ffb4376129');
  console.log('PASS clean-checkout build, deterministic dossier parity, lexical/resolved/child/hardlink guards and source integrity');

  symlinkSync(join(fixture, 'main.ts'), join(fixture, 'game', 'escape.js'));
  symlinkSync(join(fixture, 'game', 'src', 'config.js'), join(fixture, 'game', 'inside.mjs'));
  // A file readable to stat but unreadable as a stream (proc files cannot report
  // a useful length) is not portable. Test client-abort stream cleanup directly;
  // then remove a large fixture during another read and require server survival.
  writeFileSync(join(fixture, 'game', 'large.bin'), Buffer.alloc(4 * 1024 * 1024, 65));
  server = spawn(runtime.command, [...runtime.args, join(fixture, 'serve.ts'), '--port', '8093'], { cwd: repo, stdio: 'ignore' });
  let ready = false;
  for (let tries = 0; tries < 60; tries++) {
    try { ready = (await rawRequest('/')).status === 200; } catch {}
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.ok(ready, 'server honors port');
  const get = await rawRequest('/src/main.js');
  const head = await rawRequest('/src/main.js', 'HEAD');
  assert.equal(get.status, 200); assert.equal(head.status, 200);
  assert.match(get.headers['content-type'], /^text\/javascript/);
  assert.equal(head.body.length, 0);
  assert.equal(Number(head.headers['content-length']), get.body.length);
  assert.equal((await rawRequest('/inside.mjs')).status, 200);
  assert.equal((await rawRequest('/escape.js')).status, 403);
  for (const path of ['/%zz', '/%00', '/%5c..%5cmain.ts', 'http://[invalid/']) assert.equal((await rawRequest(path)).status, 400, path);
  assert.equal((await rawRequest('/%2e%2e%2fmain.ts')).status, 403);
  assert.equal((await rawRequest('/missing')).status, 404);
  assert.equal((await rawRequest('/src/')).status, 404);
  const post = await rawRequest('/', 'POST');
  assert.equal(post.status, 405); assert.equal(post.headers.allow, 'GET, HEAD');
  await new Promise((resolve) => {
    const req = request('http://127.0.0.1:8093/large.bin', (response) => {
      response.once('data', () => { response.destroy(); req.destroy(); resolve(); });
    });
    req.on('error', () => resolve()); req.end();
  });
  rmSync(join(fixture, 'game', 'large.bin'));
  assert.equal((await rawRequest('/large.bin')).status, 404);
  assert.equal((await rawRequest('/')).status, 200, 'server survives disconnected streams');
  for (const port of ['0', '65536', 'x', '1.5']) assert.notEqual(run(join(fixture, 'serve.ts'), {}, ['--port', port]).status, 0);
  assert.notEqual(run(join(fixture, 'serve.ts'), {}, ['--port']).status, 0);
  console.log('PASS GET/HEAD parity, module MIME, malformed URLs, traversal, symlink confinement, stream disconnects and invalid ports');
} finally {
  if (server && server.exitCode === null) { server.kill(); await new Promise((resolve) => server.once('exit', resolve)); }
  rmSync(temp, { recursive: true, force: true });
}
