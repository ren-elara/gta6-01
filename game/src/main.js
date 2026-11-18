import { STEP } from './config.js';
import { createRandom, normalizeSeed } from './random.js';
import { createAudio } from './audio.js';
import { loadGame, saveGame } from './save.js';
import { ACTION_CONFIRM, ACTION_INTERACT, ACTION_LOAD, ACTION_MUTE, ACTION_PAUSE, ACTION_SAVE, createInput } from './input.js';
import { createWorld, EVENT_ALERT, EVENT_CASH, EVENT_HIT, EVENT_MISSION, EVENT_SHOT } from './world.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const seed = normalizeSeed(params.get('seed'), Math.floor(Math.random() * 4294967296));
const canvas = document.getElementById('game');
const status = document.getElementById('status');
let world = createWorld(createRandom(seed), seed);
const renderer = createRenderer(canvas);
const audio = createAudio();

function announce(message) { status.textContent = message; }

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();
  const controls = { axis: input.axis, sprint: input.sprint, firing: input.firing, aim: () => renderer.screenToWorld(input.pointer()) };
  // Read-only diagnostics for browser tests; no state setters or gameplay shortcuts.
  window.__neonHarbor = () => ({ screen, ...JSON.parse(JSON.stringify(world.state)), playerScreen: renderer.worldToScreen(world.state.player), enemiesScreen: world.state.enemies.map(renderer.worldToScreen) });

  function changeScreen(next, message) {
    screen = next;
    accumulator = 0;
    input.clear();
    canvas.dataset.screen = next;
    announce(message);
  }

  function startGame() {
    world.reset();
    renderer.resetCamera();
    changeScreen(SCREEN_PLAY, 'Playing. Find Kira at the Blue Lantern.');
    audio.start();
  }
  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) { const message = audio.toggleMute() ? 'Sound muted.' : 'Sound on.'; world.notify(message); announce(message); }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) { startGame(); return; }
    if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) { changeScreen(SCREEN_PAUSED, 'Paused. L saves, O loads.'); return; }
    if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) { changeScreen(SCREEN_PLAY, 'Playing.'); return; }
    if (actions & ACTION_LOAD) {
      const restored = loadGame();
      if (restored) {
        world = restored;
        renderer.resetCamera();
        changeScreen(world.state.mission === 3 ? SCREEN_OVER : screen === SCREEN_PAUSED ? SCREEN_PAUSED : SCREEN_PLAY, 'Game loaded.');
        audio.start();
      } else { world.notify('No compatible save found.', 3); announce('No compatible save found.'); }
      return;
    }
    if (actions & ACTION_SAVE && screen !== SCREEN_TITLE) {
      const message = saveGame(world.state) ? 'Game saved locally.' : 'Save unavailable in this browser.';
      world.notify(message, 3); announce(message);
    }
    if (screen !== SCREEN_PLAY) return;
    if (actions & ACTION_INTERACT) { if (world.interact()) audio.enter(); }
  }
  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) startGame();
  });
  function step() {
    const events = world.step(STEP, controls);
    if (events & EVENT_SHOT) audio.shoot();
    if (events & EVENT_HIT) audio.hit();
    if (events & EVENT_CASH) audio.cash();
    if (events & (EVENT_MISSION | EVENT_ALERT)) audio.alert();
    if (events & (EVENT_SHOT | EVENT_HIT | EVENT_MISSION | EVENT_CASH | EVENT_ALERT)) announce(world.state.notification);
    if (world.state.mission >= 3) {
      changeScreen(SCREEN_OVER, 'Chapter complete: Signal in the Rain. Press Enter to restart.');
      audio.complete();
      if (!saveGame(world.state)) { world.notify('Chapter complete. Local save unavailable.', 6); announce('Chapter complete. Local save unavailable.'); }
    }
  }
  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) { accumulator -= STEP; step(); }
    } else accumulator = 0;
    renderer.draw(world.state, screen);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) changeScreen(SCREEN_PAUSED, 'Paused.');
  });
  window.addEventListener('blur', () => { if (screen === SCREEN_PLAY) changeScreen(SCREEN_PAUSED, 'Paused.'); });
  canvas.dataset.screen = screen;
  announce('Neon Harbor: Afterglow. Press Space or click to enter.');
  requestAnimationFrame(frame);
}

runGame();
