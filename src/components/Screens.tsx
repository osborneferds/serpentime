import { useEffect, useState, type ReactNode } from "react";
import { DIFFICULTIES, type DifficultyId } from "../game/logic";

/* ------------------------------ inline icons ------------------------------ */

export const IconPlay = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M7 4.5v15l13-7.5-13-7.5z" />
  </svg>
);

export const IconPause = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <rect x="5.5" y="4.5" width="4.5" height="15" />
    <rect x="14" y="4.5" width="4.5" height="15" />
  </svg>
);

export const IconRestart = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3.5 8.5A9 9 0 1 1 3 13" />
    <path d="M3 4v5h5" />
  </svg>
);

export const IconSoundOn = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M11 5 6.5 9H3v6h3.5L11 19V5z" fill="currentColor" stroke="none" />
    <path d="M15 9a4.2 4.2 0 0 1 0 6" />
    <path d="M17.6 6.4a8 8 0 0 1 0 11.2" />
  </svg>
);

export const IconSoundOff = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M11 5 6.5 9H3v6h3.5L11 19V5z" fill="currentColor" stroke="none" />
    <path d="m15.5 9.5 5 5M20.5 9.5l-5 5" />
  </svg>
);

export const IconTrophy = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M8 4h8v6a4 4 0 0 1-8 0V4z" />
    <path d="M8 5H4.5v1.5A3.5 3.5 0 0 0 8 10M16 5h3.5v1.5A3.5 3.5 0 0 1 16 10" />
    <path d="M12 14v3M8.5 20h7M10 17h4v3h-4z" />
  </svg>
);

export const IconSkull = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 3a8 8 0 0 0-8 8c0 3 1.6 5 3.5 6.2V21h9v-3.8C18.4 16 20 14 20 11a8 8 0 0 0-8-8z" />
    <circle cx="9" cy="11" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="15" cy="11" r="1.6" fill="currentColor" stroke="none" />
    <path d="M12 14.5v2" />
  </svg>
);

export const SerpentMark = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 40 40" className={className} aria-hidden>
    <rect x="1.5" y="1.5" width="37" height="37" rx="7" fill="#0d231b" stroke="#2c5c44" strokeWidth="2" />
    <path
      d="M9 27c0-5 5-5 10-5s10 0 10-5-5-5-10-5"
      fill="none"
      stroke="#b8ff4a"
      strokeWidth="4.4"
      strokeLinecap="round"
    />
    <circle cx="9.6" cy="27" r="3" fill="#e2ff8a" />
    <circle cx="10.6" cy="26.2" r="0.9" fill="#12290c" />
    <circle cx="30" cy="27.5" r="3.4" fill="#ff5d5d" />
    <path d="M30 24.5v-2.2" stroke="#6fe26b" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

/* ------------------------------ count-up hook ------------------------------ */

function useCountUp(target: number, duration = 950): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * e));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

/* ------------------------------ difficulty picker ------------------------------ */

