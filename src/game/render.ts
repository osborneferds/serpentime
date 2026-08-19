import { COLS, ROWS, DIR_VEC, BONUS_LIFETIME_MS, type GameState, type Vec } from "./logic";

export type Phase = "idle" | "playing" | "paused" | "over";

/* ---------------------------------- fx state ---------------------------------- */

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  grav: number;
}

export interface FloatText {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  text: string;
  color: string;
  size: number;
}

export interface FxState {
  particles: Particle[];
  texts: FloatText[];
  shakeT: number;
  shakeDur: number;
  shakeMag: number;
  flash: number;
}

export function createFx(): FxState {
  return { particles: [], texts: [], shakeT: 0, shakeDur: 1, shakeMag: 0, flash: 0 };
}

export function burst(fx: FxState, x: number, y: number, colors: string[], n: number, speed: number) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = speed * (0.35 + Math.random() * 0.85);
    const life = 0.45 + Math.random() * 0.5;
    fx.particles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - speed * 0.25,
      life,
      maxLife: life,
      size: 2 + Math.random() * 3.4,
      color: colors[Math.floor(Math.random() * colors.length)],
      grav: 220,
    });
  }
  if (fx.particles.length > 240) fx.particles.splice(0, fx.particles.length - 240);
}

export function addText(fx: FxState, x: number, y: number, text: string, color: string, size = 13) {
  fx.texts.push({ x, y, life: 0.95, maxLife: 0.95, text, color, size });
}

export function shake(fx: FxState, mag: number, dur: number) {
  fx.shakeMag = Math.max(fx.shakeMag, mag);
  fx.shakeT = dur;
  fx.shakeDur = dur;
}

export function updateFx(fx: FxState, dt: number) {
  for (let i = fx.particles.length - 1; i >= 0; i--) {
    const p = fx.particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      fx.particles.splice(i, 1);
      continue;
    }
    p.vy += p.grav * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  for (let i = fx.texts.length - 1; i >= 0; i--) {
    const t = fx.texts[i];
    t.life -= dt;
    t.y -= 34 * dt;
    if (t.life <= 0) fx.texts.splice(i, 1);
  }
  if (fx.shakeT > 0) fx.shakeT = Math.max(0, fx.shakeT - dt);
  if (fx.flash > 0) fx.flash = Math.max(0, fx.flash - dt * 1.8);
}

/* ---------------------------------- helpers ---------------------------------- */

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function mixColor(c1: [number, number, number], c2: [number, number, number], t: number): string {
  return `rgb(${Math.round(lerp(c1[0], c2[0], t))},${Math.round(lerp(c1[1], c2[1], t))},${Math.round(
    lerp(c1[2], c2[2], t)
  )})`;
}

const HEAD_RGB: [number, number, number] = [214, 255, 92];
const MID_RGB: [number, number, number] = [104, 214, 52];
const TAIL_RGB: [number, number, number] = [26, 122, 92];

function segmentColor(f: number): string {
  return f < 0.5 ? mixColor(HEAD_RGB, MID_RGB, f * 2) : mixColor(MID_RGB, TAIL_RGB, (f - 0.5) * 2);
}

function cellCenter(c: Vec, cell: number): { x: number; y: number } {
  return { x: (c.x + 0.5) * cell, y: (c.y + 0.5) * cell };
}

function interpPos(prev: Vec, cur: Vec, t: number, cell: number) {
  return { x: lerp(prev.x, cur.x, t) * cell + cell / 2, y: lerp(prev.y, cur.y, t) * cell + cell / 2 };
}

/* ---------------------------------- scene ---------------------------------- */

export interface RenderOpts {
  w: number;
  h: number;
  cell: number;
  t: number; // interpolation 0..1 between previous and current tick
  now: number; // ms timestamp for ambient animation
  phase: Phase;
}

