import { useEffect, useMemo, useRef, useState, type CSSProperties, type TouchEvent as ReactTouchEvent } from "react";
import {
  COLS,
  DIFFICULTIES,
  OPPOSITE,
  createGame,
  stepGame,
  type Dir,
  type Difficulty,
  type DifficultyId,
  type GameState,
} from "./game/logic";
import {
  addText,
  burst,
  createFx,
  drawScene,
  shake,
  updateFx,
  type FxState,
  type Phase,
} from "./game/render";
import { sfx } from "./game/audio";
import {
  DifficultyPicker,
  GameOverScreen,
  IconPause,
  IconPlay,
  IconRestart,
  IconSoundOff,
  IconSoundOn,
  IconTrophy,
  PauseScreen,
  SerpentMark,
  StartScreen,
} from "./components/Screens";

/* --------------------------------- helpers --------------------------------- */

const KEY_DIRS: Record<string, Dir> = {
  arrowup: "up",
  w: "up",
  arrowdown: "down",
  s: "down",
  arrowleft: "left",
  a: "left",
  arrowright: "right",
  d: "right",
};

const bestKey = (id: DifficultyId) => `serpentine.best.${id}`;

function loadBest(id: DifficultyId): number {
  try {
    return Math.max(0, parseInt(localStorage.getItem(bestKey(id)) ?? "0", 10) || 0);
  } catch {
    return 0;
  }
}

function loadAllBests(): Record<DifficultyId, number> {
  return { chill: loadBest("chill"), classic: loadBest("classic"), insane: loadBest("insane") };
}

function loadMuted(): boolean {
  try {
    return localStorage.getItem("serpentine.muted") === "1";
  } catch {
    return false;
  }
}

