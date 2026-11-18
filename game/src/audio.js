import { AUDIO, VEHICLE } from './config.js';

// Each sound is synthesized locally. The continuous motor belongs to the audio
// context, not individual cars, so repeated entry never accumulates oscillators.
export function createAudio() {
  let context = null;
  let muted = false;
  let master = null;
  let engine = null;
  let engineGain = null;
  let active = false;
  const voices = new Set();

  function unlock() {
    try {
      if (!context) {
        context = new AudioContext();
        master = context.createGain();
        master.gain.value = active && !muted ? AUDIO.masterVolume : 0;
        master.connect(context.destination);
        engine = context.createOscillator();
        engineGain = context.createGain();
        engine.type = 'triangle';
        engine.frequency.value = AUDIO.engineIdle;
        engineGain.gain.value = 0;
        engine.connect(engineGain).connect(master);
        engine.start();
      }
      if (context.state === 'suspended') void context.resume().catch(() => {});
    } catch { /* A browser without audio still has the complete visual feedback. */ }
  }

  function tone(frequency, duration, type = 'sine', volume = 0.035, slide = 0, delay = 0) {
    if (muted || !active) return;
    if (!context || !master) return;
    try {
      if (context.state === 'closed') return;
      const start = context.currentTime + delay;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      oscillator.frequency.linearRampToValueAtTime(Math.max(30, frequency + slide), start + duration);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(volume, start + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      oscillator.connect(gain).connect(master);
      voices.add(oscillator);
      oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(start);
      oscillator.stop(start + duration);
    } catch { /* Audio is optional in private browsing and automated capture. */ }
  }

  function update(state, playing) {
    if (!context || !engineGain || context.state === 'closed') return;
    const car = playing && state.inCar ? state.vehicles[state.carId] : null;
    const speed = car ? Math.min(1, Math.abs(car.speed) / VEHICLE.maxSpeed) : 0;
    engine.frequency.setTargetAtTime(AUDIO.engineIdle + speed * AUDIO.engineRange, context.currentTime, 0.09);
    engineGain.gain.setTargetAtTime(car && !muted && active ? AUDIO.engineVolume * (0.4 + speed) : 0, context.currentTime, 0.04);
  }

  function setActive(value) {
    active = value;
    if (!master || context.state === 'closed') return;
    if (!active || muted) {
      for (const oscillator of voices) {
        try { oscillator.stop(); } catch { /* A voice may already have ended. */ }
      }
      voices.clear();
    }
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setTargetAtTime(active && !muted ? AUDIO.masterVolume : 0, context.currentTime, 0.02);
    if (!active) engineGain.gain.setTargetAtTime(0, context.currentTime, 0.02);
  }

  return {
    unlock,
    update,
    setActive,
    isMuted() { return muted; },
    toggleMute() {
      muted = !muted;
      setActive(active);
      return muted;
    },
    start() { tone(440, 0.12, 'triangle', 0.04, 180); tone(660, 0.18, 'sine', 0.025, 120); },
    enter() { tone(220, 0.14, 'square', 0.03, 80); },
    shoot() { tone(145, 0.07, 'sawtooth', 0.025, -50); },
    hit() { tone(90, 0.18, 'square', 0.05, -35); },
    targetHit() { tone(980, 0.055, 'triangle', 0.025, -220); },
    impact() { tone(65, 0.14, 'triangle', 0.04, -30); },
    escape() { tone(330, 0.12, 'sine'); tone(494, 0.22, 'sine', 0.025, 0, 0.1); },
    saved() { tone(660, 0.09, 'sine', 0.025); tone(880, 0.12, 'sine', 0.02, 0, 0.08); },
    cash() { tone(580, 0.08, 'triangle', 0.035, 120); tone(800, 0.13, 'triangle', 0.025, 100); },
    pickup() { tone(392, 0.09, 'triangle'); tone(523, 0.14, 'triangle', 0.025, 0, 0.1); },
    delivery() { tone(523, 0.12, 'sine'); tone(659, 0.12, 'sine', 0.03, 0, 0.12); tone(784, 0.22, 'triangle', 0.03, 0, 0.24); },
    failed() { tone(220, 0.18, 'triangle', 0.025, -55); tone(165, 0.24, 'sine', 0.02, -35, 0.16); },
    alert() { tone(310, 0.16, 'square', 0.035, 40); },
    complete() { tone(523, 0.45, 'triangle', 0.025); tone(659, 0.55, 'sine', 0.025, 0, 0.12); tone(784, 0.7, 'sine', 0.025, 0, 0.24); },
  };
}
