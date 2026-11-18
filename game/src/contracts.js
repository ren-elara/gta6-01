import { COURIER, STEP } from './config.js';

// Every depot sits on an existing road. No seed-dependent lot or story trigger
// is needed to finish a route; the western and southern streets connect them.
export const ROUTES = [
  { id: 'lantern-plates', name: 'Lantern Plates', from: 'Marina Azul', to: 'Crescent Heights',
    pickup: { x: 880, y: 560, name: 'Lantern dispatch' }, destination: { x: 1980, y: 780, name: 'Crescent print kiosk' },
    description: 'Carry the Lantern’s hand-cut concert plates to the Heights night printer.',
    directions: 'Head south to 780 Avenue, then east to the Crescent crossing.', seconds: 75, par: 30, reward: 240 },
  { id: 'roof-seeds', name: 'Rooftop Seeds', from: 'Crescent Heights', to: 'Sunline Market',
    pickup: { x: 1980, y: 780, name: 'Crescent print kiosk' }, destination: { x: 880, y: 1680, name: 'Sunline seed stall' },
    description: 'A rooftop grower owes Sunline a tin of salt-resistant palm seeds.',
    directions: 'Follow 780 Avenue west to 880 Street; turn south to 1680.', seconds: 100, par: 42, reward: 320 },
  { id: 'yard-coils', name: 'Copper After Dark', from: 'Sunline Market', to: 'Cobalt Yard',
    pickup: { x: 880, y: 1680, name: 'Sunline seed stall' }, destination: { x: 3070, y: 2110, name: 'Cobalt repair bay' },
    description: 'Take reclaimed copper coils to the dockworkers’ radio repair bench.',
    directions: 'Use 880 Street south to 2110 Avenue, then follow it east.', seconds: 120, par: 50, reward: 400 },
  { id: 'tide-tapes', name: 'The Tide Tapes', from: 'Cobalt Yard', to: 'Marina Azul',
    pickup: { x: 3070, y: 2110, name: 'Cobalt repair bay' }, destination: { x: 430, y: 780, name: 'Marina listening booth' },
    description: 'Bring a dockside choir’s tide recordings home before the booth closes.',
    directions: 'Go west along 2110 Avenue to the waterfront; follow 430 north.', seconds: 150, par: 68, reward: 520 },
];

export const routeById = (id) => ROUTES.find((route) => route.id === id);
export const limitTicks = (route) => Math.round(route.seconds / STEP);
export const formatTicks = (ticks) => `${(ticks * STEP).toFixed(1)}s`;
export const contractPayout = (route, ticks) => route.reward + (ticks <= Math.round(route.par / STEP) ? COURIER.expressBonus : 0);
export const emptyContracts = () => ({ active: null, result: null, records: {} });

export function contractTarget(contracts) {
  const active = contracts.active;
  const route = active && routeById(active.id);
  return route ? { ...(active.phase === 'pickup' ? route.pickup : route.destination), phase: active.phase } : null;
}

export function courierRank(records) {
  const unique = ROUTES.filter((route) => records[route.id]?.completed > 0).length;
  return { unique, name: ['NEW COURIER', 'LOCAL RUNNER', 'STREET REGULAR', 'HARBOR RELAY', 'CITY CONNECTOR'][unique] };
}

export function acceptContract(contracts, id) {
  if (contracts.active || !routeById(id)) return false;
  contracts.active = { id, phase: 'pickup', ticks: 0 };
  contracts.result = null;
  return true;
}

export function endContract(contracts, outcome) {
  const active = contracts.active;
  if (!active) return null;
  const route = routeById(active.id);
  const reward = outcome === 'delivered' ? contractPayout(route, active.ticks) : 0;
  const previous = contracts.records[active.id];
  const best = outcome === 'delivered' && (!previous || active.ticks < previous.bestTicks);
  if (outcome === 'delivered') {
    contracts.records[active.id] = {
      completed: Math.min(COURIER.maxCompletions, (previous?.completed || 0) + 1),
      bestTicks: Math.min(previous?.bestTicks ?? Infinity, active.ticks),
    };
  }
  contracts.result = { id: active.id, outcome, ticks: active.ticks, reward, best };
  // Clearing the active run is the payout latch: a second handoff cannot pay.
  contracts.active = null;
  return contracts.result;
}

