/**
 * Key and error sounds (task 4.10), made with the Web Audio API: no sound files,
 * nothing to load. Off by default; the settings turn them on.
 */
let context: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null;
  context ??= new AudioContext();
  if (context.state === 'suspended') void context.resume();
  return context;
}

/** A short soft click, like a key. */
export function playKeySound(volume: number): void {
  const ctx = audio();
  if (!ctx || volume <= 0) return;
  const length = Math.floor(ctx.sampleRate * 0.012);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 1500;
  const gain = ctx.createGain();
  gain.gain.value = 0.6 * (volume / 100);
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start();
}

/** A low falling tone for a wrong key. */
export function playErrorSound(volume: number): void {
  const ctx = audio();
  if (!ctx || volume <= 0) return;
  const now = ctx.currentTime;
  const oscillator = ctx.createOscillator();
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(240, now);
  oscillator.frequency.exponentialRampToValueAtTime(150, now + 0.12);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.35 * (volume / 100) + 0.0001, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.15);
}
