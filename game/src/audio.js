// Local WebAudio tones make actions feel responsive without loading an external soundtrack.
export function createAudio() {
  let context = null;
  let muted = false;
  let master = null;
  function tone(frequency, duration, type = 'sine', volume = 0.035, slide = 0) {
    if (muted) return;
    try {
      if (!context) {
        context = new AudioContext();
        master = context.createGain();
        master.gain.value = 0.7;
        master.connect(context.destination);
      }
      if (context.state === 'suspended') void context.resume().catch(() => {});
      if (context.state === 'closed') return;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, context.currentTime);
      oscillator.frequency.linearRampToValueAtTime(Math.max(30, frequency + slide), context.currentTime + duration);
      gain.gain.setValueAtTime(volume, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
      oscillator.connect(gain).connect(master);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      oscillator.start();
      oscillator.stop(context.currentTime + duration);
    } catch { /* Audio is optional in private browsing and automated capture. */ }
  }
  return {
    toggleMute() {
      muted = !muted;
      if (master) master.gain.setTargetAtTime(muted ? 0 : 0.7, context.currentTime, 0.02);
      return muted;
    },
    start() { tone(440, 0.12, 'triangle', 0.04, 180); tone(660, 0.18, 'sine', 0.025, 120); },
    enter() { tone(220, 0.14, 'square', 0.03, 80); },
    shoot() { tone(145, 0.07, 'sawtooth', 0.025, -50); },
    hit() { tone(90, 0.18, 'square', 0.05, -35); },
    cash() { tone(580, 0.08, 'triangle', 0.035, 120); tone(800, 0.13, 'triangle', 0.025, 100); },
    alert() { tone(310, 0.16, 'square', 0.035, 40); },
    complete() { tone(523, 0.45, 'triangle', 0.025); tone(659, 0.55, 'sine', 0.025); tone(784, 0.7, 'sine', 0.025); },
  };
}
