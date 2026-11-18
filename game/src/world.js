import { CITY, COMBAT, DISTRICTS, FEEDBACK, LANDMARKS, PLAYER, POLICE, ROAD_X, ROAD_Y, VEHICLE } from './config.js';
import { acceptContract, emptyContracts, endContract, handoffContract, resultText, routeById, tickContract } from './contracts.js';

export const EVENT_NONE = 0;
export const EVENT_SHOT = 1;
export const EVENT_HIT = 2;
export const EVENT_MISSION = 4;
export const EVENT_ALERT = 8;
export const EVENT_CASH = 16;
export const EVENT_TARGET_HIT = 32;
export const EVENT_ESCAPE = 64;
export const EVENT_IMPACT = 128;
export const EVENT_COURIER_FAIL = 256;

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const blocksPoint = (buildings, x, y, radius = 0) => buildings.some((b) => x + radius > b.x && x - radius < b.x + b.width && y + radius > b.y && y - radius < b.y + b.height);

export function clearSight(buildings, from, to) {
  const steps = Math.ceil(dist(from, to) / 12);
  for (let i = 1; i < steps; i += 1) {
    if (blocksPoint(buildings, from.x + (to.x - from.x) * i / steps, from.y + (to.y - from.y) * i / steps)) return false;
  }
  return true;
}

export function missionObjective(state) {
  if (state.mission === 0) return { ...LANDMARKS.lantern, text: 'Meet Kira at the Blue Lantern' };
  if (state.mission === 1 && state.missionStep === 1) return { ...LANDMARKS.market, text: 'Take a car to Sunline Market' };
  if (state.mission === 1) return { ...LANDMARKS.lantern, text: state.wanted ? 'Lose Bluewatch, then return to Kira' : 'Deliver the package to Kira' };
  if (state.mission === 2) return { ...LANDMARKS.yard, text: state.missionStep ? `Clear the yard: ${state.enemies.filter((e) => e.guard).length} guards left` : 'Recover the signal at Cobalt Yard' };
  return { ...LANDMARKS.yard, text: 'Signal recovered. Chapter complete.' };
}

// The prompt and interaction share exactly the same range and obstruction rule.
export function nearbyVehicle(state) {
  if (state.inCar) return null;
  let closest = null;
  let nearest = VEHICLE.entryRange;
  for (const car of state.vehicles) {
    const gap = dist(state.player, car);
    if (!car.occupied && gap < nearest && clearSight(state.buildings, state.player, car)) {
      nearest = gap;
      closest = car;
    }
  }
  return closest;
}

export function pursuitStatus(state) {
  if (!state.wanted) return { label: 'STREETS CLEAR', seconds: 0, spotted: false };
  const spotted = state.enemies.some((enemy) => dist(enemy, state.player) < POLICE.sightRange && clearSight(state.buildings, enemy, state.player));
  return {
    spotted,
    seconds: Math.ceil(state.heat * POLICE.escapeSeconds),
    label: spotted ? 'SPOTTED / BREAK LINE OF SIGHT' : 'SEARCHING / STAY OUT OF SIGHT',
  };
}

export function missionBriefing(state) {
  if (state.mission < 2) return [
    { label: 'Meet Kira at the Blue Lantern', done: state.mission > 0 },
    { label: 'Collect the Sunline package in a car', done: state.missionStep === 2 },
    { label: 'Lose Bluewatch and return to Kira', done: false },
  ];
  return [
    { label: 'Deliver the Sunline package', done: true },
    { label: 'Reach the signal at Cobalt Yard', done: state.missionStep === 1 || state.mission === 3 },
    { label: 'Defeat all three yard guards', done: state.mission === 3 },
  ];
}

function freshFeedback() {
  return { hit: 0, damage: 0, impact: 0, district: 0, hitX: 0, hitY: 0 };
}

function makeCar(random, index) {
  const horizontal = index % 2 === 0;
  const colors = ['#f4c95d', '#ef785f', '#4c9eb5', '#e8e3d2', '#875d8e', '#3b786d'];
  const forward = index % 4 < 2;
  return { id: index, x: horizontal ? 380 + random() * 3000 : ROAD_X[index % ROAD_X.length] + (forward ? -30 : 30), y: horizontal ? ROAD_Y[index % ROAD_Y.length] + (forward ? 30 : -30) : 150 + random() * 2050, angle: horizontal ? (forward ? 0 : Math.PI) : (forward ? Math.PI / 2 : -Math.PI / 2), speed: 70 + random() * 100, color: colors[index % colors.length], occupied: false, police: false, ai: true };
}

