// Shared tuning for Neon Harbor. The simulation uses a large logical city and a fixed viewport;
// the renderer handles device pixels so gameplay remains consistent on every screen.
export const VIEW = { width: 1280, height: 720 };
export const CITY = { width: 3600, height: 2400 };
export const STEP = 1 / 60;
export const SAVE_SLOT = 'neon-harbor-afterglow.save.v1';
export const SAVE_VERSION = 5;
export const COURIER = { range: 100, handoffSpeed: 100, expressBonus: 100, maxCompletions: 9999 };
// Presentation timers use simulation seconds, so pausing also holds feedback still.
export const FEEDBACK = { hitSeconds: 0.18, damageSeconds: 0.45, districtSeconds: 2.8, impactSeconds: 0.3 };
export const AUDIO = { masterVolume: 0.7, engineVolume: 0.018, engineIdle: 42, engineRange: 105 };
export const SAVE_MAX_CHARACTERS = 100000;
export const COMBAT = { bulletSpeed: 850, bulletLife: 0.9, damage: 35, guardHealth: 70, guardCount: 3 };
export const ROAD_X = [430, 880, 1420, 1980, 2500, 3070, 3420];
export const ROAD_Y = [340, 780, 1220, 1680, 2110];
export const LANDMARKS = { lantern: { x: 700, y: 560 }, market: { x: 1420, y: 1220 }, yard: { x: 2740, y: 1680 } };
export const POLICE = { escapeSeconds: 9, sightRange: 320, maxUnits: 8 };
export const FONT = 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
export const PLAYER = { walkSpeed: 190, sprintSpeed: 285, radius: 18, maxHealth: 100, fireCooldown: 0.24 };
export const VEHICLE = { maxSpeed: 560, reverseSpeed: 190, acceleration: 480, brake: 760, turnRate: 2.75, radius: 29, entryRange: 90 };
export const PALETTE = {
  ink: '#10252d', deep: '#07151b', ocean: '#16778b', oceanLight: '#3bb0b0', sand: '#f1c889',
  road: '#394650', roadEdge: '#78827d', sidewalk: '#b5afa0', grass: '#2f7961',
  building: '#d3775e', buildingLight: '#f3a871', shadow: 'rgba(7, 21, 27, 0.30)',
  white: '#fff8e9', muted: '#9db4b4', coral: '#ff725c', gold: '#f8c95d', cyan: '#63e0d4', police: '#6c9fff', courier: '#d5a4ff',
};
export const DISTRICTS = [
  { name: 'Marina Azul', x: 0, y: 0, width: 1100, height: 900, color: '#168096' },
  { name: 'Crescent Heights', x: 1100, y: 0, width: 1400, height: 1100, color: '#c47a5e' },
  { name: 'Sunline Market', x: 400, y: 900, width: 1600, height: 1500, color: '#d9a567' },
  { name: 'Cobalt Yard', x: 2000, y: 1100, width: 1600, height: 1300, color: '#7f8c83' },
];
export const MISSION_NAMES = { intro: 'First Light', switch: 'Sunset Switch', signal: 'Signal in the Rain' };