export function drawScene(ctx: CanvasRenderingContext2D, s: GameState, fx: FxState, o: RenderOpts) {
  const { w, h, cell, now } = o;

  ctx.clearRect(0, 0, w, h);

  // screen shake
  ctx.save();
  if (fx.shakeT > 0) {
    const k = (fx.shakeT / fx.shakeDur) * fx.shakeMag;
    ctx.translate((Math.random() - 0.5) * 2 * k, (Math.random() - 0.5) * 2 * k);
  }

  /* board base */
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#0e251c");
  bg.addColorStop(1, "#091a12");
  ctx.fillStyle = bg;
  ctx.fillRect(-8, -8, w + 16, h + 16);

  // checker tint
  ctx.fillStyle = "rgba(190,255,214,0.016)";
  for (let y = 0; y < ROWS; y++) {
    for (let x = (y % 2); x < COLS; x += 2) {
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }

  // grid lines
  ctx.strokeStyle = "rgba(125,240,192,0.055)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 1; x < COLS; x++) {
    ctx.moveTo(x * cell + 0.5, 0);
    ctx.lineTo(x * cell + 0.5, h);
  }
  for (let y = 1; y < ROWS; y++) {
    ctx.moveTo(0, y * cell + 0.5);
    ctx.lineTo(w, y * cell + 0.5);
  }
  ctx.stroke();

  // soft inner glow following the head
  const head = interpPos(s.prev[0] ?? s.snake[0], s.snake[0], o.t, cell);
  const glow = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, cell * 5.5);
  glow.addColorStop(0, "rgba(157,255,46,0.075)");
  glow.addColorStop(1, "rgba(157,255,46,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  /* food: pulsing apple */
  {
    const c = cellCenter(s.food, cell);
    const pulse = 1 + 0.09 * Math.sin(now / 240);
    const r = cell * 0.31 * pulse;
    ctx.save();
    ctx.shadowColor = "rgba(255,93,93,0.85)";
    ctx.shadowBlur = cell * 0.55;
    const g = ctx.createRadialGradient(c.x - r * 0.35, c.y - r * 0.4, r * 0.15, c.x, c.y, r);
    g.addColorStop(0, "#ff9d7e");
    g.addColorStop(0.55, "#ff5d5d");
    g.addColorStop(1, "#c9303f");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // stem + leaf
    ctx.strokeStyle = "#7a4a2a";
    ctx.lineWidth = Math.max(1.5, cell * 0.06);
    ctx.beginPath();
    ctx.moveTo(c.x, c.y - r * 0.9);
    ctx.lineTo(c.x + r * 0.12, c.y - r * 1.35);
    ctx.stroke();
    ctx.fillStyle = "#6fe26b";
    ctx.save();
    ctx.translate(c.x + r * 0.55, c.y - r * 1.25);
    ctx.rotate(-0.5 + Math.sin(now / 300) * 0.12);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.42, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // shine
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath();
    ctx.arc(c.x - r * 0.34, c.y - r * 0.38, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }

  /* bonus: golden fruit with fuse ring */
  if (s.bonus) {
    const c = cellCenter(s.bonus.pos, cell);
    const remain = 1 - (now - s.bonus.born) / BONUS_LIFETIME_MS;
    const blink = remain < 0.24 ? 0.45 + 0.55 * Math.abs(Math.sin(now / 90)) : 1;
    ctx.save();
    ctx.globalAlpha = blink;
    // fuse ring
    ctx.strokeStyle = "rgba(255,210,63,0.9)";
    ctx.lineWidth = Math.max(2, cell * 0.08);
    ctx.beginPath();
    ctx.arc(c.x, c.y, cell * 0.46, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, remain));
    ctx.stroke();
    // spinning diamond
    ctx.translate(c.x, c.y);
    ctx.rotate(now / 480);
    ctx.shadowColor = "rgba(255,210,63,0.95)";
    ctx.shadowBlur = cell * 0.6;
    const r = cell * 0.3;
    const g = ctx.createLinearGradient(-r, -r, r, r);
    g.addColorStop(0, "#fff3c4");
    g.addColorStop(0.5, "#ffd23f");
    g.addColorStop(1, "#e09a12");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.78, 0);
    ctx.lineTo(0, r);
    ctx.lineTo(-r * 0.78, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /* snake */
  const n = s.snake.length;
  const dead = s.dead;
  const deadBlink = dead && Math.floor((now - s.deadAt) / 130) % 2 === 0;

  for (let i = n - 1; i >= 0; i--) {
    const cur = s.snake[i];
    const prev = s.prev[i] ?? cur;
    const p = interpPos(prev, cur, o.t, cell);
    const f = n === 1 ? 0 : i / (n - 1);
    const baseR = cell * (0.44 - 0.16 * f);

    // outline for definition
    ctx.fillStyle = "rgba(4,15,10,0.85)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, baseR + Math.max(1.2, cell * 0.05), 0, Math.PI * 2);
    ctx.fill();

    let fill: string;
    if (i === 0) {
      fill = dead && deadBlink ? "#ff5d5d" : "#e2ff8a";
    } else {
      fill = segmentColor(f);
    }
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(p.x, p.y, baseR, 0, Math.PI * 2);
    ctx.fill();

    // scale shimmer every few segments
    if (i > 0 && i % 3 === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.07)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, baseR * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* head details: eyes + tongue */
  {
    const dv = DIR_VEC[s.dir];
    const px = -dv.y;
    const py = dv.x;
    const hx = head.x;
    const hy = head.y;
    const er = cell * 0.115;
    const fwd = cell * 0.14;
    const side = cell * 0.17;

    if (!dead && (now % 2600) < 190) {
      // forked tongue flick
      const tx = hx + dv.x * cell * 0.42;
      const ty = hy + dv.y * cell * 0.42;
      ctx.strokeStyle = "#ff5d7a";
      ctx.lineWidth = Math.max(1.5, cell * 0.05);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(hx + dv.x * cell * 0.2, hy + dv.y * cell * 0.2);
      ctx.lineTo(tx, ty);
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + (dv.x * 0.5 + px * 0.5) * cell * 0.16, ty + (dv.y * 0.5 + py * 0.5) * cell * 0.16);
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + (dv.x * 0.5 - px * 0.5) * cell * 0.16, ty + (dv.y * 0.5 - py * 0.5) * cell * 0.16);
      ctx.stroke();
    }

    for (const sgn of [1, -1]) {
      const ex = hx + dv.x * fwd + px * side * sgn;
      const ey = hy + dv.y * fwd + py * side * sgn;
      if (dead) {
        ctx.strokeStyle = "#0a1c08";
        ctx.lineWidth = Math.max(1.5, cell * 0.05);
        ctx.beginPath();
        const k = er * 0.75;
        ctx.moveTo(ex - k, ey - k);
        ctx.lineTo(ex + k, ey + k);
        ctx.moveTo(ex + k, ey - k);
        ctx.lineTo(ex - k, ey + k);
        ctx.stroke();
      } else {
        ctx.fillStyle = "#f4ffe8";
        ctx.beginPath();
        ctx.arc(ex, ey, er, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#12290c";
        ctx.beginPath();
        ctx.arc(ex + dv.x * er * 0.42, ey + dv.y * er * 0.42, er * 0.52, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /* particles */
  for (const p of fx.particles) {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  /* floating score texts */
  for (const t of fx.texts) {
    const a = Math.max(0, t.life / t.maxLife);
    ctx.globalAlpha = a;
    ctx.font = `${t.size}px "Press Start 2P", monospace`;
    ctx.textAlign = "center";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(4,15,10,0.9)";
    ctx.strokeText(t.text, t.x, t.y);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;

  ctx.restore(); // end shake

  /* death flash vignette (not shaken) */
  if (fx.flash > 0) {
    const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.75);
    g.addColorStop(0, "rgba(255,60,60,0)");
    g.addColorStop(1, `rgba(255,45,45,${0.55 * fx.flash})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  /* idle darkening handled by DOM overlays */
}
