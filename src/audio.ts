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

function tone(type: OscillatorType, from: number, to: number | undefined, dur: number, vol: number, delay = 0, at?: number): void {
  const c = ensure();
  if (!c || !master) return;
  const t0 = at ?? c.currentTime + delay;
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

function noise(dur: number, vol: number, highpass: number, at?: number): void {
  const c = ensure();
  if (!c || !master) return;
  const t0 = at ?? c.currentTime;
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
  src.start(t0);
}

export type SfxKind =
  | 'fire' | 'hit' | 'kill' | 'pickup' | 'levelup'
  | 'hurt' | 'nova' | 'win' | 'lose' | 'ui'
  | 'zap' | 'shard' | 'well' | 'achv' | 'boss' | 'orb';

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
    case 'boss': tone('sawtooth', 82, 41, 0.7, 0.16); tone('sawtooth', 84, 42, 0.7, 0.12); break;
    case 'orb': tone('square', 420, 160, 0.1, 0.05); break;
  }
}

// ================= 程序化 BGM =================
// 16 步序列器：底鼓 + 低音线常驻，镲片/琶音随战况强度分层淡入

let musicInterval: ReturnType<typeof setInterval> | null = null;
let musicStep = 0;
let musicNextTime = 0;
let intensityFn: () => number = () => 0;
const MUSIC_STEP = 0.24; // 每步秒长（约 125 BPM 的八分音符）

export function startMusic(getIntensity: () => number): void {
  const c = ensure();
  if (!c) return; // 音频未解锁前不启动
  intensityFn = getIntensity;
  if (musicInterval) return;
  musicNextTime = c.currentTime + 0.1;
  musicInterval = setInterval(scheduleMusic, 60);
}

export function stopMusic(): void {
  if (musicInterval) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
}

function scheduleMusic(): void {
  const c = ctx;
  if (!c || muted) return;
  while (musicNextTime < c.currentTime + 0.2) {
    playMusicStep(musicStep, musicNextTime);
    musicStep = (musicStep + 1) % 16;
    musicNextTime += MUSIC_STEP;
  }
}

function playMusicStep(s: number, t: number): void {
  const inten = Math.max(0, Math.min(1, intensityFn()));
  if (s % 4 === 0) tone('sine', 150, 42, 0.15, 0.15, 0, t); // 底鼓
  const bassLine = [55, 0, 55, 0, 65.41, 0, 55, 0, 49, 0, 55, 0, 58.27, 0, 55, 82.41];
  const note = bassLine[s];
  if (note) tone('square', note, undefined, 0.19, 0.05, 0, t);
  if (inten > 0.3 && s % 2 === 1) noise(0.03, 0.022, 6000, t); // 镲片
  if (inten > 0.6 && (s === 6 || s === 14)) {
    const arp = [220, 261.63, 311.13, 261.63];
    tone('triangle', arp[(musicStep / 2 | 0) % 4] * 2, undefined, 0.1, 0.045, 0, t);
  }
  if (inten > 0.85 && s === 0) tone('sawtooth', 110, 55, 0.4, 0.04, 0, t); // 强度峰值低鸣
}
