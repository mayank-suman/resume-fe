# CV Page 1: Two-Column Career Timeline & Skills

## Context

Page 1 (Summary, Career Timeline, Skills, Education) ended with a large block of unused white space before the footer, while page 2 opened cold with the "Experience" section header and its first entry (Xsolla), because `cv.tex` forced a `\newpage` between Education and Experience. The goal was to reduce that wasted space so the Experience section starts closer to, or on, page 1.

The `\project` entries under Experience (`section_projets.tex`) are emitted as a single atomic row of a `longtable` (header + description + itemized bullets + tech tags all in one cell), so an entry cannot split mid-body across a page boundary — it's all-or-nothing. The Xsolla entry alone is roughly 5in tall, far more than page 1's available white space, so making the *entire* first entry appear on page 1 was ruled out without either restructuring `\project` into per-bullet rows or drastically trimming its bullet content. Both were rejected as bigger changes than the ask warranted.

## Design

Free up page 1 vertical space by laying out two existing sections in two columns each, then remove the forced page break so content flows naturally:

1. **Career Timeline** (`section_experience_short.tex`) — split the 7 timeline entries into two columns: 4 most-recent entries on the left, 3 older entries on the right. Column order preserves reverse-chronological reading order (left top-to-bottom, then right top-to-bottom), so ATS text extraction (which reads left column fully, then right column) still encounters entries in the correct sequence.

2. **Skills** (`section_competences.tex`) — split the 8 skill categories into two columns of 4. Category order isn't semantically sequential, so column-major reading order poses no ATS risk.

3. **Class support** (`yaac-another-awesome-cv.cls`):
   - New `keywordshalf` and `experienceshalf` tabular environments, using `p{0.30\linewidth}` / `p{0.66\linewidth}` (etc.) column widths instead of the original environments' fixed-cm widths, so they scale correctly inside a half-width minipage.
   - Both declared as `tabular[t]` (not the default bare `tabular`). A plain `tabular`'s reference point is its own vertical center; nested in a `minipage[t]`, that made a short column (e.g. 3 entries) render visibly lower than a tall column (e.g. 4 entries) sharing the same row. `[t]` anchors the tabular's reference to its first row's baseline instead, so both columns of a section start flush at the top regardless of row-count difference.
   - Existing `\twocolumnsection{left}{right}` macro (already used by the Languages/Strength section) changed from `\newcommand*` to `\long\def`, because the new column content contains blank lines between entries (for source readability) — blank lines produce `\par` tokens, which a non-`\long` macro's argument scanner rejects with "Paragraph ended before ... was complete".

4. **`cv.tex`** — removed the `\newpage` that forced Experience onto page 2.

## Result

Page 1 now ends with the Experience section heading and the first entry's header line (title, company, location, dates, link) — e.g. "Xsolla - Montreal, Quebec, Canada - (Remote) ... xsolla.com". The entry's description paragraph and bullets begin page 2, since the whole entry body is one atomic table row that doesn't fit in the remaining space. Total page count is unchanged (4 pages); pages 2-4 are otherwise identical, just shifted to start one entry-header earlier.

This was explicitly chosen over the alternative of restructuring `\project` for per-bullet page-splitting or trimming Xsolla's bullet list — both were deferred as out of scope for this change.

## Scope

- `src/yaac-another-awesome-cv.cls` — new `keywordshalf`/`experienceshalf` environments; `\twocolumnsection` changed to `\long\def`.
- `src/section_experience_short.tex` — Career Timeline rewritten into two `experienceshalf` columns via `\twocolumnsection`.
- `src/section_competences.tex` — Skills rewritten into two `keywordshalf` columns via `\twocolumnsection`.
- `cv.tex` — removed forced `\newpage` before the Experience/Projects section.
- No changes to `section_projets.tex`, `section_scolarite.tex`, `section_langues.tex`, or the build pipeline.
