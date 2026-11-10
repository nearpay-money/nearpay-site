/**
 * Home hero animation (external module; nothing inline, strict CSP). Wires the build-time ConvergenceHero
 * markup to the schedule in lib/hero.ts: one glowing dot on a random route every 2.4 s, with an arrival pulse.
 * Static under `prefers-reduced-motion: reduce` (and the kit CSS hides the dots there too); it starts or stops
 * when that preference changes. The page is complete without this script.
 */
import { type Beginnable, startConvergence } from "../lib/convergence";

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

for (const figure of document.querySelectorAll<HTMLElement>(".np-convergence")) {
  const dots = [...figure.querySelectorAll<SVGCircleElement>(".np-convergence__dot")];
  const parts = {
    motion: dots.map((d) => d.querySelector("animateMotion") as Beginnable | null).filter((x) => x !== null),
    fade: dots.map((d) => d.querySelector("animate") as Beginnable | null).filter((x) => x !== null),
    pulse: [...figure.querySelectorAll<SVGElement>("svg > circle:not(.np-convergence__dot) > animate")] as Beginnable[],
  };
  let stop: (() => void) | undefined;
  const sync = () => {
    stop?.();
    stop = undefined;
    figure.dataset.motion = reduce.matches ? "off" : "on";
    if (!reduce.matches) stop = startConvergence(parts, { hidden: () => document.hidden });
  };
  sync();
  reduce.addEventListener("change", sync);
}
