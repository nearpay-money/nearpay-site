/**
 * Progressive enhancement for the docs (external module; nothing inline, strict CSP):
 * - a "Copy" button on every code block, with the result announced politely;
 * - the /search page: loads /search-index.json and renders matches for ?q=.
 * Pages are complete without this script.
 */
import { rank, type SearchDoc } from "../lib/search";

function announce(region: HTMLElement, text: string): void {
  region.textContent = "";
  window.setTimeout(() => {
    region.textContent = text;
  }, 50);
}

function enhanceCodeBlocks(): void {
  const live = document.createElement("div");
  live.className = "np-sr-only";
  live.setAttribute("role", "status");
  live.setAttribute("aria-live", "polite");
  document.body.append(live);

  for (const pre of document.querySelectorAll<HTMLPreElement>(".prose pre, .code-block pre")) {
    if (pre.dataset.enhanced) continue;
    pre.dataset.enhanced = "1";
    if (!pre.hasAttribute("tabindex")) pre.tabIndex = 0; // scrollable regions must be keyboard reachable
    const button = document.createElement("button");
    button.type = "button";
    button.className = "copy-button";
    button.textContent = "Copy";
    button.setAttribute("aria-label", "Copy code");
    button.addEventListener("click", async () => {
      const text = pre.querySelector("code")?.textContent ?? pre.textContent ?? "";
      try {
        await navigator.clipboard.writeText(text);
        button.textContent = "Copied";
        announce(live, "Code copied to clipboard");
      } catch {
        button.textContent = "Copy failed";
        announce(live, "Copy failed. Select the code and copy it manually.");
      }
      window.setTimeout(() => {
        button.textContent = "Copy";
      }, 2000);
    });
    const bar = pre.previousElementSibling;
    if (bar?.classList.contains("code-block__bar")) {
      bar.append(button);
    } else {
      const wrap = document.createElement("div");
      wrap.className = "code-wrap";
      pre.replaceWith(wrap);
      wrap.append(pre, button);
    }
  }
}

async function runSearch(): Promise<void> {
  const root = document.querySelector<HTMLElement>("[data-search-page]");
  if (!root) return;
  const input = document.querySelector<HTMLInputElement>("#search-page-input");
  const list = root.querySelector<HTMLOListElement>("[data-search-results]");
  const status = root.querySelector<HTMLElement>("[data-search-status]");
  if (!input || !list || !status) return;
  root.querySelector("[data-search-nojs]")?.remove();
  let docs: SearchDoc[] = [];
  try {
    const res = await fetch("/search-index.json", { credentials: "omit" });
    if (!res.ok) throw new Error(String(res.status));
    docs = (await res.json()) as SearchDoc[];
  } catch {
    status.textContent = "Search is unavailable right now. Use the menu to browse the docs.";
    return;
  }
  const render = (q: string) => {
    list.replaceChildren();
    const query = q.trim();
    if (!query) {
      status.textContent = "Type to search guides, API endpoints and error codes.";
      return;
    }
    const hits = rank(docs, query).slice(0, 30);
    status.textContent = hits.length
      ? `${hits.length} result${hits.length === 1 ? "" : "s"} for “${query}”`
      : `No results for “${query}”. Try an endpoint path, an object name or an error code.`;
    for (const hit of hits) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = hit.href;
      const title = document.createElement("span");
      title.className = "search-results__title";
      title.textContent = hit.title;
      const meta = document.createElement("span");
      meta.className = "search-results__meta";
      meta.textContent = `${hit.section} · ${hit.text}`;
      a.append(title, meta);
      li.append(a);
      list.append(li);
    }
  };
  const initial = new URLSearchParams(window.location.search).get("q") ?? "";
  input.value = initial;
  render(initial);
  input.addEventListener("input", () => {
    const url = new URL(window.location.href);
    url.searchParams.set("q", input.value);
    window.history.replaceState(null, "", url);
    render(input.value);
  });
}

enhanceCodeBlocks();
void runSearch();
