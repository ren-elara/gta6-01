// Keyboard, mouse and pointer state. Held controls are read every simulation tick.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_INTERACT = 4;
export const ACTION_SAVE = 8;
export const ACTION_LOAD = 16;
export const ACTION_MUTE = 32;
export const ACTION_BRIEFING = 64;
export const ACTION_MOTION = 128;
export const ACTION_COURIER = 256;
export const ACTION_HANDOFF = 512;
export const ACTION_CANCEL = 1024;
export const ACTION_PREVIOUS = 2048;
export const ACTION_NEXT = 4096;

export function createInput(target) {
  const down = new Set();
  let actions = 0;
  let pointer = null;
  let mouseDown = false;
  let choice = -1;
  const controls = new Set(['Space', 'Enter', 'Escape', 'KeyP', 'KeyE', 'KeyF', 'KeyL', 'KeyO', 'KeyM', 'KeyH', 'KeyR', 'KeyC', 'KeyG', 'KeyX', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight']);
  function clear() { down.clear(); mouseDown = false; actions = 0; pointer = null; choice = -1; }
  addEventListener('keydown', (event) => {
    if (event.target?.closest?.('input, textarea, select, button, [contenteditable="true"]')) return;
    if (!controls.has(event.code) || event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault();
    // A menu clears held keys; OS repeat must not re-arm that same press.
    if (event.repeat) return;
    const fresh = !down.has(event.code);
    down.add(event.code);
    if (!fresh) return;
    if (event.code === 'Space' || event.code === 'Enter') actions |= ACTION_CONFIRM;
    else if (event.code === 'Escape' || event.code === 'KeyP') actions |= ACTION_PAUSE;
    else if (event.code === 'KeyE' || event.code === 'KeyF') actions |= ACTION_INTERACT;
    else if (event.code === 'KeyL') actions |= ACTION_SAVE;
    else if (event.code === 'KeyO') actions |= ACTION_LOAD;
    else if (event.code === 'KeyM') actions |= ACTION_MUTE;
    else if (event.code === 'KeyH') actions |= ACTION_BRIEFING;
    else if (event.code === 'KeyR') actions |= ACTION_MOTION;
    else if (event.code === 'KeyC') actions |= ACTION_COURIER;
    else if (event.code === 'KeyG') actions |= ACTION_HANDOFF;
    else if (event.code === 'KeyX') actions |= ACTION_CANCEL;
    else if (event.code === 'ArrowUp') actions |= ACTION_PREVIOUS;
    else if (event.code === 'ArrowDown') actions |= ACTION_NEXT;
    else if (/^Digit[1-4]$/.test(event.code)) choice = Number(event.code.slice(-1)) - 1;
  });
  addEventListener('keyup', (event) => down.delete(event.code));
  addEventListener('blur', clear);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
  target.addEventListener('pointermove', (event) => { pointer = { x: event.clientX, y: event.clientY }; });
  target.addEventListener('pointerdown', (event) => { if (event.button !== 0) return; target.focus(); pointer = { x: event.clientX, y: event.clientY }; mouseDown = true; });
  // Releasing a secondary mouse button must not cancel a held primary shot.
  addEventListener('pointerup', (event) => { if (event.button === 0) mouseDown = false; });
  addEventListener('pointercancel', clear);
  target.addEventListener('contextmenu', (event) => event.preventDefault());
  target.addEventListener('pointerleave', () => { pointer = null; mouseDown = false; });
  const held = (code) => down.has(code);
  return {
    axis() { return { x: (held('KeyD') || held('ArrowRight') ? 1 : 0) - (held('KeyA') || held('ArrowLeft') ? 1 : 0), y: (held('KeyS') || held('ArrowDown') ? 1 : 0) - (held('KeyW') || held('ArrowUp') ? 1 : 0) }; },
    sprint() { return held('ShiftLeft') || held('ShiftRight'); },
    firing() { return mouseDown || held('Space'); },
    pointer() { return pointer; },
    clear,
    takeChoice() { const value = choice; choice = -1; return value; },
    takeActions() { const value = actions; actions = 0; return value; },
  };
}
