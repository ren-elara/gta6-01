import assert from 'node:assert/strict';
import { createAudio } from './game/src/audio.js';
import { AUDIO } from './game/src/config.js';

const contexts = [];
class Parameter {
  value = 0;
  setValueAtTime(value) { this.value = value; }
  linearRampToValueAtTime(value) { this.value = value; }
  exponentialRampToValueAtTime(value) { this.value = value; }
  setTargetAtTime(value) { this.value = value; }
  cancelScheduledValues() {}
}
class AudioNode {
  gain = new Parameter();
  frequency = new Parameter();
  stops = [];
  connect(node) { return node; }
  disconnect() {}
  start() {}
  stop(time) { this.stops.push(time); }
}
globalThis.AudioContext = class {
  currentTime = 0;
  state = 'suspended';
  destination = {};
  gains = [];
  oscillators = [];
  constructor() { contexts.push(this); }
  createGain() { const node = new AudioNode(); this.gains.push(node); return node; }
  createOscillator() { const node = new AudioNode(); this.oscillators.push(node); return node; }
  async resume() { this.state = 'running'; }
};

const sound = createAudio();
sound.start();
assert.equal(contexts.length, 0, 'effects do not create audio outside a trusted gesture');
sound.unlock();
const context = contexts[0];
assert.equal(context.gains[0].gain.value, 0, 'unlocking a paused menu stays silent');
assert.equal(context.state, 'running');
sound.toggleMute(); sound.setActive(true); sound.start();
assert.equal(context.oscillators.length, 1, 'mute suppresses voices');
sound.toggleMute();
assert.equal(context.gains[0].gain.value, AUDIO.masterVolume);
sound.pickup(); sound.delivery();
assert.equal(context.oscillators.length, 6);
sound.setActive(false);
assert.ok(context.oscillators.slice(1).every((voice) => voice.stops.includes(undefined)), 'pause cancels scheduled tones');
assert.equal(context.gains[0].gain.value, 0);
sound.setActive(true);
sound.update({ inCar: true, carId: 0, vehicles: [{ speed: 400 }] }, true);
assert.ok(context.gains[1].gain.value > 0);
sound.setActive(false);
assert.equal(context.gains[1].gain.value, 0, 'pause silences motor');
sound.toggleMute(); sound.unlock(); sound.toggleMute();
assert.equal(context.gains[0].gain.value, 0, 'unmute never overrides pause');
sound.unlock();
assert.equal(contexts.length, 1, 'repeated gestures reuse the single engine/context');
context.state = 'closed';
assert.doesNotThrow(() => { sound.update({ inCar: false }, false); sound.setActive(true); sound.failed(); });
console.log('PASS audio gesture gating, mute/unmute, paused initialization, queued voice cancellation and single motor lifetime');
