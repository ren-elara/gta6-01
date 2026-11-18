import assert from 'node:assert/strict';
import { COURIER, DISTRICTS, SAVE_SLOT, STEP, VEHICLE } from './game/src/config.js';
import { createRandom, normalizeSeed } from './game/src/random.js';
import { blocksPoint, createWorld, EVENT_COURIER_FAIL } from './game/src/world.js';
import { ROUTES, contractPrompt, courierRank, emptyContracts, limitTicks, validateContracts } from './game/src/contracts.js';
import { loadGame, saveGame } from './game/src/save.js';
import { courierClick } from './game/src/courier-menu.js';

const idle = { axis: () => ({ x: 0, y: 0 }), sprint: () => false, firing: () => false };
const fresh = () => createWorld(createRandom(7), 7);
const tick = (world, count = 1) => { let events = 0; for (let i = 0; i < count; i++) events |= world.step(STEP, idle); return events; };
const moveTo = (world, point) => Object.assign(world.state.player, point);
const storage = new Map();
globalThis.localStorage = { setItem: (k, v) => storage.set(k, v), getItem: (k) => storage.get(k) ?? null };
const readSave = () => JSON.parse(storage.get(SAVE_SLOT));
const loadData = (data) => { storage.set(SAVE_SLOT, JSON.stringify(data)); return loadGame(); };

for (const bad of [-1, 4294967296, Infinity, NaN, 1.1, '+7', '-7', '4294967296', '0'.repeat(100000), ' 7', '7e0', null]) assert.equal(normalizeSeed(bad, 11), 11);
assert.equal(normalizeSeed('4294967295'), 4294967295);
assert.equal(normalizeSeed('0'), 0);
assert.equal(normalizeSeed(null, -1), 7);

// Endpoints are in the advertised districts and clear with a car-sized margin
// across varied city seeds. Sample each suggested road corridor as well.
const roadRoutes = [
  [[880, 560], [880, 780], [1980, 780]],
  [[1980, 780], [880, 780], [880, 1680]],
  [[880, 1680], [880, 2110], [3070, 2110]],
  [[3070, 2110], [430, 2110], [430, 780]],
];
for (const seed of [0, 7, 42, 2026, 0xffffffff]) {
  const world = createWorld(createRandom(seed), seed);
  for (const [index, route] of ROUTES.entries()) {
    for (const [point, districtName] of [[route.pickup, route.from], [route.destination, route.to]]) {
      assert.ok(!blocksPoint(world.state.buildings, point.x, point.y, VEHICLE.radius));
      assert.equal(DISTRICTS.find((d) => point.x >= d.x && point.x < d.x + d.width && point.y >= d.y && point.y < d.y + d.height)?.name, districtName);
    }
    const path = roadRoutes[index];
    for (let i = 1; i < path.length; i++) {
      const [ax, ay] = path[i - 1], [bx, by] = path[i];
      for (let part = 0; part <= 100; part++) assert.ok(!blocksPoint(world.state.buildings, ax + (bx - ax) * part / 100, ay + (by - ay) * part / 100, VEHICLE.radius));
    }
  }
}

const run = fresh();
tick(run);
const story = [run.state.mission, run.state.missionStep];
assert.equal(run.acceptCourier('unknown'), false);
assert.equal(run.acceptCourier(ROUTES[0].id), true);
assert.equal(run.acceptCourier(ROUTES[1].id), false);
assert.equal(run.courierHandoff(), null, 'cannot collect from the opening position');
moveTo(run, ROUTES[0].pickup);
assert.match(contractPrompt(run.state), /COLLECT/);
assert.equal(run.courierHandoff().outcome, 'picked-up');
tick(run, 60);
assert.equal(run.state.contracts.active.ticks, 60, 'time uses simulation ticks');
const frozen = JSON.stringify(run.state.contracts);
for (const dt of [0, -1, NaN, Infinity]) run.step(dt, idle);
assert.equal(JSON.stringify(run.state.contracts), frozen);
moveTo(run, ROUTES[0].destination);
const cashBefore = run.state.cash;
const delivered = run.courierHandoff();
assert.equal(delivered.reward, ROUTES[0].reward + COURIER.expressBonus);
assert.equal(run.state.cash, cashBefore + delivered.reward);
assert.equal(run.courierHandoff(), null);
assert.equal(run.state.cash, cashBefore + delivered.reward, 'no duplicate payout');
assert.deepEqual([run.state.mission, run.state.missionStep], story);
assert.equal(run.state.contracts.records[ROUTES[0].id].bestTicks, 60);

// Repeating a route increments its record, preserves the faster time, and pays
// only its base reward after the express target has passed.
assert.ok(run.acceptCourier(ROUTES[0].id));
moveTo(run, ROUTES[0].pickup); run.courierHandoff();
tick(run, Math.round(ROUTES[0].par / STEP) + 1);
moveTo(run, ROUTES[0].destination);
assert.equal(run.courierHandoff().reward, ROUTES[0].reward);
assert.deepEqual(run.state.contracts.records[ROUTES[0].id], { completed: 2, bestTicks: 60 });
assert.equal(saveGame(run.state), true);
const finishedSave = readSave();
const restored = loadData(finishedSave);
assert.ok(restored);
const loadedCash = restored.state.cash;
assert.equal(restored.courierHandoff(), null);
assert.equal(restored.state.cash, loadedCash, 'loading a result never pays again');
restored.reset();
assert.deepEqual(restored.state.contracts.records, run.state.contracts.records, 'chapter restart keeps courier records');
assert.equal(restored.state.cash, 1250);

