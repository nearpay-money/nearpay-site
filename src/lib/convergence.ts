/**
 * Home hero animation schedule (design v2 Main artboard / kit ConvergenceHero timings). Dependency-free: it is
 * bundled into the browser module src/scripts/hero.ts, so it must not import the kit or React.
 */

/* ------------------------------------------------------------------------------------------ */
/* Animation schedule (same timings as the kit component and the artboard script)               */
/* ------------------------------------------------------------------------------------------ */

/** Time between payments, first-payment delay and arrival-pulse offset (ms). */
export const HERO_TIMING = { interval: 2400, start: 600, arrive: 1450 } as const;
/** Routes in the kit's ConvergenceHero (`CONVERGENCE_ROUTES`); asserted in test/unit/hero.test.ts. */
export const ROUTE_COUNT = 5;

/** A random route, never the one just used (one dot, one route at a time). */
export function nextRoute(last: number, random: () => number, count = ROUTE_COUNT): number {
  let i = Math.floor(random() * count) % count;
  if (i === last) i = (i + 1 + Math.floor(random() * (count - 1))) % count;
  return i;
}

/** An SMIL animation element (`<animate>`, `<animateMotion>`). */
export interface Beginnable {
  beginElement?: () => void;
}

export interface ConvergenceParts {
  /** Per route: the dot's motion along the route and its fade. */
  motion: readonly Beginnable[];
  fade: readonly Beginnable[];
  /** Arrival pulse at the settlement point (ring radius, ring opacity, core radius). */
  pulse: readonly Beginnable[];
}

export interface Clock {
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (id: unknown) => void;
  setInterval: (fn: () => void, ms: number) => unknown;
  clearInterval: (id: unknown) => void;
}

export interface ConvergenceOptions {
  random?: () => number;
  /** Skip a payment while the tab is hidden. */
  hidden?: () => boolean;
  clock?: Clock;
  timing?: { interval: number; start: number; arrive: number };
}

function begin(el: Beginnable | undefined): void {
  try {
    el?.beginElement?.();
  } catch {
    /* SMIL unsupported: the static picture stays */
  }
}

const defaultClock: Clock = {
  setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
  clearTimeout: (id) => globalThis.clearTimeout(id as ReturnType<typeof setTimeout>),
  setInterval: (fn, ms) => globalThis.setInterval(fn, ms),
  clearInterval: (id) => globalThis.clearInterval(id as ReturnType<typeof setInterval>),
};

/**
 * Starts the hero: every `interval` ms one dot travels a random route (never the same twice in a row) and the
 * settlement point pulses when it arrives. Returns a stop function. Callers must not start it under
 * `prefers-reduced-motion: reduce` (the picture is static then).
 */
export function startConvergence(parts: ConvergenceParts, options: ConvergenceOptions = {}): () => void {
  const random = options.random ?? Math.random;
  const hidden = options.hidden ?? (() => false);
  const clock = options.clock ?? defaultClock;
  const timing = options.timing ?? HERO_TIMING;
  const count = Math.min(parts.motion.length, parts.fade.length);
  let last = -1;
  let arrive: unknown;
  const fire = () => {
    if (count === 0 || hidden()) return;
    const i = nextRoute(last, random, count);
    last = i;
    begin(parts.motion[i]);
    begin(parts.fade[i]);
    clock.clearTimeout(arrive);
    arrive = clock.setTimeout(() => {
      for (const el of parts.pulse) begin(el);
    }, timing.arrive);
  };
  const start = clock.setTimeout(fire, timing.start);
  const timer = clock.setInterval(fire, timing.interval);
  return () => {
    clock.clearTimeout(start);
    clock.clearInterval(timer);
    clock.clearTimeout(arrive);
  };
}
