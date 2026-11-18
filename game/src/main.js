import { STEP } from './config.js';
import { createRandom, normalizeSeed } from './random.js';
import { createAudio } from './audio.js';
import { loadGame, saveGame } from './save.js';
import { ACTION_BRIEFING, ACTION_CANCEL, ACTION_CONFIRM, ACTION_COURIER, ACTION_HANDOFF, ACTION_INTERACT, ACTION_LOAD, ACTION_MOTION, ACTION_MUTE, ACTION_NEXT, ACTION_PAUSE, ACTION_PREVIOUS, ACTION_SAVE, createInput } from './input.js';
import { createWorld, EVENT_ALERT, EVENT_CASH, EVENT_COURIER_FAIL, EVENT_ESCAPE, EVENT_HIT, EVENT_IMPACT, EVENT_MISSION, EVENT_SHOT, EVENT_TARGET_HIT } from './world.js';
import { createRenderer, SCREEN_BRIEFING, SCREEN_COURIER, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { ROUTES } from './contracts.js';
import { courierClick } from './courier-menu.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const seed = normalizeSeed(params.get('seed'), Math.floor(Math.random() * 4294967296));
const canvas = document.getElementById('game');
const status = document.getElementById('status');
let world = createWorld(createRandom(seed), seed);
const previousRun = loadGame();
if (previousRun) world.state.contracts.records = previousRun.state.contracts.records;
const renderer = createRenderer(canvas);
const audio = createAudio();

function announce(message) {
  if (status.textContent !== message) status.textContent = message;
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();
  let briefingReturn = SCREEN_PLAY;
  let courierReturn = SCREEN_PLAY;
  let lastNotification = '';
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const presentation = { reducedMotion: motionPreference.matches, muted: false, courierSelection: 0 };
  let motionOverridden = false;
  motionPreference.addEventListener('change', (event) => {
    if (!motionOverridden) presentation.reducedMotion = event.matches;
  });
  const controls = { axis: input.axis, sprint: input.sprint, firing: input.firing, aim: () => renderer.screenToWorld(input.pointer()) };
  // Read-only diagnostics for browser tests; no state setters or gameplay shortcuts.
  window.__neonHarbor = () => ({ screen, presentation: { ...presentation }, ...JSON.parse(JSON.stringify(world.state)), playerScreen: renderer.worldToScreen(world.state.player), enemiesScreen: world.state.enemies.map(renderer.worldToScreen) });

  function changeScreen(next, message) {
    screen = next;
    accumulator = 0;
    input.clear();
    canvas.dataset.screen = next;
    audio.setActive(next === SCREEN_PLAY || next === SCREEN_OVER);
    announce(message);
  }

  function startGame() {
    world.reset();
    renderer.resetCamera();
    changeScreen(SCREEN_PLAY, 'Playing. Find Kira at the Blue Lantern.');
    audio.start();
  }
  function persistCourier() {
    if (!saveGame(world.state)) world.notify(`${world.state.notification} Save unavailable; record kept in this run.`, 7);
    announce(world.state.notification);
  }
  function acceptSelected() {
    if (!world.acceptCourier(ROUTES[presentation.courierSelection].id)) return;
    changeScreen(SCREEN_PLAY, world.state.notification);
    audio.pickup();
    persistCourier();
  }
  function cancelSelected() {
    if (world.cancelCourier()) persistCourier();
    input.clear();
  }
  function handleActions() {
    const actions = input.takeActions();
    const choice = input.takeChoice();
    if (actions & ACTION_MUTE) { const message = audio.toggleMute() ? 'Sound muted.' : 'Sound on.'; world.notify(message); announce(message); }
    if (actions & ACTION_MOTION) {
      motionOverridden = true;
      presentation.reducedMotion = !presentation.reducedMotion;
      const message = presentation.reducedMotion ? 'Reduced motion on.' : 'Full motion on.';
      world.notify(message); announce(message);
    }
    if (actions & ACTION_COURIER) {
      if (screen === SCREEN_COURIER) changeScreen(courierReturn, 'Courier exchange closed.');
      else if ([SCREEN_PLAY, SCREEN_PAUSED, SCREEN_BRIEFING, SCREEN_OVER].includes(screen)) {
        courierReturn = screen === SCREEN_BRIEFING ? briefingReturn : screen;
        const current = ROUTES.findIndex((route) => route.id === world.state.contracts.active?.id);
        if (current >= 0) presentation.courierSelection = current;
        changeScreen(SCREEN_COURIER, 'Courier exchange paused. Select 1 through 4, Enter accepts, X cancels, C closes.');
      }
      return;
    }
    if (screen === SCREEN_COURIER) {
      if (choice >= 0) presentation.courierSelection = choice;
      const direction = (actions & ACTION_NEXT ? 1 : 0) - (actions & ACTION_PREVIOUS ? 1 : 0);
      presentation.courierSelection = (presentation.courierSelection + direction + ROUTES.length) % ROUTES.length;
      if (choice >= 0 || direction) announce(`${ROUTES[presentation.courierSelection].name}. ${ROUTES[presentation.courierSelection].description}`);
      if (actions & ACTION_CANCEL) { cancelSelected(); return; }
      if (actions & ACTION_PAUSE) { changeScreen(courierReturn, 'Courier exchange closed.'); return; }
      if (actions & ACTION_CONFIRM) {
        if (world.state.contracts.active) changeScreen(courierReturn, 'Contract resumed.');
        else acceptSelected();
        return;
      }
    }
    if (actions & ACTION_BRIEFING) {
      if (screen === SCREEN_BRIEFING) changeScreen(briefingReturn, 'Briefing closed.');
      else if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) {
        briefingReturn = screen;
        changeScreen(SCREEN_BRIEFING, 'Briefing open. The city is paused. H or Escape closes it.');
      }
      return;
    }
    if (screen === SCREEN_BRIEFING && actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
      changeScreen(briefingReturn, 'Briefing closed.'); return;
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) { startGame(); return; }
    if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) { changeScreen(SCREEN_PAUSED, 'Paused. L saves, O loads.'); return; }
    if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) { changeScreen(SCREEN_PLAY, 'Playing.'); return; }
    if (actions & ACTION_LOAD) {
      const restored = loadGame();
      if (restored) {
        world = restored;
        renderer.resetCamera();
        changeScreen(world.state.mission === 3 ? SCREEN_OVER : [SCREEN_PAUSED, SCREEN_BRIEFING, SCREEN_COURIER].includes(screen) ? SCREEN_PAUSED : SCREEN_PLAY, 'Game loaded.');
        audio.start();
      } else { world.notify('No compatible save found.', 3); announce('No compatible save found.'); }
      return;
    }
    if (actions & ACTION_SAVE && screen !== SCREEN_TITLE) {
      const saved = saveGame(world.state);
      const message = saved ? 'Game saved locally.' : 'Save unavailable in this browser.';
      world.notify(message, 3); announce(message);
      if (saved) audio.saved();
    }
    if (screen !== SCREEN_PLAY) return;
    if (actions & ACTION_INTERACT) { if (world.interact()) audio.enter(); }
    if (actions & ACTION_HANDOFF) {
      const result = world.courierHandoff();
      if (result) {
        if (result.outcome === 'delivered') audio.delivery(); else audio.pickup();
        persistCourier();
      }
    }
  }
  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    audio.unlock();
    if (screen === SCREEN_COURIER) {
      const action = courierClick(renderer.screenToView({ x: event.clientX, y: event.clientY }));
      input.clear();
      if (action?.select !== undefined) {
        presentation.courierSelection = action.select;
        announce(ROUTES[action.select].description);
      }
      if (action?.accept) {
        if (world.state.contracts.active) changeScreen(courierReturn, 'Contract resumed.');
        else acceptSelected();
      }
      if (action?.cancel) cancelSelected();
      return;
    }
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) startGame();
  });
  // Resume Web Audio in the trusted gesture, before the next animation frame.
  window.addEventListener('keydown', (event) => {
    if (!event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey && ['Enter', 'Space', 'KeyM', 'KeyO', 'KeyP', 'Escape', 'KeyH', 'KeyC', 'KeyG', 'KeyE', 'KeyF'].includes(event.code)) audio.unlock();
  });
  function step() {
    const events = world.step(STEP, controls);
    if (events & EVENT_SHOT) audio.shoot();
    if (events & EVENT_HIT) audio.hit();
    if (events & EVENT_TARGET_HIT) audio.targetHit();
    if (events & EVENT_IMPACT) audio.impact();
    if (events & EVENT_ESCAPE) audio.escape();
    if (events & EVENT_COURIER_FAIL) { audio.failed(); persistCourier(); }
    if (events & EVENT_CASH) audio.cash();
    if (events & (EVENT_MISSION | EVENT_ALERT)) audio.alert();
    if (world.state.notification !== lastNotification) {
      lastNotification = world.state.notification;
      announce(lastNotification);
    }
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
    presentation.muted = audio.isMuted();
    audio.update(world.state, screen === SCREEN_PLAY);
    renderer.draw(world.state, screen, presentation);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      audio.setActive(false);
      if (screen === SCREEN_COURIER && courierReturn === SCREEN_PLAY) courierReturn = SCREEN_PAUSED;
      if (screen === SCREEN_BRIEFING && briefingReturn === SCREEN_PLAY) briefingReturn = SCREEN_PAUSED;
      if (screen === SCREEN_PLAY) changeScreen(SCREEN_PAUSED, 'Paused.');
    } else audio.setActive(screen === SCREEN_PLAY || screen === SCREEN_OVER);
  });
  window.addEventListener('blur', () => {
    audio.setActive(false);
    if (screen === SCREEN_COURIER && courierReturn === SCREEN_PLAY) courierReturn = SCREEN_PAUSED;
    if (screen === SCREEN_BRIEFING && briefingReturn === SCREEN_PLAY) briefingReturn = SCREEN_PAUSED;
    if (screen === SCREEN_PLAY) changeScreen(SCREEN_PAUSED, 'Paused.');
  });
  window.addEventListener('focus', () => audio.setActive(screen === SCREEN_PLAY || screen === SCREEN_OVER));
  canvas.dataset.screen = screen;
  announce('Neon Harbor: Afterglow. Press Space or click to enter.');
  requestAnimationFrame(frame);
}

runGame();