export function DifficultyPicker({
  value,
  onChange,
}: {
  value: DifficultyId;
  onChange: (id: DifficultyId) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {DIFFICULTIES.map((d) => {
        const active = d.id === value;
        return (
          <button
            key={d.id}
            type="button"
            onClick={() => onChange(d.id)}
            className="btn-pixel px-2 py-2.5 text-[11px] flex flex-col items-center gap-1"
            style={
              active
                ? { background: d.color, borderColor: d.color, color: "#071510", boxShadow: `0 5px 0 rgba(0,0,0,0.55), 0 0 22px ${d.color}55` }
                : undefined
            }
            aria-pressed={active}
          >
            <span>{d.label}</span>
            <span className="font-arcade text-[7px] opacity-80">×{d.mult} PTS</span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------ overlay chrome ------------------------------ */

function Overlay({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center overflow-y-auto bg-[rgba(4,13,9,0.86)]"
      style={{ animation: `overlay-in 0.3s cubic-bezier(0.2,0.9,0.3,1.15) ${delay}s both` }}
    >
      <div className="m-auto w-full px-5 py-6 flex flex-col items-center text-center">{children}</div>
    </div>
  );
}

/* ------------------------------ start screen ------------------------------ */

export function StartScreen({
  diff,
  onDiff,
  onStart,
  best,
}: {
  diff: DifficultyId;
  onDiff: (id: DifficultyId) => void;
  onStart: () => void;
  best: number;
}) {
  return (
    <Overlay>
      <p className="font-arcade text-[9px] tracking-[0.3em] text-ice-400 blink-hard mb-4">· INSERT COIN ·</p>
      <div className="title-bob">
        <SerpentMark className="w-14 h-14 mx-auto mb-3" />
        <h1
          className="font-arcade text-[clamp(20px,5.2vw,34px)] leading-tight text-venom-400"
          style={{ textShadow: "0 0 18px rgba(157,255,46,0.55), 3px 3px 0 #0a1c08" }}
        >
          SERPENTINE
        </h1>
      </div>
      <p className="mt-2 text-[13px] tracking-[0.28em] text-mint-300/80 font-semibold">NEON ARCADE SNAKE</p>

      <div className="mt-6 w-full max-w-[300px]">
        <p className="font-arcade text-[8px] text-mint-300/70 mb-2 tracking-widest">SELECT VENOM LEVEL</p>
        <DifficultyPicker value={diff} onChange={onDiff} />
      </div>

      <button type="button" onClick={onStart} className="btn-pixel btn-venom mt-6 px-8 py-3.5 text-sm flex items-center gap-3">
        <IconPlay className="w-4 h-4" />
        START RUN
      </button>

      <p className="mt-4 font-arcade text-[9px] text-venom-300/90">
        PRESS <span className="text-venom-400">ENTER</span>
        <span className="blink-hard"> ▮</span>
      </p>

      <div className="mt-5 flex items-center gap-2 text-[12px] text-mint-300/75 font-medium">
        <span className="keycap">▲</span>
        <span className="keycap">▼</span>
        <span className="keycap">◀</span>
        <span className="keycap">▶</span>
        <span className="mx-1 opacity-50">/</span>
        <span className="keycap">WASD</span>
        <span>steer</span>
        <span className="mx-1 opacity-50">·</span>
        <span>swipe on touch</span>
      </div>

      {best > 0 && (
        <p className="mt-4 flex items-center gap-2 text-[12px] font-semibold tracking-widest text-gold-400">
          <IconTrophy className="w-4 h-4" /> BEST ON THIS VENOM: {best.toLocaleString()}
        </p>
      )}
    </Overlay>
  );
}

/* ------------------------------ pause screen ------------------------------ */

export function PauseScreen({
  score,
  diff,
  onDiff,
  onResume,
  onRestart,
  onMenu,
}: {
  score: number;
  diff: DifficultyId;
  onDiff: (id: DifficultyId) => void;
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
}) {
  return (
    <Overlay>
      <h2 className="font-arcade text-[clamp(18px,4vw,26px)] text-gold-400 slam-in" style={{ textShadow: "3px 3px 0 #0a1c08" }}>
        PAUSED
      </h2>
      <p className="mt-2 text-[13px] tracking-[0.25em] text-mint-300/80 font-semibold">
        SCORE {score.toLocaleString()} — SERPENT NAPPING
      </p>

      <div className="mt-5 w-full max-w-[300px]">
        <p className="font-arcade text-[8px] text-mint-300/70 mb-2 tracking-widest">VENOM LEVEL</p>
        <DifficultyPicker value={diff} onChange={onDiff} />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={onResume} className="btn-pixel btn-venom px-6 py-3 text-[13px] flex items-center gap-2.5">
          <IconPlay className="w-4 h-4" /> RESUME
        </button>
        <button type="button" onClick={onRestart} className="btn-pixel px-5 py-3 text-[13px] flex items-center gap-2.5">
          <IconRestart className="w-4 h-4" /> RESTART
        </button>
        <button type="button" onClick={onMenu} className="btn-pixel px-5 py-3 text-[13px]">
          MENU
        </button>
      </div>

      <p className="mt-5 text-[12px] text-mint-300/70 font-medium flex items-center gap-2">
        <span className="keycap">P</span> or <span className="keycap">SPACE</span> to resume
      </p>
    </Overlay>
  );
}

/* ------------------------------ game over screen ------------------------------ */

export function GameOverScreen({
  score,
  best,
  isNewBest,
  apples,
  length,
  timeStr,
  onRestart,
  onMenu,
}: {
  score: number;
  best: number;
  isNewBest: boolean;
  apples: number;
  length: number;
  timeStr: string;
  onRestart: () => void;
  onMenu: () => void;
}) {
  const shown = useCountUp(score);
  return (
    <Overlay delay={0.55}>
      <p className="font-arcade text-[9px] tracking-[0.3em] text-ember-400 mb-3 flex items-center gap-2">
        <IconSkull className="w-4 h-4" /> THE SERPENT FELL
      </p>
      <h2
        className="font-arcade text-[clamp(22px,5vw,34px)] text-ember-500 slam-in"
        style={{ textShadow: "0 0 22px rgba(255,93,93,0.5), 3px 3px 0 #0a1c08" }}
      >
        GAME OVER
      </h2>

      {isNewBest && (
        <p className="mt-3 font-arcade text-[10px] text-gold-300 best-flash tracking-widest">★ NEW HIGH SCORE ★</p>
      )}

      <div className="mt-5 px-10 py-4 border-2 border-pit-line bg-pit-850/80" style={{ boxShadow: "0 6px 0 rgba(0,0,0,0.45)" }}>
        <p className="font-arcade text-[8px] text-mint-300/70 tracking-[0.25em]">FINAL SCORE</p>
        <p className="mt-2 font-arcade text-[clamp(22px,5vw,32px)] text-venom-400 leading-none">{shown.toLocaleString()}</p>
        <p className="mt-2 text-[11px] font-semibold tracking-[0.2em] text-gold-400/90">BEST {best.toLocaleString()}</p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 w-full max-w-[320px]">
        {[
          { k: "APPLES", v: String(apples) },
          { k: "LENGTH", v: String(length) },
          { k: "TIME", v: timeStr },
        ].map((s) => (
          <div key={s.k} className="border border-pit-line bg-pit-850/70 px-2 py-2.5">
            <p className="font-arcade text-[7px] text-mint-300/60 tracking-widest">{s.k}</p>
            <p className="mt-1 font-arcade text-[12px] text-mint-300">{s.v}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={onRestart} className="btn-pixel btn-venom px-7 py-3 text-[13px] flex items-center gap-2.5">
          <IconRestart className="w-4 h-4" /> RETRY
        </button>
        <button type="button" onClick={onMenu} className="btn-pixel px-5 py-3 text-[13px]">
          MENU
        </button>
      </div>
      <p className="mt-4 font-arcade text-[9px] text-venom-300/90">
        PRESS <span className="text-venom-400">ENTER</span> TO RETRY
      </p>
    </Overlay>
  );
}
