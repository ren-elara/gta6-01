import { CITY, COMBAT, DISTRICTS, PLAYER, POLICE, SAVE_MAX_CHARACTERS, SAVE_SLOT, SAVE_VERSION, VEHICLE } from './config.js';
import { createRandom } from './random.js';
import { blocksPoint, createWorld } from './world.js';
import { emptyContracts, validateContracts } from './contracts.js';

// Reconstruct the saved city before restoring actors: a new page may have a different seed.
export function saveGame(state) {
  try {
    const { seed, player, cash, mission, missionStep, wanted, heat, inCar, carId, vehicles, peds, enemies, time, dispatchTimer, contracts } = state;
    localStorage.setItem(SAVE_SLOT, JSON.stringify({ version: SAVE_VERSION, seed, player, cash, mission, missionStep, wanted, heat, inCar, carId, vehicles, peds, enemies, time, dispatchTimer, contracts }));
    return true;
  } catch { return false; }
}

const within = (value, low, high) => Number.isFinite(value) && value >= low && value <= high;
const integer = (value, low, high) => Number.isInteger(value) && within(value, low, high);
const position = (item) => item && within(item.x, 350, CITY.width - 12) && within(item.y, 12, CITY.height - 12);

export function loadGame() {
  try {
    // Bound parsing work before allocating a replacement city. A corrupted slot
    // must not stall the frame loop or disturb the currently playable run.
    const serialized = localStorage.getItem(SAVE_SLOT);
    if (!serialized || serialized.length > SAVE_MAX_CHARACTERS) return null;
    const data = JSON.parse(serialized);
    if (!data || ![4, SAVE_VERSION].includes(data.version) || !integer(data.seed, 0, 0xffffffff) || !position(data.player)) return null;
    const contracts = data.version === 4 ? emptyContracts() : validateContracts(data.contracts);
    if (!contracts || (data.mission === 3 && contracts.active)) return null;
    if (!within(data.player.health, 1, PLAYER.maxHealth) || !Number.isFinite(data.player.angle)) return null;
    if (!integer(data.cash, 0, 1e9) || !integer(data.mission, 0, 3) || !integer(data.missionStep, 0, 2)) return null;
    if ((data.mission === 0 || data.mission === 3) && data.missionStep !== 0) return null;
    if (data.mission === 1 && ![1, 2].includes(data.missionStep)) return null;
    if (data.mission === 2 && data.missionStep > 1) return null;
    if (!integer(data.wanted, 0, 5) || !within(data.heat, 0, 1) || !within(data.time, 0, 1e9) || !within(data.dispatchTimer, 0, 6)) return null;
    if (!data.wanted && data.heat !== 0) return null;
    const world = createWorld(createRandom(data.seed), data.seed);
    const state = world.state;
    const clear = (actor, radius) => position(actor) && !blocksPoint(state.buildings, actor.x, actor.y, radius);
    if (!clear(data.player, data.inCar ? VEHICLE.radius : PLAYER.radius)) return null;
    if (!Array.isArray(data.vehicles) || data.vehicles.length !== state.vehicles.length) return null;
    if (typeof data.inCar !== 'boolean' || (data.inCar ? !integer(data.carId, 0, state.vehicles.length - 1) : data.carId !== -1)) return null;
    const vehicles = data.vehicles.map((saved, index) => {
      if (!clear(saved, VEHICLE.radius) || saved.id !== index || !Number.isFinite(saved.angle) || !within(saved.speed, -VEHICLE.reverseSpeed, VEHICLE.maxSpeed) || typeof saved.ai !== 'boolean') throw new Error('Invalid car');
      const occupied = data.inCar && data.carId === index;
      return { ...state.vehicles[index], x: saved.x, y: saved.y, angle: saved.angle, speed: saved.speed, ai: occupied ? false : saved.ai, occupied };
    });
    if (data.inCar && Math.hypot(data.player.x - vehicles[data.carId].x, data.player.y - vehicles[data.carId].y) > 1) return null;
    if (!Array.isArray(data.enemies) || data.enemies.length > POLICE.maxUnits + COMBAT.guardCount) return null;
    const enemies = data.enemies.map((saved) => {
      if (!clear(saved, 14) || !within(saved.health, 1, saved.guard ? COMBAT.guardHealth : 45) || !Number.isFinite(saved.cooldown) || typeof saved.guard !== 'boolean') throw new Error('Invalid patrol');
      return { x: saved.x, y: saved.y, health: saved.health, cooldown: Math.max(0, Math.min(1.2, saved.cooldown)), phase: 0, guard: saved.guard };
    });
    const guards = enemies.filter((enemy) => enemy.guard).length;
    if (guards > COMBAT.guardCount || enemies.length - guards > POLICE.maxUnits) return null;
    if (data.mission === 2 && data.missionStep === 1 ? guards === 0 : guards !== 0) return null;
    if ((!data.wanted && enemies.length !== guards) || (data.mission === 3 && data.wanted)) return null;
    if (!Array.isArray(data.peds) || data.peds.length !== state.peds.length) return null;
    const peds = data.peds.map((saved, index) => {
      if (!clear(saved, 8) || !within(saved.phase, 0, 1e9 + 10)) throw new Error('Invalid pedestrian');
      return { ...state.peds[index], x: saved.x, y: saved.y, phase: saved.phase };
    });
    // No caller state changes until every field, encounter and collision check has passed.
    Object.assign(state, { cash: data.cash, mission: data.mission, missionStep: data.missionStep, wanted: data.wanted, heat: data.heat, time: data.time, dispatchTimer: data.dispatchTimer, inCar: data.inCar, carId: data.carId, vehicles, peds, enemies, contracts });
    Object.assign(state.player, { x: data.player.x, y: data.player.y, angle: data.player.angle, health: data.player.health, fireCooldown: 0, invulnerable: 1 });
    state.district = DISTRICTS.find((d) => state.player.x >= d.x && state.player.x < d.x + d.width && state.player.y >= d.y && state.player.y < d.y + d.height)?.name || 'Harbor Fringe';
    world.notify('Game loaded. Your next move is waiting.');
    // Feedback is transient: fresh timers prevent a saved impact from replaying.
    state.feedback.district = 0;
    return world;
  } catch { return null; }
}