export function tickContract(contracts) {
  if (!contracts.active) return null;
  const active = contracts.active;
  active.ticks += 1;
  return active.ticks >= limitTicks(routeById(active.id)) ? endContract(contracts, 'expired') : null;
}

export function contractPrompt(state) {
  const target = contractTarget(state.contracts);
  if (!target || Math.hypot(target.x - state.player.x, target.y - state.player.y) > COURIER.range) return null;
  const car = state.inCar && state.vehicles[state.carId];
  if (car && Math.abs(car.speed) > COURIER.handoffSpeed) return 'Slow down to hand off the parcel';
  return target.phase === 'pickup' ? 'G  COLLECT PARCEL' : 'G  DELIVER PARCEL';
}

export function handoffContract(state) {
  const prompt = contractPrompt(state);
  if (!prompt?.startsWith('G ')) return null;
  if (state.contracts.active.phase === 'pickup') {
    state.contracts.active.phase = 'delivery';
    return { outcome: 'picked-up', reward: 0 };
  }
  const result = endContract(state.contracts, 'delivered');
  state.cash = Math.min(1e9, state.cash + result.reward);
  return result;
}

export function resultText(result) {
  if (!result) return '';
  const route = routeById(result.id);
  if (result.outcome === 'delivered') return `${route.name}: delivered in ${formatTicks(result.ticks)} / +$${result.reward}${result.best ? ' / PERSONAL BEST' : ''}`;
  const reason = { expired: 'deadline missed', clinic: 'parcel lost at the clinic', cancelled: 'cancelled', chapter: 'closed at chapter end' }[result.outcome];
  return `${route.name}: ${reason}. No fee. C to retry.`;
}

// Rebuild only the bounded schema. Never merge arbitrary saved objects into live state.
export function validateContracts(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || !data.records || typeof data.records !== 'object' || Array.isArray(data.records)) return null;
  if (Object.keys(data.records).some((id) => !routeById(id))) return null;
  const clean = emptyContracts();
  for (const route of ROUTES) {
    const record = data.records[route.id];
    if (record === undefined) continue;
    if (!record || !Number.isInteger(record.completed) || record.completed < 1 || record.completed > COURIER.maxCompletions || !Number.isInteger(record.bestTicks) || record.bestTicks < 1 || record.bestTicks >= limitTicks(route)) return null;
    clean.records[route.id] = { completed: record.completed, bestTicks: record.bestTicks };
  }
  if (data.active !== null) {
    const active = data.active;
    const route = active && routeById(active.id);
    if (!route || !['pickup', 'delivery'].includes(active.phase) || !Number.isInteger(active.ticks) || active.ticks < 0 || active.ticks >= limitTicks(route)) return null;
    clean.active = { id: active.id, phase: active.phase, ticks: active.ticks };
  }
  if (data.result !== null) {
    const result = data.result;
    const route = result && routeById(result.id);
    if (!route || clean.active || !['delivered', 'expired', 'clinic', 'cancelled', 'chapter'].includes(result.outcome) || !Number.isInteger(result.ticks) || result.ticks < 0 || result.ticks > limitTicks(route) || typeof result.best !== 'boolean') return null;
    if (result.outcome === 'delivered') {
      const record = clean.records[result.id];
      if (!record || result.ticks < 1 || result.ticks >= limitTicks(route) || record.bestTicks > result.ticks || result.reward !== contractPayout(route, result.ticks) || (result.best && record.bestTicks !== result.ticks)) return null;
    } else if (result.reward !== 0 || result.best || (result.outcome === 'expired' && result.ticks !== limitTicks(route))) return null;
    clean.result = { id: result.id, outcome: result.outcome, ticks: result.ticks, reward: result.reward, best: result.best };
  }
  return clean;
}