export function createWorld(random, seed = 7) {
  const buildings = [];
  const buildingColors = ['#d3775e', '#c45f64', '#d99d68', '#7e9a8a', '#6f8ca0', '#e1b071'];
  for (let row = 0; row < ROAD_Y.length - 1; row += 1) {
    for (let column = 0; column < ROAD_X.length - 1; column += 1) {
      const x = ROAD_X[column] + 112;
      const y = ROAD_Y[row] + 112;
      const width = (ROAD_X[column + 1] - x - 112) * (0.8 + random() * 0.2);
      const height = (ROAD_Y[row + 1] - y - 112) * (0.8 + random() * 0.2);
      const lot = { x, y, width, height };
      if (Object.values(LANDMARKS).some((point) => blocksPoint([lot], point.x, point.y, 170))) continue;
      buildings.push({ ...lot, color: buildingColors[(row + column) % buildingColors.length], floors: 2 + Math.floor(random() * 4), label: ['SOLANA', 'PALMS', 'MARLIN', 'AFTERHOURS'][(row + column) % 4] });
    }
  }
  const vehicles = [];
  for (let index = 0; index < 24; index += 1) vehicles.push(makeCar(random, index));
  // Keep the opening playable: a parked coupe waits just east of the Blue Lantern.
  Object.assign(vehicles[0], { x: 790, y: 560, angle: 0, speed: 0, color: '#2bb6ad', ai: false });
  const vehicleStarts = vehicles.map((car) => ({ ...car }));
  const peds = [];
  for (let index = 0; index < 38; index += 1) peds.push({ x: ROAD_X[index % ROAD_X.length] + 83, y: 220 + random() * 1950, phase: random() * 8, color: ['#ef805f', '#4a8891', '#f5c568', '#d9d8c8'][index % 4], speed: 18 + random() * 25 });
  const pedestrianStarts = peds.map((ped) => ({ ...ped }));
  const state = {
    seed: seed >>> 0, time: 0, player: { x: 710, y: 560, angle: 0, health: PLAYER.maxHealth, fireCooldown: 0, invulnerable: 0 },
    buildings, vehicles, peds, bullets: [], enemies: [], particles: [],
    cash: 1250, wanted: 0, heat: 0, dispatchTimer: 0, mission: 0, missionStep: 0, inCar: false, carId: -1,
    district: 'Marina Azul', notification: 'Find Kira at the Blue Lantern', notificationTime: 6,
    feedback: freshFeedback(), contracts: emptyContracts(),
  };

  function reset() {
    const records = state.contracts.records;
    state.contracts = { ...emptyContracts(), records };
    state.time = 0; state.player.x = 710; state.player.y = 560; state.player.angle = 0; state.player.health = PLAYER.maxHealth; state.player.fireCooldown = 0; state.player.invulnerable = 0;
    state.cash = 1250; state.wanted = 0; state.heat = 0; state.dispatchTimer = 0; state.mission = 0; state.missionStep = 0; state.inCar = false; state.carId = -1;
    state.enemies.length = 0; state.bullets.length = 0;
    state.particles.length = 0;
    for (let index = 0; index < state.vehicles.length; index += 1) Object.assign(state.vehicles[index], vehicleStarts[index]);
    for (let index = 0; index < state.peds.length; index += 1) Object.assign(state.peds[index], pedestrianStarts[index]);
    state.district = 'Marina Azul';
    state.feedback = freshFeedback();
    state.notification = 'Find Kira at the Blue Lantern'; state.notificationTime = 6;
  }
  function notify(message, seconds = 3) { state.notification = message; state.notificationTime = seconds; }
  function move(body, dx, dy, radius) {
    const x = clamp(body.x + dx, 350 + radius, CITY.width - radius - 12);
    const y = clamp(body.y + dy, radius + 12, CITY.height - radius - 12);
    let blocked = false;
    if (!blocksPoint(buildings, x, body.y, radius)) body.x = x; else blocked = true;
    if (!blocksPoint(buildings, body.x, y, radius)) body.y = y; else blocked = true;
    return blocked;
  }
  function spark(x, y, color) {
    for (let i = 0; i < 6; i += 1) {
      const angle = i * Math.PI / 3 + state.time;
      state.particles.push({ x, y, vx: Math.cos(angle) * 90, vy: Math.sin(angle) * 90, life: 0.35, color });
    }
  }
  function addPolice() {
    if (state.enemies.filter((enemy) => !enemy.guard).length >= POLICE.maxUnits) return;
    const angle = state.time * 1.7 + state.enemies.length * 2.1;
    const x = clamp(state.player.x + Math.cos(angle) * 450, 360, CITY.width - 120);
    const y = clamp(state.player.y + Math.sin(angle) * 450, 120, CITY.height - 120);
    const road = ROAD_X.reduce((a, b) => Math.abs(a - x) < Math.abs(b - x) ? a : b);
    state.enemies.push({ x: road, y, health: 45, cooldown: 0, phase: state.enemies.length, guard: false });
  }
  function reportCrime(level = 1) {
    state.wanted = Math.max(state.wanted, level);
    state.heat = 1;
    if (state.dispatchTimer <= 0 && state.enemies.length < state.wanted + 1) { addPolice(); state.dispatchTimer = 6; }
  }
  function fire() {
    const angle = state.player.angle;
    // Begin at the player, so a guard inside the visual muzzle still takes a hit.
    state.bullets.push({ x: state.player.x, y: state.player.y, vx: Math.cos(angle) * COMBAT.bulletSpeed, vy: Math.sin(angle) * COMBAT.bulletSpeed, life: COMBAT.bulletLife, friendly: true });
    reportCrime(state.mission === 2 && state.missionStep === 1 ? 2 : 1);
    return EVENT_SHOT;
  }
  function damagePlayer(amount) {
    if (state.player.invulnerable > 0) return EVENT_NONE;
    state.player.health -= amount;
    state.feedback.damage = FEEDBACK.damageSeconds;
    state.player.invulnerable = 0.8;
    if (state.player.health <= 0) {
      const car = state.vehicles.find((item) => item.id === state.carId);
      if (car) { car.occupied = false; car.speed = 0; }
      Object.assign(state.player, { health: PLAYER.maxHealth, x: 710, y: 560, angle: 0, invulnerable: 3 });
      state.inCar = false; state.carId = -1; state.wanted = 0; state.heat = 0;
      state.enemies.length = 0; state.bullets.length = 0;
      state.dispatchTimer = 0;
      Object.assign(state.vehicles[0], vehicleStarts[0]);
      if (state.mission === 2) state.missionStep = 0;
      const failed = endContract(state.contracts, 'clinic');
      notify(failed ? resultText(failed) : 'Harbor Clinic: patched up. Your job is still waiting.', 5);
      if (failed) return EVENT_HIT | EVENT_COURIER_FAIL;
    }
    return EVENT_HIT;
  }
  function interact() {
    if (state.inCar) {
      const car = state.vehicles.find((item) => item.id === state.carId);
      if (!car) { state.inCar = false; state.carId = -1; return false; }
      const exit = [Math.PI / 2, -Math.PI / 2, Math.PI, 0].map((offset) => ({
        x: clamp(car.x + Math.cos(car.angle + offset) * 57, 370, CITY.width - 35),
        y: clamp(car.y + Math.sin(car.angle + offset) * 57, 35, CITY.height - 35),
      })).find((point) => !blocksPoint(buildings, point.x, point.y, PLAYER.radius));
      if (!exit) { notify('Door blocked. Move the car into the street.'); return false; }
      state.inCar = false;
      car.occupied = false; car.ai = false; car.speed = 0;
      Object.assign(state.player, exit);
      state.carId = -1;
      notify('On foot. Find your next move.', 2);
      return true;
    }
    const closest = nearbyVehicle(state);
    if (!closest) { notify('No car nearby. Approach a vehicle and press E.'); return false; }
    closest.occupied = true; closest.ai = false;
    state.inCar = true;
    state.carId = closest.id;
    state.player.x = closest.x;
    state.player.y = closest.y;
    state.player.angle = closest.angle;
    reportCrime();
    notify('Vehicle acquired. W A S D to drive.', 3);
    return true;
  }
  function acceptCourier(id) {
    if (state.mission === 3 || !acceptContract(state.contracts, id)) return false;
    notify(`Courier booked: ${routeById(id).pickup.name}. G to collect.`, 5);
    return true;
  }
  function cancelCourier() {
    const result = endContract(state.contracts, 'cancelled');
    if (result) notify(resultText(result), 5);
    return Boolean(result);
  }
  function courierHandoff() {
    const result = handoffContract(state);
    if (!result) { notify('Reach the violet depot and slow down. G hands off the parcel.'); return null; }
    notify(result.outcome === 'picked-up' ? `Parcel aboard. Deliver to ${routeById(state.contracts.active.id).destination.name}.` : resultText(result), 6);
    return result;
  }
  function updateMission() {
    const p = state.player;
    if (state.mission === 0 && dist(p, { x: 700, y: 560 }) < 95) { state.mission = 1; state.missionStep = 1; notify('Kira: Take the teal coupe to Sunline Market', 5); return EVENT_MISSION; }
    if (state.mission === 1 && state.missionStep === 1 && state.inCar && dist(p, LANDMARKS.market) < 150) { state.missionStep = 2; state.cash += 400; reportCrime(2); notify('Package secured. Lose the patrol and reach the marina', 5); return EVENT_CASH; }
    if (state.mission === 1 && state.missionStep === 2 && dist(p, { x: 710, y: 560 }) < 170 && state.wanted === 0) { state.mission = 2; state.missionStep = 0; state.cash += 900; notify('Kira: Clean work. The night market is yours now.', 5); return EVENT_MISSION; }
    if (state.mission === 2 && state.missionStep === 0 && dist(p, LANDMARKS.yard) < 170) {
      state.missionStep = 1;
      for (let i = 0; i < COMBAT.guardCount; i += 1) {
        state.enemies.push({ x: LANDMARKS.yard.x + (i - 1) * 145, y: LANDMARKS.yard.y + 58, health: COMBAT.guardHealth, cooldown: 1, phase: i, guard: true });
      }
      state.wanted = Math.max(2, state.wanted); state.heat = 1;
      notify('Signal found. Defeat the three Bluewatch guards.', 5);
      return EVENT_ALERT;
    }
    // Ambient patrols may keep arriving: only the yard's guards gate this chapter.
    if (state.mission === 2 && state.missionStep === 1 && !state.enemies.some((enemy) => enemy.guard)) {
      state.mission = 3; state.missionStep = 0; state.cash += 1500;
      state.wanted = 0; state.heat = 0; state.enemies.length = 0;
      state.bullets.length = 0;
      endContract(state.contracts, 'chapter');
      notify('Chapter complete: Signal in the Rain', 6);
      return EVENT_CASH | EVENT_MISSION;
    }
    return EVENT_NONE;
  }

  function step(dt, input) {
    if (!Number.isFinite(dt) || dt <= 0 || state.mission === 3) return EVENT_NONE;
    dt = Math.min(dt, 1 / 30);
    let events = EVENT_NONE;
    for (const key of ['hit', 'damage', 'impact', 'district']) {
      state.feedback[key] = Math.max(0, state.feedback[key] - dt);
    }
    state.time += dt; state.notificationTime = Math.max(0, state.notificationTime - dt); state.player.fireCooldown = Math.max(0, state.player.fireCooldown - dt); state.player.invulnerable = Math.max(0, state.player.invulnerable - dt);
    state.dispatchTimer = Math.max(0, state.dispatchTimer - dt);
    const axis = input.axis(); const magnitude = Math.hypot(axis.x, axis.y) || 1;
    if (state.inCar) {
      const car = state.vehicles[state.carId]; const throttle = -axis.y; const turn = axis.x;
      const braking = throttle && Math.sign(throttle) !== Math.sign(car.speed) && Math.abs(car.speed) > 10;
      car.speed += throttle * (braking ? VEHICLE.brake : VEHICLE.acceleration) * dt;
      if (!throttle) car.speed *= Math.pow(0.12, dt);
      car.speed = clamp(car.speed, -VEHICLE.reverseSpeed, VEHICLE.maxSpeed);
      car.angle += turn * VEHICLE.turnRate * dt * Math.min(1, Math.abs(car.speed) / 180) * (car.speed < 0 ? -1 : 1);
      if (move(car, Math.cos(car.angle) * car.speed * dt, Math.sin(car.angle) * car.speed * dt, VEHICLE.radius)) {
        if (Math.abs(car.speed) > 140) {
          spark(car.x, car.y, '#f8c95d');
          state.feedback.impact = FEEDBACK.impactSeconds;
          events |= EVENT_IMPACT;
        }
        car.speed *= -0.15;
      }
      state.player.x = car.x; state.player.y = car.y; state.player.angle = car.angle;
    } else {
      const speed = input.sprint() ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
      move(state.player, axis.x / magnitude * speed * dt, axis.y / magnitude * speed * dt, PLAYER.radius);
      if (axis.x || axis.y) state.player.angle = Math.atan2(axis.y, axis.x);
    }
    const aim = input.aim?.();
    if (aim) state.player.angle = Math.atan2(aim.y - state.player.y, aim.x - state.player.x);
    for (const car of state.vehicles) if (car.ai && !car.occupied) {
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      if (car.x < 355 || car.x > CITY.width - 40 || car.y < 40 || car.y > CITY.height - 40) { car.angle += Math.PI; car.x = clamp(car.x, 355, CITY.width - 40); car.y = clamp(car.y, 40, CITY.height - 40); }
    }
    for (const ped of state.peds) {
      ped.phase += dt;
      const panic = state.wanted > 0 && dist(ped, state.player) < 220;
      const angle = panic ? Math.atan2(ped.y - state.player.y, ped.x - state.player.x) : ped.phase * 0.6;
      move(ped, Math.cos(angle) * ped.speed * dt * (panic ? 3 : 1), Math.sin(angle) * ped.speed * dt * (panic ? 3 : 1), 8);
    }
    for (const particle of state.particles) { particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.life -= dt; }
    state.particles = state.particles.filter((particle) => particle.life > 0).slice(-120);
    if (input.firing() && state.player.fireCooldown === 0) { state.player.fireCooldown = PLAYER.fireCooldown; events |= fire(); }
    for (const bullet of state.bullets) {
      bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt; bullet.life -= dt;
      if (blocksPoint(buildings, bullet.x, bullet.y)) { bullet.life = 0; spark(bullet.x, bullet.y, '#f8c95d'); }
      for (const enemy of state.enemies) if (bullet.life > 0 && enemy.health > 0 && bullet.friendly && dist(bullet, enemy) < 30) {
        enemy.health -= COMBAT.damage; bullet.life = 0;
        Object.assign(state.feedback, { hit: FEEDBACK.hitSeconds, hitX: enemy.x, hitY: enemy.y });
        events |= EVENT_TARGET_HIT;
        spark(enemy.x, enemy.y, enemy.guard ? '#ff725c' : '#6c9fff');
        if (enemy.health <= 0) { state.cash += 100; notify(enemy.guard ? 'Yard guard defeated +$100' : 'Patrol neutralized +$100', 2); events |= EVENT_CASH; }
        break;
      }
    }
    state.bullets = state.bullets.filter((bullet) => bullet.life > 0 && bullet.x > 0 && bullet.x < CITY.width && bullet.y > 0 && bullet.y < CITY.height); state.enemies = state.enemies.filter((enemy) => enemy.health > 0);
    for (const enemy of state.enemies) {
      if (!state.wanted && !enemy.guard) continue;
      const angle = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
      move(enemy, Math.cos(angle) * (70 + state.wanted * 20) * dt, Math.sin(angle) * (70 + state.wanted * 20) * dt, 14);
      enemy.cooldown -= dt;
      if (dist(enemy, state.player) < 40 && enemy.cooldown <= 0 && clearSight(buildings, enemy, state.player)) { enemy.cooldown = 1.2; events |= damagePlayer(8); }
    }
    if (state.wanted) {
      const { spotted } = pursuitStatus(state);
      state.heat = clamp(state.heat + (spotted ? dt * 0.25 : -dt / POLICE.escapeSeconds), 0, 1);
      if (state.heat === 0) { state.wanted = 0; state.enemies = state.enemies.filter((enemy) => enemy.guard); notify('Patrol lost. The streets are clear.', 3); events |= EVENT_ESCAPE; }
      else if (spotted && state.dispatchTimer === 0 && state.enemies.length < state.wanted + 1) { addPolice(); state.dispatchTimer = 6; }
    }
    const district = DISTRICTS.find((item) => state.player.x >= item.x && state.player.x < item.x + item.width && state.player.y >= item.y && state.player.y < item.y + item.height);
    const districtName = district ? district.name : 'Harbor Fringe';
    if (districtName !== state.district) state.feedback.district = FEEDBACK.districtSeconds;
    state.district = districtName;
    const expired = tickContract(state.contracts);
    if (expired) { notify(resultText(expired), 6); events |= EVENT_COURIER_FAIL; }
    events |= updateMission(); return events;
  }
  reset();
  return { state, reset, step, notify, damagePlayer, addPolice, interact, acceptCourier, cancelCourier, courierHandoff };
}
