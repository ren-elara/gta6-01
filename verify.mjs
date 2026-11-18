import assert from 'node:assert/strict';
import { createRandom, normalizeSeed } from './game/src/random.js';
import { createWorld } from './game/src/world.js';
import { saveGame, loadGame } from './game/src/save.js';
import { missionBriefing, pursuitStatus } from './game/src/world.js';

const idle = { axis: () => ({ x: 0, y: 0 }), sprint: () => false, firing: () => false, aim: () => null };
const snapshot = (world) => JSON.stringify({
  seed: world.state.seed,
  buildings: world.state.buildings,
  vehicles: world.state.vehicles,
  peds: world.state.peds,
  player: world.state.player,
});

assert.equal(normalizeSeed('7'), 7);
assert.equal(normalizeSeed(' 7', 11), 11, 'URL whitespace falls back instead of changing the requested seed');
assert.equal(normalizeSeed('7e0', 11), 11, 'exponent notation is rejected as an ambiguous seed');
assert.equal(normalizeSeed('not-a-seed', 11), 11);

const first = createWorld(createRandom(7), 7);
const second = createWorld(createRandom(7), 7);
assert.equal(snapshot(first), snapshot(second), 'same seed must produce the same city and actors');
assert.equal(missionBriefing(first.state).findIndex((row) => !row.done), 0);

const run = createWorld(createRandom(7), 7);
run.state.player.x = 700; run.state.player.y = 560;
run.step(1 / 60, idle);
assert.equal(run.state.mission, 1, 'the opening meet-up advances the first mission');
assert.equal(missionBriefing(run.state).findIndex((row) => !row.done), 1);
run.state.inCar = true; run.state.carId = 0;
run.state.player.x = 1420; run.state.player.y = 1220;
run.state.vehicles[0].x = 1420; run.state.vehicles[0].y = 1220;
run.step(1 / 60, idle);
assert.equal(run.state.missionStep, 2, 'the package handoff starts the wanted escape');
assert.equal(missionBriefing(run.state).findIndex((row) => !row.done), 2);
run.state.wanted = 0; run.state.heat = 0;
run.state.inCar = false; run.state.carId = -1;
run.state.player.x = 710; run.state.player.y = 560;
run.state.vehicles[0].x = 710; run.state.vehicles[0].y = 560;
run.step(1 / 60, idle);
assert.equal(run.state.mission, 2, 'returning cleanly unlocks Cobalt Yard');
run.state.player.x = 2740; run.state.player.y = 1680;
run.state.inCar = false; run.state.carId = -1;
run.step(1 / 60, idle);
assert.equal(run.state.enemies.filter((enemy) => enemy.guard).length, 3, 'yard encounter creates three guards');
run.state.enemies.forEach((enemy) => { if (enemy.guard) enemy.health = 0; });
run.step(1 / 60, idle);
assert.equal(run.state.mission, 3, 'clearing guards completes the chapter');
assert.equal(run.state.cash, 4050, 'mission payouts remain intact');

const storage = new Map();
globalThis.localStorage = { setItem(key, value) { storage.set(key, value); }, getItem(key) { return storage.get(key) ?? null; } };
assert.equal(saveGame(run.state), true, 'a valid run is saveable');
assert.equal(loadGame().state.cash, 4050, 'a saved completed run restores its ledger');
storage.set('neon-harbor-afterglow.save.v1', 'x'.repeat(100001));
assert.equal(loadGame(), null, 'oversized save data is rejected before parsing');

const chase = createWorld(createRandom(7), 7);
assert.ok(chase.interact(), 'opening coupe is reachable');
assert.ok(chase.state.inCar && chase.state.wanted && chase.state.enemies.length);
const moving = { ...idle, axis: () => ({ x: 0, y: -1 }) };
const origin = chase.state.player.x;
for (let frame = 0; frame < 30; frame++) chase.step(1 / 60, moving);
assert.ok(chase.state.player.x > origin + 30, 'acceleration moves the player and car');
assert.ok(chase.interact(), 'safe vehicle exit');
assert.equal(chase.state.inCar, false);
chase.state.player.x = 3420; chase.state.player.y = 340;
chase.state.enemies = [];
assert.equal(pursuitStatus(chase.state).spotted, false);
for (let frame = 0; frame < 541; frame++) chase.step(1 / 60, idle);
assert.equal(chase.state.wanted, 0, 'unseen chase expires after nine simulation seconds');
await import('./verify-contracts.mjs');

console.log('verify.mjs: deterministic city, mission route, payouts, save restore, and bounded parsing passed');
