/** Docs search: a small static index (built at /search-index.json) and a dependency-free ranker. */
export interface SearchDoc {
  title: string;
  href: string;
  section: string;
  /** Short description shown under the title. */
  text: string;
  /** Extra searchable words (headings, paths, codes). */
  keywords: string;
}

function norm(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

/** Scores every doc against all query terms (AND); title and keyword hits weigh more than text. */
export function rank(docs: readonly SearchDoc[], query: string): SearchDoc[] {
  const terms = norm(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  const scored: { doc: SearchDoc; score: number }[] = [];
  for (const doc of docs) {
    const title = norm(doc.title);
    const keywords = norm(doc.keywords);
    const text = norm(doc.text);
    let score = 0;
    let all = true;
    for (const term of terms) {
      let s = 0;
      if (title === term) s += 20;
      if (title.startsWith(term)) s += 8;
      if (title.includes(term)) s += 6;
      if (keywords.includes(term)) s += 3;
      if (text.includes(term)) s += 1;
      if (s === 0) {
        all = false;
        break;
      }
      score += s;
    }
    if (all) scored.push({ doc, score });
  }
  return scored.sort((a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title)).map((x) => x.doc);
}
