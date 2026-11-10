import { CONVERGENCE_ROUTES } from "@nearpay-internal/ui";
import { describe, expect, it } from "vitest";
import { checkHtml } from "../../scripts/check-dist.mjs";
import {
  type Beginnable,
  type Clock,
  HERO_TIMING,
  nextRoute,
  ROUTE_COUNT,
  startConvergence,
} from "../../src/lib/convergence";
import { HERO_LABELS, heroMarkup } from "../../src/lib/hero";

describe("hero markup (kit ConvergenceHero, rendered at build time)", () => {
  const html = heroMarkup();

  it("has the artboard's chips, card and a text alternative", () => {
    for (const label of HERO_LABELS) expect(html).toContain(`>${label}</li>`);
    for (const text of ["Payment received", ">Paid<", "$49.00", "Settled as USDC to your NEAR wallet", "1 block"]) {
      expect(html).toContain(text);
    }
    expect(html).toContain('<figcaption class="np-sr-only">');
    expect(html).toContain('aria-hidden="true"');
    expect(html.match(/class="np-convergence__dot"/g)).toHaveLength(ROUTE_COUNT);
  });

  it("is CSP-clean: no inline styles, scripts or handlers", () => {
    const page = `<html lang="en"><title>t</title><h1>x</h1><main id="main">${html}</main></html>`;
    expect(checkHtml("/tmp/hero.html", page)).toEqual([]);
  });

  it("route count matches the kit", () => {
    expect(ROUTE_COUNT).toBe(CONVERGENCE_ROUTES.length);
  });
});

describe("hero animation schedule", () => {
  it("never repeats the previous route", () => {
    const seq = [0.1, 0.1, 0.5, 0.1, 0.99, 0.99, 0];
    let k = 0;
    const rnd = () => seq[k++ % seq.length] as number;
    let last = -1;
    for (let n = 0; n < 50; n++) {
      const i = nextRoute(last, rnd);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(ROUTE_COUNT);
      expect(i).not.toBe(last);
      last = i;
    }
  });

  /** Manual clock: timers run when `advance` passes their due time. */
  function manualClock() {
    let now = 0;
    let id = 0;
    const timers = new Map<number, { at: number; fn: () => void; every?: number }>();
    const clock: Clock = {
      setTimeout: (fn, ms) => {
        timers.set(++id, { at: now + ms, fn });
        return id;
      },
      clearTimeout: (t) => {
        timers.delete(t as number);
      },
      setInterval: (fn, ms) => {
        timers.set(++id, { at: now + ms, fn, every: ms });
        return id;
      },
      clearInterval: (t) => {
        timers.delete(t as number);
      },
    };
    const advance = (ms: number) => {
      const end = now + ms;
      for (;;) {
        const due = [...timers.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        const [key, t] = due;
        now = t.at;
        if (t.every) t.at += t.every;
        else timers.delete(key);
        t.fn();
      }
      now = end;
    };
    return { clock, advance, pending: () => timers.size };
  }

  const anim = (log: string[], name: string): Beginnable => ({ beginElement: () => log.push(name) });

  it("fires one route at the start, then every interval, with an arrival pulse", () => {
    const log: string[] = [];
    const parts = {
      motion: [0, 1, 2, 3, 4].map((i) => anim(log, `m${i}`)),
      fade: [0, 1, 2, 3, 4].map((i) => anim(log, `o${i}`)),
      pulse: [anim(log, "ringR"), anim(log, "ringO"), anim(log, "core")],
    };
    const { clock, advance, pending } = manualClock();
    const stop = startConvergence(parts, { clock, random: () => 0.5 });
    advance(HERO_TIMING.start - 1);
    expect(log).toEqual([]);
    advance(1);
    expect(log).toEqual(["m2", "o2"]);
    advance(HERO_TIMING.arrive);
    expect(log.slice(2)).toEqual(["ringR", "ringO", "core"]);
    log.length = 0;
    advance(HERO_TIMING.interval - HERO_TIMING.start - HERO_TIMING.arrive);
    expect(log[0]).toMatch(/^m[0-4]$/);
    expect(log[0]).not.toBe("m2"); // a different route from the last one
    stop();
    expect(pending()).toBe(0);
  });

  it("skips payments while hidden and survives missing SMIL support", () => {
    const log: string[] = [];
    const throwing: Beginnable = {
      beginElement: () => {
        throw new Error("no SMIL");
      },
    };
    const parts = { motion: [throwing, {}], fade: [anim(log, "o0"), anim(log, "o1")], pulse: [throwing] };
    const { clock, advance } = manualClock();
    let hidden = true;
    const stop = startConvergence(parts, { clock, hidden: () => hidden });
    advance(HERO_TIMING.start + HERO_TIMING.arrive);
    expect(log).toEqual([]);
    hidden = false;
    expect(() => advance(HERO_TIMING.interval * 2)).not.toThrow();
    expect(log.length).toBeGreaterThan(0);
    stop();
  });

  it("does nothing without routes and uses real timers by default", () => {
    const stop = startConvergence({ motion: [], fade: [], pulse: [] });
    stop();
    const stopEmpty = startConvergence(
      { motion: [], fade: [], pulse: [] },
      { timing: { interval: 1, start: 0, arrive: 0 } },
    );
    return new Promise<void>((resolve) =>
      setTimeout(() => {
        stopEmpty();
        resolve();
      }, 5),
    );
  });
});
