import { CITY, DISTRICTS, FONT, PALETTE, ROAD_X, ROAD_Y, VIEW } from './config.js';
import { missionObjective } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const camera = { x: 0, y: 0 };
  const fonts = new Map();
  let cameraReady = false;

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    view.scale = Math.min(canvas.width / VIEW.width, canvas.height / VIEW.height);
    view.x = (canvas.width - VIEW.width * view.scale) / 2;
    view.y = (canvas.height - VIEW.height * view.scale) / 2;
  }
  function font(size, weight = 500) {
    const key = `${weight}-${size}`;
    if (!fonts.has(key)) fonts.set(key, `${weight} ${size}px ${FONT}`);
    return fonts.get(key);
  }
  function text(value, x, y, size, color = PALETTE.white, align = 'left', weight = 500) {
    ctx.font = font(size, weight); ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillText(value, x, y);
  }
  function panel(x, y, width, height, fill = 'rgba(7,21,27,0.84)') {
    ctx.fillStyle = fill; ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = 'rgba(99,224,212,0.40)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
  }
  function roadGrid() {
    ctx.fillStyle = PALETTE.grass; ctx.fillRect(0, 0, CITY.width, CITY.height);
    for (const x of ROAD_X) {
      ctx.fillStyle = PALETTE.sidewalk; ctx.fillRect(x - 94, 0, 188, CITY.height);
      ctx.fillStyle = PALETTE.road; ctx.fillRect(x - 68, 0, 136, CITY.height);
      ctx.fillStyle = 'rgba(241,200,137,0.40)';
      for (let y = -60; y < CITY.height; y += 90) ctx.fillRect(x - 2, y, 4, 42);
    }
    for (const y of ROAD_Y) {
      ctx.fillStyle = PALETTE.sidewalk; ctx.fillRect(0, y - 94, CITY.width, 188);
      ctx.fillStyle = PALETTE.road; ctx.fillRect(0, y - 68, CITY.width, 136);
      ctx.fillStyle = 'rgba(241,200,137,0.40)';
      for (let x = -60; x < CITY.width; x += 90) ctx.fillRect(x, y - 2, 42, 4);
    }
    for (const x of ROAD_X) for (const y of ROAD_Y) {
      ctx.fillStyle = PALETTE.road; ctx.fillRect(x - 68, y - 68, 136, 136);
      ctx.fillStyle = 'rgba(255,248,233,0.45)';
      for (let stripe = -48; stripe < 55; stripe += 16) {
        ctx.fillRect(x + stripe, y - 85, 8, 20); ctx.fillRect(x + stripe, y + 65, 8, 20);
        ctx.fillRect(x - 85, y + stripe, 20, 8); ctx.fillRect(x + 65, y + stripe, 20, 8);
      }
    }
    // The western waterfront anchors the city and remains visible from the marina.
    ctx.fillStyle = PALETTE.ocean; ctx.fillRect(0, 0, 300, CITY.height);
    ctx.fillStyle = PALETTE.sand; ctx.fillRect(300, 0, 36, CITY.height);
    ctx.fillStyle = PALETTE.sidewalk; ctx.fillRect(336, 0, 24, CITY.height);
    ctx.strokeStyle = 'rgba(99,224,212,0.28)'; ctx.lineWidth = 2;
    for (let y = 20; y < CITY.height; y += 55) {
      ctx.beginPath(); ctx.moveTo(20, y); ctx.quadraticCurveTo(150, y + 16, 285, y); ctx.stroke();
    }
    for (let y = 200; y < CITY.height; y += 360) {
      ctx.fillStyle = '#a57b60'; ctx.fillRect(160, y, 170, 18);
      ctx.fillStyle = PALETTE.white; ctx.beginPath(); ctx.ellipse(210, y + 45, 36, 13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#19323a'; ctx.fillRect(200, y + 37, 23, 16);
      ctx.fillStyle = '#715548'; ctx.fillRect(343, y - 60, 6, 40);
      ctx.strokeStyle = '#245a46'; ctx.lineWidth = 8;
      for (let leaf = 0; leaf < 6; leaf += 1) {
        const angle = leaf * Math.PI / 3;
        ctx.beginPath(); ctx.moveTo(346, y - 60); ctx.quadraticCurveTo(346 + Math.cos(angle) * 22, y - 60 + Math.sin(angle) * 22, 346 + Math.cos(angle) * 32, y - 48 + Math.sin(angle) * 32); ctx.stroke();
      }
    }
  }
  function drawBuildings(state) {
    for (const building of state.buildings) {
      ctx.fillStyle = PALETTE.shadow; ctx.fillRect(building.x + 12, building.y + 14, building.width, building.height);
      ctx.fillStyle = building.color; ctx.fillRect(building.x, building.y, building.width, building.height);
      ctx.fillStyle = 'rgba(255,248,233,0.24)'; ctx.fillRect(building.x, building.y, building.width, 7);
      const rows = Math.min(5, building.floors); const columns = Math.max(2, Math.floor(building.width / 42));
      for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) {
        ctx.fillStyle = (row + column) % 3 === 0 ? PALETTE.gold : 'rgba(7,21,27,0.34)';
        ctx.fillRect(building.x + 16 + column * 38, building.y + 22 + row * 24, 12, 9);
      }
      if (building.label) text(building.label, building.x + building.width / 2, building.y + building.height - 14, 10, 'rgba(255,248,233,0.72)', 'center', 700);
      ctx.fillStyle = 'rgba(7,21,27,0.25)'; ctx.fillRect(building.x + building.width - 45, building.y + 14, 30, 19);
      ctx.fillStyle = '#c6bba5'; ctx.fillRect(building.x + building.width - 48, building.y + 11, 30, 19);
      ctx.strokeStyle = '#78827d'; ctx.lineWidth = 2;
      for (let slat = 0; slat < 4; slat += 1) { ctx.beginPath(); ctx.moveTo(building.x + building.width - 44, building.y + 15 + slat * 4); ctx.lineTo(building.x + building.width - 22, building.y + 15 + slat * 4); ctx.stroke(); }
    }
  }
  function drawCar(car) {
    ctx.save(); ctx.translate(car.x, car.y); ctx.rotate(car.angle);
    ctx.fillStyle = 'rgba(7,21,27,0.35)'; ctx.fillRect(-25, -13, 52, 30);
    ctx.fillStyle = '#15252b'; ctx.fillRect(-19, -17, 11, 34); ctx.fillRect(11, -17, 11, 34);
    ctx.fillStyle = car.police ? PALETTE.police : car.color; ctx.fillRect(-26, -14, 52, 28);
    ctx.fillStyle = '#19323a'; ctx.fillRect(-10, -10, 19, 20);
    ctx.fillStyle = 'rgba(207,247,246,0.6)'; ctx.fillRect(9, -10, 6, 20);
    ctx.fillStyle = '#ef785f'; ctx.fillRect(-26, -11, 3, 6); ctx.fillRect(-26, 5, 3, 6);
    ctx.fillStyle = PALETTE.gold; ctx.fillRect(21, -9, 5, 6); ctx.fillRect(21, 3, 5, 6);
    if (car.occupied) { ctx.fillStyle = PALETTE.cyan; ctx.fillRect(-4, -17, 8, 3); }
    ctx.restore();
  }
  function drawPerson(person, player = false) {
    ctx.fillStyle = person.color || PALETTE.cyan; ctx.beginPath(); ctx.arc(person.x, person.y - 9, player ? 9 : 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(person.x - (player ? 8 : 5), person.y - 1, player ? 16 : 10, player ? 21 : 15);
  }
  function marker(x, y, color, label, time) {
    ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, 22 + Math.sin(time * 4) * 3, 0, Math.PI * 2); ctx.stroke();
    text(label, x, y - 32, 12, color, 'center', 700);
  }
  function drawWorld(state) {
    ctx.fillStyle = PALETTE.ocean; ctx.fillRect(0, 0, CITY.width, CITY.height);
    roadGrid(); drawBuildings(state);
    marker(700, 560, PALETTE.cyan, 'BLUE LANTERN', state.time);
    marker(1420, 1220, PALETTE.gold, 'SUNLINE MARKET', state.time + 1);
    marker(2740, 1680, PALETTE.coral, 'COBALT YARD', state.time + 2);
    // Small streetside stalls give each open mission plaza a recognizable silhouette.
    for (const [x, y, color] of [[620, 480, PALETTE.cyan], [1310, 1110, PALETTE.gold], [2690, 1560, PALETTE.coral]]) {
      ctx.fillStyle = 'rgba(7,21,27,0.25)'; ctx.fillRect(x - 38, y + 10, 92, 28);
      ctx.fillStyle = '#e2c497'; ctx.fillRect(x - 42, y, 84, 25);
      ctx.fillStyle = color; ctx.fillRect(x - 48, y - 13, 96, 20);
      ctx.fillStyle = 'rgba(255,248,233,0.6)';
      for (let stripe = 0; stripe < 5; stripe += 1) ctx.fillRect(x - 44 + stripe * 20, y - 13, 8, 20);
    }
    for (const ped of state.peds) drawPerson(ped);
    for (const car of state.vehicles) drawCar(car);
    for (const enemy of state.enemies) {
      const color = enemy.guard ? PALETTE.coral : PALETTE.police;
      drawPerson({ x: enemy.x, y: enemy.y, color }); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.strokeRect(enemy.x - 15, enemy.y - 27, 30, 34);
      ctx.fillStyle = color; ctx.fillRect(enemy.x - 15, enemy.y - 33, 30 * enemy.health / (enemy.guard ? 70 : 45), 3);
    }
    for (const particle of state.particles) { ctx.globalAlpha = Math.max(0, particle.life / 0.35); ctx.fillStyle = particle.color; ctx.fillRect(particle.x - 3, particle.y - 3, 6, 6); }
    ctx.globalAlpha = 1;
    for (const bullet of state.bullets) { ctx.fillStyle = PALETTE.gold; ctx.beginPath(); ctx.arc(bullet.x, bullet.y, 4, 0, Math.PI * 2); ctx.fill(); }
    if (!state.inCar) drawPerson({ x: state.player.x, y: state.player.y, color: PALETTE.cyan }, true);
    else { const car = state.vehicles[state.carId]; if (car) drawCar(car); }
    const p = state.player;
    ctx.strokeStyle = PALETTE.cyan; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(p.x + Math.cos(p.angle) * 22, p.y + Math.sin(p.angle) * 22); ctx.lineTo(p.x + Math.cos(p.angle) * 40, p.y + Math.sin(p.angle) * 40); ctx.stroke();
    const objective = missionObjective(state);
    ctx.strokeStyle = PALETTE.gold; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(objective.x, objective.y, 44 + Math.sin(state.time * 3) * 4, 0, Math.PI * 2); ctx.stroke();
  }
  function drawObjectiveBearing(state) {
    if (state.mission === 3) return;
    const objective = missionObjective(state);
    const dx = objective.x - camera.x; const dy = objective.y - camera.y;
    if (Math.abs(dx) < 500 && Math.abs(dy) < 190) return;
    const scale = Math.min(500 / Math.max(1, Math.abs(dx)), 190 / Math.max(1, Math.abs(dy)));
    const x = VIEW.width / 2 + dx * scale; const y = VIEW.height / 2 + dy * scale;
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(dy, dx));
    ctx.fillStyle = PALETTE.gold; ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(-10, -9); ctx.lineTo(-6, 0); ctx.lineTo(-10, 9); ctx.closePath(); ctx.fill(); ctx.restore();
    text(`${Math.round(Math.hypot(objective.x - state.player.x, objective.y - state.player.y))} m`, x, y + 27, 12, PALETTE.gold, 'center', 800);
  }
  function drawMinimap(state) {
    const width = 188; const height = 126; const x = VIEW.width - width - 22; const y = 88;
    panel(x, y, width, height, 'rgba(7,21,27,0.88)');
    ctx.fillStyle = PALETTE.grass; ctx.fillRect(x + 8, y + 8, width - 16, height - 16);
    for (const district of DISTRICTS) {
      ctx.fillStyle = district.color; ctx.globalAlpha = 0.28;
      ctx.fillRect(x + 8 + district.x / CITY.width * (width - 16), y + 8 + district.y / CITY.height * (height - 16), district.width / CITY.width * (width - 16), district.height / CITY.height * (height - 16));
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,248,233,0.25)'; ctx.lineWidth = 1;
    for (const road of ROAD_X) { const rx = x + 8 + road / CITY.width * (width - 16); ctx.beginPath(); ctx.moveTo(rx, y + 8); ctx.lineTo(rx, y + height - 8); ctx.stroke(); }
    for (const road of ROAD_Y) { const ry = y + 8 + road / CITY.height * (height - 16); ctx.beginPath(); ctx.moveTo(x + 8, ry); ctx.lineTo(x + width - 8, ry); ctx.stroke(); }
    const objective = missionObjective(state);
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(x + 8 + objective.x / CITY.width * (width - 16) - 3, y + 8 + objective.y / CITY.height * (height - 16) - 3, 6, 6);
    ctx.fillStyle = PALETTE.coral;
    for (const enemy of state.enemies) ctx.fillRect(x + 8 + enemy.x / CITY.width * (width - 16) - 2, y + 8 + enemy.y / CITY.height * (height - 16) - 2, 4, 4);
    ctx.fillStyle = PALETTE.cyan; ctx.beginPath(); ctx.arc(x + 8 + state.player.x / CITY.width * (width - 16), y + 8 + state.player.y / CITY.height * (height - 16), 4, 0, Math.PI * 2); ctx.fill();
    text('NEON HARBOR', x + 10, y - 8, 11, PALETTE.muted, 'left', 700);
  }
  function drawHud(state) {
    panel(18, 18, 330, 78, 'rgba(7,21,27,0.82)');
    text('NEON HARBOR', 34, 46, 20, PALETTE.cyan, 'left', 800); text(state.district.toUpperCase(), 34, 72, 12, PALETTE.muted, 'left', 700);
    text(`$${state.cash.toLocaleString()}`, 326, 48, 18, PALETTE.gold, 'right', 800);
    text(`VITALS ${Math.max(0, Math.ceil(state.player.health))}%`, 326, 74, 11, state.player.health < 35 ? PALETTE.coral : PALETTE.muted, 'right', 700);
    const stars = '★'.repeat(state.wanted) + '☆'.repeat(5 - state.wanted); text(stars, 34, 120, 19, state.wanted ? PALETTE.gold : PALETTE.muted, 'left', 700);
    text(state.inCar ? `DRIVING / ${Math.round(Math.abs(state.vehicles[state.carId].speed) * 0.22)} km/h` : 'ON FOOT', 326, 120, 11, PALETTE.muted, 'right', 700);
    if (state.wanted) { text('BREAK SIGHT TO LOSE BLUEWATCH', 34, 142, 10, PALETTE.muted); ctx.fillStyle = PALETTE.coral; ctx.fillRect(34, 151, 292 * state.heat, 3); }
    drawMinimap(state); drawObjectiveBearing(state);
    const mission = state.mission === 0 ? 'FIRST LIGHT' : state.mission === 1 ? 'SUNSET SWITCH' : state.mission === 2 ? 'SIGNAL IN THE RAIN' : 'CHAPTER COMPLETE';
    const objective = missionObjective(state);
    panel(18, VIEW.height - 132, 650, 94, 'rgba(7,21,27,0.86)');
    text(mission, 34, VIEW.height - 108, 12, PALETTE.gold, 'left', 800);
    text(objective.text, 34, VIEW.height - 84, 17, PALETTE.white);
    const distance = Math.round(Math.hypot(objective.x - state.player.x, objective.y - state.player.y));
    text(state.notificationTime > 0 ? state.notification : `GOLD MARKER / ${distance} m to objective`, 34, VIEW.height - 59, 12, PALETTE.muted);
    text('WASD / ARROWS MOVE   SHIFT SPRINT   E ENTER / EXIT   MOUSE AIM   CLICK / SPACE FIRE   L SAVE   O LOAD   M SOUND   P PAUSE', VIEW.width - 20, VIEW.height - 16, 11, PALETTE.muted, 'right', 600);
  }
  function drawOverlay(title, subtitle, prompt, chapter = 'FIRST LIGHT', detail = 'Find Kira at the Blue Lantern. Take the coupe. Make the handoff.', flavor = 'A coastal city of favors, signals, and second chances.') {
    ctx.fillStyle = 'rgba(7,21,27,0.72)'; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    panel(180, 150, 920, 390, 'rgba(7,21,27,0.92)');
    text(title, VIEW.width / 2, 248, 48, PALETTE.cyan, 'center', 800);
    text(subtitle, VIEW.width / 2, 296, 18, PALETTE.muted, 'center', 500);
    ctx.strokeStyle = PALETTE.coral; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(350, 326); ctx.lineTo(930, 326); ctx.stroke();
    text(chapter, VIEW.width / 2, 376, 14, PALETTE.gold, 'center', 800);
    text(detail, VIEW.width / 2, 408, 17, PALETTE.white, 'center');
    text(flavor, VIEW.width / 2, 446, 15, PALETTE.muted, 'center');
    text(prompt, VIEW.width / 2, 500, 17, PALETTE.coral, 'center', 800);
  }
  function draw(state, screen) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = PALETTE.deep; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const targetX = Math.max(VIEW.width / 2, Math.min(CITY.width - VIEW.width / 2, state.player.x));
    const targetY = Math.max(VIEW.height / 2, Math.min(CITY.height - VIEW.height / 2, state.player.y));
    if (!cameraReady) { camera.x = targetX; camera.y = targetY; cameraReady = true; }
    camera.x += (targetX - camera.x) * 0.12; camera.y += (targetY - camera.y) * 0.12;
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    ctx.fillStyle = PALETTE.ocean; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.save(); ctx.translate(VIEW.width / 2 - camera.x, VIEW.height / 2 - camera.y); drawWorld(state); ctx.restore();
    if (screen === SCREEN_TITLE) drawOverlay('NEON HARBOR', 'AFTERGLOW', 'ENTER / SPACE / CLICK TO START · O TO LOAD', 'FIRST LIGHT', 'Find Kira at the Blue Lantern. Take the coupe. Make the handoff.', state.notification === 'No compatible save found.' ? state.notification : 'A coastal city of favors, signals, and second chances.');
    else {
      drawHud(state);
      if (screen === SCREEN_PAUSED) drawOverlay('PAUSED', 'The city can wait.', 'PRESS P OR ENTER TO RESUME', 'CURRENT RUN HELD IN MEMORY', state.notificationTime > 0 ? state.notification : 'Your position, cash, mission, and wanted status are held.', 'Press L to save locally or O to load your last save.');
      if (screen === SCREEN_OVER) drawOverlay('CHAPTER COMPLETE', 'Signal in the Rain is yours.', 'ENTER / SPACE / CLICK TO RESTART', 'NEON HARBOR / AFTERGLOW', 'The Bluewatch signal is yours. $' + state.cash.toLocaleString() + ' in the ledger.', state.notificationTime > 0 && state.notification.includes('save') ? state.notification : 'Kira is waiting for the next signal across the harbor.');
    }
  }
  resize(); window.addEventListener('resize', resize);
  function screenToWorld(point) {
    if (!point) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: ((point.x - rect.left) * canvas.width / rect.width - view.x) / view.scale + camera.x - VIEW.width / 2, y: ((point.y - rect.top) * canvas.height / rect.height - view.y) / view.scale + camera.y - VIEW.height / 2 };
  }
  function worldToScreen(point) {
    const rect = canvas.getBoundingClientRect();
    return { x: rect.left + ((point.x - camera.x + VIEW.width / 2) * view.scale + view.x) * rect.width / canvas.width, y: rect.top + ((point.y - camera.y + VIEW.height / 2) * view.scale + view.y) * rect.height / canvas.height };
  }
  return { draw, screenToWorld, worldToScreen, resetCamera() { cameraReady = false; } };
}