for (const route of ROUTES) {
  const attempt = fresh();
  tick(attempt);
  assert.ok(attempt.acceptCourier(route.id));
  moveTo(attempt, route.pickup); tick(attempt);
  assert.equal(attempt.courierHandoff().outcome, 'picked-up');
  moveTo(attempt, route.destination);
  assert.equal(attempt.courierHandoff().outcome, 'delivered');
  assert.ok(validateContracts(attempt.state.contracts));
}
assert.equal(courierRank(Object.fromEntries(ROUTES.map((r) => [r.id, { completed: 1 }]))).name, 'CITY CONNECTOR');

for (const phase of ['pickup', 'delivery']) {
  const expiry = fresh(); tick(expiry); expiry.acceptCourier(ROUTES[0].id);
  if (phase === 'delivery') { moveTo(expiry, ROUTES[0].pickup); expiry.courierHandoff(); }
  tick(expiry, limitTicks(ROUTES[0]) - 1);
  assert.ok(expiry.state.contracts.active);
  assert.ok(tick(expiry) & EVENT_COURIER_FAIL);
  assert.equal(expiry.state.contracts.result.outcome, 'expired');
  assert.equal(expiry.state.cash, 1250);
  assert.ok(validateContracts(expiry.state.contracts));
  assert.ok(expiry.acceptCourier(ROUTES[0].id), 'expired contracts can retry immediately');
  assert.ok(expiry.cancelCourier());
  assert.equal(expiry.cancelCourier(), false);
  assert.equal(expiry.state.contracts.result.outcome, 'cancelled');
  assert.deepEqual([expiry.state.mission, expiry.state.missionStep], [1, 1]);
}

const driving = fresh(); tick(driving); driving.interact();
driving.acceptCourier(ROUTES[0].id);
Object.assign(driving.state.vehicles[0], ROUTES[0].pickup, { speed: COURIER.handoffSpeed + 1 });
moveTo(driving, ROUTES[0].pickup);
assert.equal(driving.courierHandoff(), null, 'a fast pass cannot hand off');
driving.state.vehicles[0].speed = COURIER.handoffSpeed;
assert.equal(driving.courierHandoff().outcome, 'picked-up');
tick(driving, 10);
saveGame(driving.state);
const inTransit = readSave();
assert.equal(loadData(inTransit).state.contracts.active.phase, 'delivery');
assert.equal(loadGame().state.contracts.active.ticks, 10);
driving.state.player.invulnerable = 0;
driving.damagePlayer(100);
assert.equal(driving.state.contracts.result.outcome, 'clinic');
assert.equal(driving.state.mission, 1);
assert.ok(driving.acceptCourier(ROUTES[0].id));

const chapter = fresh();
chapter.state.mission = 2; chapter.state.missionStep = 1;
chapter.acceptCourier(ROUTES[0].id);
tick(chapter);
assert.equal(chapter.state.mission, 3);
assert.equal(chapter.state.contracts.result.outcome, 'chapter');
const chapterTicks = chapter.state.time; tick(chapter, 60);
assert.equal(chapter.state.time, chapterTicks);
assert.equal(chapter.acceptCourier(ROUTES[1].id), false);

const old = structuredClone(inTransit); old.version = 4; delete old.contracts;
assert.deepEqual(loadData(old).state.contracts, emptyContracts(), 'version 4 remains compatible');
for (const mutate of [
  (d) => { delete d.contracts; },
  (d) => { d.contracts.active.id = 'not-a-route'; },
  (d) => { d.contracts.active.phase = 'delivered'; },
  (d) => { d.contracts.active.ticks = -1; },
  (d) => { d.contracts.active.ticks = 0.5; },
  (d) => { d.contracts.active.ticks = limitTicks(ROUTES[0]); },
  (d) => { d.contracts.records.unknown = { completed: 1, bestTicks: 1 }; },
  (d) => { d.contracts.records = []; },
  (d) => { d.mission = 3; d.missionStep = 0; d.wanted = 0; d.heat = 0; d.enemies = []; },
]) {
  const bad = structuredClone(inTransit); mutate(bad);
  assert.equal(loadData(bad), null, 'invalid in-transit save must be rejected');
}
for (const mutate of [
  (c) => { c.result.reward += 1; },
  (c) => { c.result.outcome = 'paid'; },
  (c) => { c.result.best = true; },
  (c) => { c.records[ROUTES[0].id].bestTicks = 0; },
  (c) => { c.records[ROUTES[0].id].completed = COURIER.maxCompletions + 1; },
  (c) => { c.records[ROUTES[0].id].completed = 1.5; },
  (c) => { c.result = { ...c.result, outcome: 'cancelled' }; },
]) {
  const data = structuredClone(finishedSave); mutate(data.contracts);
  assert.equal(loadData(data), null, 'invalid result or record must be rejected');
}
assert.deepEqual(courierClick({ x: 200, y: 175 }), { select: 0 });
assert.deepEqual(courierClick({ x: 200, y: 580 }), { accept: true });
assert.deepEqual(courierClick({ x: 700, y: 580 }), { cancel: true });
assert.equal(courierClick({ x: -1, y: 580 }), null);
console.log('PASS courier lifecycle, all road corridors, timing, speed checks, payouts, retries, records, clinic/chapter closure, v4 migration and invalid saves');
