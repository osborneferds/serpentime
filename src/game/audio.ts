/* Tiny WebAudio synth for arcade blips. Context is created lazily on first user gesture. */

type Wave = OscillatorType;

class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;

  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.32;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  /** Call from any user gesture so the context is unlocked. */
  unlock() {
    this.ensure();
  }

  setMuted(m: boolean) {
    this.muted = m;
  }

  private tone(freq: number, dur: number, opts: { type?: Wave; vol?: number; slide?: number; delay?: number } = {}) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const { type = "square", vol = 1, slide = 0, delay = 0 } = opts;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide !== 0) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.5 * vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, vol = 0.5, delay = 0) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4 * vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
  }

  ui() {
    this.tone(660, 0.06, { type: "square", vol: 0.5 });
  }

  turn() {
    this.tone(240, 0.035, { type: "square", vol: 0.22 });
  }

  eat() {
    this.tone(520, 0.07, { vol: 0.8 });
    this.tone(780, 0.09, { vol: 0.8, delay: 0.06 });
  }

  bonus() {
    [660, 880, 1174, 1568].forEach((f, i) => this.tone(f, 0.09, { vol: 0.7, delay: i * 0.055 }));
  }

  die() {
    this.tone(320, 0.32, { type: "sawtooth", vol: 0.9, slide: -260 });
    this.tone(160, 0.4, { type: "square", vol: 0.6, slide: -120, delay: 0.08 });
    this.noise(0.35, 0.7, 0.02);
  }

  pause() {
    this.tone(440, 0.07, { vol: 0.5 });
    this.tone(330, 0.09, { vol: 0.5, delay: 0.07 });
  }

  resume() {
    this.tone(330, 0.07, { vol: 0.5 });
    this.tone(494, 0.09, { vol: 0.5, delay: 0.07 });
  }

  start() {
    [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.09, { vol: 0.65, delay: i * 0.06 }));
  }

  best() {
    [784, 988, 1175, 1568, 1976].forEach((f, i) => this.tone(f, 0.11, { type: "triangle", vol: 0.7, delay: i * 0.07 }));
  }
}

export const sfx = new Sfx();