function fmtTime(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

const LAMP: Record<Phase, { color: string; label: string }> = {
  idle: { color: "#53e6ff", label: "READY" },
  playing: { color: "#b8ff4a", label: "PLAY" },
  paused: { color: "#ffd23f", label: "PAUSE" },
  over: { color: "#ff5d5d", label: "DEAD" },
};

/* ----------------------------------- app ----------------------------------- */

export default function App() {
  /* ui state */
  const [phase, setPhase] = useState<Phase>("idle");
  const [diffId, setDiffIdState] = useState<DifficultyId>("classic");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => loadBest("classic"));
  const [allBests, setAllBests] = useState(loadAllBests);
  const [apples, setApples] = useState(0);
  const [length, setLength] = useState(4);
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(loadMuted);
  const [newBest, setNewBest] = useState(false);
  const [popKey, setPopKey] = useState(0);

  /* engine refs */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GameState>(createGame());
  const fxRef = useRef<FxState>(createFx());
  const phaseRef = useRef<Phase>("idle");
  const diffRef = useRef<Difficulty>(DIFFICULTIES[1]);
  const scoreRef = useRef(0);
  const bestRef = useRef(best);
  const accRef = useRef(0);
  const elapsedMsRef = useRef(0);
  const elapsedShownRef = useRef(0);
  const lastFrameRef = useRef(0);
  const rafRef = useRef(0);
  const sizeRef = useRef({ size: 0, dpr: 1 });
  const cellRef = useRef(0);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const jingleTimerRef = useRef<number | null>(null);

  const setPhaseBoth = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  /* keep engine refs in sync with difficulty */
  useEffect(() => {
    const d = DIFFICULTIES.find((x) => x.id === diffId) ?? DIFFICULTIES[1];
    diffRef.current = d;
    const b = loadBest(diffId);
    bestRef.current = b;
    setBest(b);
  }, [diffId]);

  useEffect(() => {
    sfx.setMuted(muted);
  }, [muted]);

  /* ------------------------------- actions ------------------------------- */

  const start = () => {
    if (jingleTimerRef.current) window.clearTimeout(jingleTimerRef.current);
    gameRef.current = createGame();
    fxRef.current = createFx();
    accRef.current = 0;
    elapsedMsRef.current = 0;
    elapsedShownRef.current = 0;
    scoreRef.current = 0;
    setScore(0);
    setApples(0);
    setLength(4);
    setElapsed(0);
    setNewBest(false);
    sfx.unlock();
    sfx.start();
    setPhaseBoth("playing");
  };

  const endRun = () => {
    const sc = scoreRef.current;
    const id = diffRef.current.id;
    if (sc > bestRef.current) {
      bestRef.current = sc;
      setBest(sc);
      setNewBest(true);
      setAllBests((prev) => ({ ...prev, [id]: sc }));
      try {
        localStorage.setItem(bestKey(id), String(sc));
      } catch {
        /* storage unavailable */
      }
      jingleTimerRef.current = window.setTimeout(() => sfx.best(), 750);
    }
  };

  const onDeath = () => {
    sfx.die();
    const fx = fxRef.current;
    shake(fx, 10, 0.55);
    fx.flash = 1;
    const cell = cellRef.current;
    const h = gameRef.current.snake[0];
    burst(fx, (h.x + 0.5) * cell, (h.y + 0.5) * cell, ["#ff5d5d", "#b8ff4a", "#7df0c0"], 22, 190);
    endRun();
    setPhaseBoth("over");
  };

  const doTick = (nowMs: number) => {
    const s = gameRef.current;
    if (s.dead) return;
    const diff = diffRef.current;
    const fx = fxRef.current;
    const cell = cellRef.current;
    const ev = stepGame(s, nowMs);

    if (ev.ate) {
      const pts = 10 * diff.mult;
      scoreRef.current += pts;
      setScore(scoreRef.current);
      setPopKey((k) => k + 1);
      setApples(s.apples);
      setLength(s.snake.length);
      const px = (s.snake[0].x + 0.5) * cell;
      const py = (s.snake[0].y + 0.5) * cell;
      burst(fx, px, py, ["#ff5d5d", "#ff9d7e", "#ffd23f", "#b8ff4a"], 14, 150);
      addText(fx, px, py - cell * 0.7, `+${pts}`, "#d3ff70", 11);
      shake(fx, 2.2, 0.12);
      sfx.eat();
    }
    if (ev.ateBonus) {
      const pts = 50 * diff.mult;
      scoreRef.current += pts;
      setScore(scoreRef.current);
      setPopKey((k) => k + 1);
      setLength(s.snake.length);
      const px = (s.snake[0].x + 0.5) * cell;
      const py = (s.snake[0].y + 0.5) * cell;
      burst(fx, px, py, ["#ffd23f", "#ffe08a", "#fff6d8", "#b8ff4a"], 22, 190);
      addText(fx, px, py - cell * 0.7, `+${pts}`, "#ffd23f", 13);
      shake(fx, 3.4, 0.18);
      sfx.bonus();
    }
    if (ev.died) onDeath();
  };

  const togglePause = () => {
    if (phaseRef.current === "playing") {
      sfx.pause();
      setPhaseBoth("paused");
    } else if (phaseRef.current === "paused") {
      sfx.resume();
      lastFrameRef.current = performance.now();
      setPhaseBoth("playing");
    }
  };

  const toMenu = () => {
    if (jingleTimerRef.current) window.clearTimeout(jingleTimerRef.current);
    gameRef.current = createGame();
    fxRef.current = createFx();
    scoreRef.current = 0;
    setScore(0);
    setApples(0);
    setLength(4);
    setElapsed(0);
    setNewBest(false);
    sfx.ui();
    setPhaseBoth("idle");
  };

  const enqueueDir = (d: Dir) => {
    if (phaseRef.current === "idle") {
      start();
      const s = gameRef.current;
      if (d !== s.dir && d !== OPPOSITE[s.dir]) s.queue.push(d);
      return;
    }
    if (phaseRef.current !== "playing") return;
    const s = gameRef.current;
    const lastDir = s.queue.length > 0 ? s.queue[s.queue.length - 1] : s.dir;
    if (d === lastDir || d === OPPOSITE[lastDir]) return;
    if (s.queue.length >= 3) return;
    s.queue.push(d);
    sfx.turn();
  };

  const handlePrimary = () => {
    sfx.unlock();
    const ph = phaseRef.current;
    if (ph === "idle" || ph === "over") start();
    else togglePause();
  };

  const toggleMute = () => {
    setMuted((m) => {
      const nm = !m;
      sfx.setMuted(nm);
      try {
        localStorage.setItem("serpentine.muted", nm ? "1" : "0");
      } catch {
        /* noop */
      }
      return nm;
    });
  };

  const setDiffId = (id: DifficultyId) => {
    sfx.unlock();
    sfx.ui();
    setDiffIdState(id);
  };

  /* ---------------------------- main loop + fx ---------------------------- */

  useEffect(() => {
    const cv = canvasRef.current;
    const board = boardRef.current;
    if (!cv || !board) return;
    const ctx = cv.getContext("2d");

    const ro = new ResizeObserver(() => {
      const rect = board.getBoundingClientRect();
      const size = Math.max(120, Math.floor(Math.min(rect.width, rect.height)));
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = size * dpr;
      cv.height = size * dpr;
      sizeRef.current = { size, dpr };
      cellRef.current = size / COLS;
    });
    ro.observe(board);

    const frame = (now: number) => {
      const last = lastFrameRef.current || now;
      const dt = Math.min(0.1, (now - last) / 1000);
      lastFrameRef.current = now;

      const fx = fxRef.current;
      updateFx(fx, dt);

      const ph = phaseRef.current;
      const diff = diffRef.current;

      if (ph === "playing") {
        elapsedMsRef.current += dt * 1000;
        accRef.current += dt * 1000;
        let guard = 0;
        while (accRef.current >= diff.tickMs && guard++ < 5) {
          accRef.current -= diff.tickMs;
          doTick(performance.now());
          if (phaseRef.current !== "playing") {
            accRef.current = 0;
            break;
          }
        }
        const sec = Math.floor(elapsedMsRef.current / 1000);
        if (sec !== elapsedShownRef.current) {
          elapsedShownRef.current = sec;
          setElapsed(sec);
        }
      }

      const { size, dpr } = sizeRef.current;
      if (ctx && size > 0) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const t = ph === "playing" ? Math.min(1, accRef.current / diff.tickMs) : 1;
        drawScene(ctx, gameRef.current, fx, {
          w: size,
          h: size,
          cell: cellRef.current,
          t,
          now,
          phase: ph,
        });
      }
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------- keyboard ------------------------------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      const lower = k.toLowerCase();
      const dir = KEY_DIRS[lower];
      if (dir) {
        e.preventDefault();
        sfx.unlock();
        enqueueDir(dir);
        return;
      }
      if (k === " " || k === "Enter") {
        e.preventDefault();
        const el = document.activeElement as HTMLElement | null;
        el?.blur?.();
        handlePrimary();
        return;
      }
      if (lower === "p" || k === "Escape") {
        if (k === "Escape" && phaseRef.current === "over") toMenu();
        else togglePause();
        return;
      }
      if (lower === "r" && phaseRef.current !== "idle") {
        start();
        return;
      }
      if (lower === "m") {
        toggleMute();
        return;
      }
      if (k === "1" || k === "2" || k === "3") {
        const d = DIFFICULTIES[Number(k) - 1];
        if (d) setDiffId(d.id);
      }
    };
    window.addEventListener("keydown", onKey);

    const autoPause = () => {
      if (phaseRef.current === "playing") togglePause();
    };
    const onVis = () => {
      if (document.hidden) autoPause();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", autoPause);

    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", autoPause);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (jingleTimerRef.current) window.clearTimeout(jingleTimerRef.current);
    };
  }, []);

  /* --------------------------------- touch --------------------------------- */

  const onTouchStart = (e: ReactTouchEvent) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY };
    sfx.unlock();
  };
  const onTouchMove = (e: ReactTouchEvent) => {
    const origin = touchRef.current;
    if (!origin) return;
    const t = e.touches[0];
    const dx = t.clientX - origin.x;
    const dy = t.clientY - origin.y;
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) enqueueDir(dx > 0 ? "right" : "left");
    else enqueueDir(dy > 0 ? "down" : "up");
    touchRef.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: ReactTouchEvent) => {
    const origin = touchRef.current;
    touchRef.current = null;
    if (!origin) return;
    const t = e.changedTouches[0];
    const dist = Math.hypot(t.clientX - origin.x, t.clientY - origin.y);
    if (dist < 14) handlePrimary();
  };

  /* -------------------------------- ambience -------------------------------- */

  const fireflies = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 2 + Math.random() * 3.4,
        color: ["rgba(184,255,74,0.85)", "rgba(83,230,255,0.75)", "rgba(255,210,63,0.75)"][i % 3],
        dx: (Math.random() - 0.5) * 130,
        dy: -(30 + Math.random() * 100),
        dur: 8 + Math.random() * 9,
        delay: -Math.random() * 16,
        max: 0.3 + Math.random() * 0.5,
      })),
    []
  );

  /* --------------------------------- render --------------------------------- */

  const diff = DIFFICULTIES.find((d) => d.id === diffId) ?? DIFFICULTIES[1];
  const shownBest = Math.max(best, score);
  const beatingBest = score > 0 && score >= best && best > 0;
  const lamp = LAMP[phase];
  const timeStr = fmtTime(elapsed);

  const dpadBtn =
    "btn-pixel touch-none select-none aspect-square flex items-center justify-center text-lg leading-none";

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* ambient layers */}
      <div className="fixed inset-0 z-0 ambient-glow" />
      <div className="fixed inset-0 z-0 ambient-grid" />
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {fireflies.map((f) => (
          <span
            key={f.id}
            className="firefly"
            style={
              {
                left: `${f.left}%`,
                top: `${f.top}%`,
                width: f.size,
                height: f.size,
                background: f.color,
                boxShadow: `0 0 ${f.size * 3}px ${f.color}`,
                "--ff-dx": `${f.dx}px`,
                "--ff-dy": `${f.dy}px`,
                "--ff-dur": `${f.dur}s`,
                "--ff-delay": `${f.delay}s`,
                "--ff-max": f.max,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className="fixed inset-0 z-40 pointer-events-none scanlines" />
      <div className="fixed inset-0 z-30 pointer-events-none crt-vignette" />

      {/* frame */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col gap-4 px-3 py-4 sm:px-5 lg:py-6">
        {/* header */}
        <header className="relative border border-pit-line bg-pit-850/90 pt-3.5 pb-3 px-3 sm:px-4" style={{ boxShadow: "0 10px 30px rgba(0,0,0,0.4)" }}>
          <div className="hazard-strip absolute inset-x-0 top-0" />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-3">
              <SerpentMark className="w-10 h-10" />
              <div>
                <h1 className="font-arcade text-[13px] sm:text-[15px] text-venom-400 leading-none" style={{ textShadow: "2px 2px 0 #0a1c08" }}>
                  SERPENTINE
                </h1>
                <p className="mt-1 text-[10px] font-semibold tracking-[0.3em] text-mint-300/70">NEON ARCADE SNAKE</p>
              </div>
            </div>

            <span className="hidden sm:flex items-center gap-2 border border-pit-line bg-pit-900 px-3 py-1.5">
              <span
                className={`h-2.5 w-2.5 rounded-full ${phase === "playing" ? "pulse-soft" : ""}`}
                style={{ background: lamp.color, boxShadow: `0 0 10px ${lamp.color}` }}
              />
              <span className="font-arcade text-[9px]" style={{ color: lamp.color }}>
                {lamp.label}
              </span>
            </span>

            <div className="ml-auto flex items-center gap-3 sm:gap-5">
              <div className="text-right">
                <p className="font-arcade text-[7px] tracking-[0.2em] text-mint-300/60">SCORE</p>
                <p key={popKey} className="hud-pop mt-1 font-arcade text-[15px] sm:text-[19px] leading-none text-venom-400">
                  {score.toLocaleString()}
                </p>
              </div>
              <div className="h-8 w-px bg-pit-line" />
              <div className="text-right">
                <p className="font-arcade text-[7px] tracking-[0.2em] text-mint-300/60 flex items-center gap-1 justify-end">
                  <IconTrophy className="w-3 h-3 text-gold-400" /> BEST
                </p>
                <p className={`mt-1 font-arcade text-[15px] sm:text-[19px] leading-none text-gold-400 ${beatingBest ? "best-flash" : ""}`}>
                  {shownBest.toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={toggleMute}
                className="btn-pixel flex h-10 w-10 items-center justify-center"
                aria-label={muted ? "Unmute sound" : "Mute sound"}
                title="M — toggle sound"
              >
                {muted ? <IconSoundOff className="w-4.5 h-4.5" /> : <IconSoundOn className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>
        </header>

        {/* main */}
        <main className="grid flex-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_296px]">
          {/* board column */}
          <section className="flex w-full flex-col gap-3">
            <div
              ref={boardRef}
              className="bezel touch-board relative mx-auto aspect-square w-full"
              style={{ maxWidth: "min(100%, 68dvh, 640px)", width: "min(100%, 68dvh, 640px)" }}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              <span className="corner corner-tl" />
              <span className="corner corner-tr" />
              <span className="corner corner-bl" />
              <span className="corner corner-br" />
              <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />

              {phase === "idle" && <StartScreen diff={diffId} onDiff={setDiffId} onStart={start} best={best} />}
              {phase === "paused" && (
                <PauseScreen
                  score={score}
                  diff={diffId}
                  onDiff={setDiffId}
                  onResume={togglePause}
                  onRestart={start}
                  onMenu={toMenu}
                />
              )}
              {phase === "over" && (
                <GameOverScreen
                  score={score}
                  best={best}
                  isNewBest={newBest}
                  apples={apples}
                  length={length}
                  timeStr={timeStr}
                  onRestart={start}
                  onMenu={toMenu}
                />
              )}
            </div>

            {/* status strip */}
            <div className="mx-auto flex w-full max-w-[640px] flex-wrap items-center justify-center gap-2">
              {[
                { k: "LENGTH", v: String(length), c: "#7df0c0" },
                { k: "APPLES", v: String(apples), c: "#ff7a5d" },
                { k: "SPEED", v: `${(1000 / diff.tickMs).toFixed(1)}/s`, c: "#53e6ff" },
                { k: "TIME", v: timeStr, c: "#d9ffe9" },
                { k: "POINTS", v: `×${diff.mult}`, c: diff.color },
              ].map((chip) => (
                <span key={chip.k} className="flex items-baseline gap-2 border border-pit-line bg-pit-850/80 px-2.5 py-1.5">
                  <span className="font-arcade text-[7px] tracking-widest text-mint-300/55">{chip.k}</span>
                  <span className="font-arcade text-[11px]" style={{ color: chip.c }}>
                    {chip.v}
                  </span>
                </span>
              ))}
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={togglePause}
                  disabled={phase !== "playing" && phase !== "paused"}
                  className="btn-pixel flex h-9 w-9 items-center justify-center disabled:opacity-40"
                  aria-label={phase === "paused" ? "Resume" : "Pause"}
                  title="P — pause"
                >
                  {phase === "paused" ? <IconPlay className="w-3.5 h-3.5" /> : <IconPause className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={start}
                  disabled={phase === "idle"}
                  className="btn-pixel flex h-9 w-9 items-center justify-center disabled:opacity-40"
                  aria-label="Restart"
                  title="R — restart"
                >
                  <IconRestart className="w-3.5 h-3.5" />
                </button>
              </span>
            </div>

            {/* touch dpad */}
            <div
              className="coarse-only mx-auto w-full max-w-[300px] grid-cols-3 gap-2 pt-1 pb-2"
              onContextMenu={(e) => e.preventDefault()}
            >
              <span />
              <button type="button" className={dpadBtn} onPointerDown={(e) => { e.preventDefault(); sfx.unlock(); enqueueDir("up"); }} aria-label="Up">▲</button>
              <span />
              <button type="button" className={dpadBtn} onPointerDown={(e) => { e.preventDefault(); sfx.unlock(); enqueueDir("left"); }} aria-label="Left">◀</button>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  className="btn-pixel touch-none select-none flex h-11 w-11 items-center justify-center"
                  onPointerDown={(e) => { e.preventDefault(); handlePrimary(); }}
                  aria-label="Pause or resume"
                >
                  {phase === "paused" ? <IconPlay className="w-4 h-4" /> : <IconPause className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  className="btn-pixel touch-none select-none flex h-11 w-11 items-center justify-center"
                  onPointerDown={(e) => { e.preventDefault(); if (phaseRef.current !== "idle") start(); }}
                  aria-label="Restart"
                >
                  <IconRestart className="w-4 h-4" />
                </button>
              </div>
              <button type="button" className={dpadBtn} onPointerDown={(e) => { e.preventDefault(); sfx.unlock(); enqueueDir("down"); }} aria-label="Down">▼</button>
              <span />
              <button type="button" className={dpadBtn} onPointerDown={(e) => { e.preventDefault(); sfx.unlock(); enqueueDir("right"); }} aria-label="Right">▶</button>
              <span />
            </div>
          </section>

          {/* side panels */}
          <aside className="hidden w-full flex-col gap-4 lg:flex">
            <div className="border border-pit-line bg-pit-850/85 p-4">
              <h2 className="font-arcade text-[9px] tracking-[0.25em] text-mint-300/80">VENOM LEVEL</h2>
              <div className="mt-3">
                <DifficultyPicker value={diffId} onChange={setDiffId} />
              </div>
              <p className="mt-3 text-[12px] font-medium text-mint-300/70">
                {diff.tagline} — {(1000 / diff.tickMs).toFixed(1)} cells/s, points ×{diff.mult}. Hot-swap anytime with{" "}
                <span className="keycap">1</span> <span className="keycap">2</span> <span className="keycap">3</span>
              </p>
            </div>

            <div className="border border-pit-line bg-pit-850/85 p-4">
              <h2 className="font-arcade text-[9px] tracking-[0.25em] text-mint-300/80">CONTROLS</h2>
              <ul className="mt-3 space-y-2.5 text-[13px] font-medium text-mint-300/85">
                <li className="flex items-center justify-between gap-2">
                  <span>Steer</span>
                  <span className="flex gap-1"><span className="keycap">▲▼◀▶</span><span className="keycap">WASD</span></span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span>Pause</span>
                  <span className="flex gap-1"><span className="keycap">P</span><span className="keycap">SPACE</span></span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span>Restart</span>
                  <span className="keycap">R</span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span>Sound</span>
                  <span className="keycap">M</span>
                </li>
              </ul>
              <p className="mt-3 border-t border-pit-line pt-2.5 text-[12px] font-medium text-mint-300/60">
                On touch: swipe the pit to steer, tap to pause or resume.
              </p>
            </div>

            <div className="border border-pit-line bg-pit-850/85 p-4">
              <h2 className="font-arcade text-[9px] tracking-[0.25em] text-gold-400/90 flex items-center gap-2">
                <IconTrophy className="w-3.5 h-3.5" /> HALL OF FAME
              </h2>
              <ul className="mt-3 space-y-2">
                {DIFFICULTIES.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2 text-[13px] font-semibold">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2" style={{ background: d.color, boxShadow: `0 0 8px ${d.color}` }} />
                      <span style={{ color: d.color }}>{d.label}</span>
                    </span>
                    <span className="font-arcade text-[11px] text-mint-300">
                      {allBests[d.id] > 0 ? allBests[d.id].toLocaleString() : "———"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="px-1 text-[12px] font-medium italic text-mint-300/50">
              Feed the serpent. Don't become the serpent. Golden fruit is worth 5× — grab it before the fuse runs out.
            </p>
          </aside>
        </main>

        {/* footer */}
        <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pb-1 text-[11px] font-semibold tracking-[0.18em] text-mint-300/45">
          <span>SERPENTINE v1.0</span>
          <span className="text-venom-500/60">◆</span>
          <span>EAT · GROW · SURVIVE</span>
          <span className="text-venom-500/60">◆</span>
          <span className="fine-only">KEYBOARD READY</span>
          <span className="coarse-only">SWIPE READY</span>
        </footer>
      </div>
    </div>
  );
}
