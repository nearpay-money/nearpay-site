/**
 * Marketing header, mobile menu (a native <details>; external module, strict CSP). The menu works without this
 * script; it only closes the panel when a section link is chosen (so the panel doesn't cover the section it
 * scrolled to) and on Escape, returning focus to the menu button.
 */
for (const menu of document.querySelectorAll<HTMLDetailsElement>(".web-menu")) {
  const summary = menu.querySelector("summary");
  menu.addEventListener("click", (e) => {
    if ((e.target as Element | null)?.closest("a[href*='#']")) menu.open = false;
  });
  menu.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !menu.open) return;
    menu.open = false;
    summary?.focus();
  });
}
