export const COLS = 21;
export const ROWS = 21;

export type Vec = { x: number; y: number };
export type Dir = "up" | "down" | "left" | "right";

export const DIR_VEC: Record<Dir, Vec> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export const OPPOSITE: Record<Dir, Dir> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

export type DifficultyId = "chill" | "classic" | "insane";

export interface Difficulty {
  id: DifficultyId;
  label: string;
  tagline: string;
  tickMs: number;
  mult: number;
  color: string;
}

export const DIFFICULTIES: Difficulty[] = [
  { id: "chill", label: "CHILL", tagline: "Garden stroll", tickMs: 150, mult: 1, color: "#53e6ff" },
  { id: "classic", label: "CLASSIC", tagline: "The real deal", tickMs: 105, mult: 2, color: "#b8ff4a" },
  { id: "insane", label: "INSANE", tagline: "Viper venom", tickMs: 70, mult: 3, color: "#ff5d5d" },
];

export const BONUS_EVERY = 5; // a golden fruit appears every N apples
export const BONUS_LIFETIME_MS = 6500;

export interface Bonus {
  pos: Vec;
  born: number;
}

export interface GameState {
  snake: Vec[];
  prev: Vec[];
  dir: Dir;
  queue: Dir[];
  food: Vec;
  bonus: Bonus | null;
  apples: number;
  grow: number;
  dead: boolean;
  deadAt: number;
}

export interface StepEvents {
  ate: boolean;
  ateBonus: boolean;
  died: boolean;
}

export function vecEq(a: Vec, b: Vec): boolean {
  return a.x === b.x && a.y === b.y;
}

export function randomFreeCell(occupied: Vec[]): Vec {
  const taken = new Set(occupied.map((c) => `${c.x},${c.y}`));
  const free: Vec[] = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!taken.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  if (free.length === 0) return { x: 0, y: 0 };
  return free[Math.floor(Math.random() * free.length)];
}

export function createGame(): GameState {
  const cy = Math.floor(ROWS / 2);
  const cx = Math.floor(COLS / 2);
  const snake: Vec[] = [
    { x: cx + 1, y: cy },
    { x: cx, y: cy },
    { x: cx - 1, y: cy },
    { x: cx - 2, y: cy },
  ];
  const food = randomFreeCell(snake);
  return {
    snake,
    prev: snake.map((s) => ({ ...s })),
    dir: "right",
    queue: [],
    food,
    bonus: null,
    apples: 0,
    grow: 0,
    dead: false,
    deadAt: 0,
  };
}

/** Advance the simulation by one tick. Mutates a shallow-copied state and reports events. */
export function stepGame(s: GameState, now: number): StepEvents {
  const events: StepEvents = { ate: false, ateBonus: false, died: false };
  s.prev = s.snake.map((c) => ({ ...c }));

  // consume queued turns
  while (s.queue.length > 0) {
    const next = s.queue.shift()!;
    if (next !== s.dir && next !== OPPOSITE[s.dir]) {
      s.dir = next;
      break;
    }
  }

  const v = DIR_VEC[s.dir];
  const head = s.snake[0];
  const nx = head.x + v.x;
  const ny = head.y + v.y;

  // walls
  if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) {
    s.dead = true;
    s.deadAt = now;
    events.died = true;
    return events;
  }

  const willGrow = s.grow > 0;
  // self-collision (tail cell vacates unless growing)
  const body = willGrow ? s.snake : s.snake.slice(0, -1);
  if (body.some((c) => c.x === nx && c.y === ny)) {
    s.dead = true;
    s.deadAt = now;
    events.died = true;
    return events;
  }

  const newHead = { x: nx, y: ny };
  s.snake = [newHead, ...s.snake];
  if (willGrow) {
    s.grow -= 1;
  } else {
    s.snake.pop();
  }

  if (vecEq(newHead, s.food)) {
    events.ate = true;
    s.apples += 1;
    s.grow += 1;
    s.food = randomFreeCell([...s.snake, ...(s.bonus ? [s.bonus.pos] : [])]);
    if (s.apples % BONUS_EVERY === 0 && !s.bonus) {
      s.bonus = { pos: randomFreeCell([...s.snake, s.food]), born: now };
    }
  }

  if (s.bonus) {
    if (now - s.bonus.born > BONUS_LIFETIME_MS) {
      s.bonus = null;
    } else if (vecEq(newHead, s.bonus.pos)) {
      events.ateBonus = true;
      s.grow += 2;
      s.bonus = null;
    }
  }

  return events;
}
