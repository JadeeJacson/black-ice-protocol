/** WebAudio 合成音效：无音频资源文件，全部程序化生成 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = (() => {
  try {
    return localStorage.getItem('bip_muted') === '1';
  } catch {
    return false;
  }
})();
const lastPlay: Partial<Record<string, number>> = {};

function ensure(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
  }
  return ctx;
}

/** 浏览器要求首次用户交互后才能播放音频，在标题界面调用 */
export function unlockAudio(): void {
  const c = ensure();
  if (c && c.state === 'suspended') void c.resume();
}

export function toggleMute(): boolean {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.5;
  try {
    localStorage.setItem('bip_muted', muted ? '1' : '0');
  } catch {
    /* 忽略 */
  }
  return muted;
}

export function isMuted(): boolean {
  return muted;
}

function tone(type: OscillatorType, from: number, to: number | undefined, dur: number, vol: number, delay = 0): void {
  const c = ensure();
  if (!c || !master) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  if (to !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise(dur: number, vol: number, highpass: number): void {
  const c = ensure();
  if (!c || !master) return;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = highpass;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start();
}

export type SfxKind =
  | 'fire' | 'hit' | 'kill' | 'pickup' | 'levelup'
  | 'hurt' | 'nova' | 'win' | 'lose' | 'ui'
  | 'zap' | 'shard' | 'well' | 'achv';

export function sfx(kind: SfxKind): void {
  const now = performance.now();
  const throttle: Partial<Record<SfxKind, number>> = { fire: 80, hit: 70, kill: 90, pickup: 70, zap: 130, shard: 110, well: 500 };
  const min = throttle[kind];
  if (min !== undefined) {
    if (now - (lastPlay[kind] ?? 0) < min) return;
    lastPlay[kind] = now;
  }
  switch (kind) {
    case 'fire': tone('square', 880, 220, 0.07, 0.04); break;
    case 'hit': noise(0.05, 0.045, 2200); break;
    case 'kill': tone('sawtooth', 320, 40, 0.18, 0.08); noise(0.1, 0.05, 800); break;
    case 'pickup': tone('sine', 660, 990, 0.08, 0.06); break;
    case 'levelup': [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, undefined, 0.12, 0.08, i * 0.07)); break;
    case 'hurt': tone('sawtooth', 180, 60, 0.22, 0.13); break;
    case 'nova': tone('sine', 140, 640, 0.3, 0.1); noise(0.25, 0.04, 400); break;
    case 'win': [523, 659, 784, 1047, 1319].forEach((f, i) => tone('triangle', f, undefined, 0.35, 0.09, i * 0.12)); break;
    case 'lose': [330, 262, 196, 131].forEach((f, i) => tone('sawtooth', f, f * 0.7, 0.4, 0.1, i * 0.18)); break;
    case 'ui': tone('square', 520, undefined, 0.05, 0.05); break;
    case 'zap': noise(0.08, 0.07, 1400); tone('square', 1300, 180, 0.09, 0.05); break;
    case 'shard': tone('sine', 880, 1400, 0.06, 0.045); break;
    case 'well': tone('sine', 320, 70, 0.4, 0.1); noise(0.3, 0.04, 200); break;
    case 'achv': [784, 1175, 1568].forEach((f, i) => tone('triangle', f, undefined, 0.14, 0.08, i * 0.09)); break;
  }
}
