# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Sync note:** This file is kept in sync with [AGENTS.md](AGENTS.md) (guidance for other AI agents). If you add, remove, or change anything here, make the same change in AGENTS.md, and vice versa.

## Commands

This is an npm-workspaces monorepo. Run `npm install` once at the repo root.

```bash
# CV (packages/cv)
npm run cv          # Start CV dev server with dashboard at http://localhost:3000 (watches .tex files, auto-opens browser)
npm run cv:build    # One-shot LuaLaTeX compilation → packages/cv/cv.pdf
npm run cv:watch    # Watch packages/cv/src/*.{tex,cls,sty} and rebuild on change
npm run cv:clean    # Remove LaTeX auxiliary files (*.aux, *.log, *.out, etc.)

# Portfolio website (packages/portfolio)
npm run web         # Astro dev server at http://localhost:4321
npm run web:build   # Static build → packages/portfolio/dist
npm run web:preview # Serve the static build

npm run build       # cv:build, then web:build (the site ships the fresh PDF)
```

Package-level scripts still work inside each package (e.g. `cd packages/cv && npm start`, `PORT=3001 npm start`).

**Prerequisite:** LuaTeX must be installed (`lualatex --version`). Install via `brew install --cask mactex`. Astro needs Node ≥ 22.12.

## Architecture

```
packages/
  cv/          @mayank/cv         LaTeX CV + Node.js build pipeline (source of truth for all CV content)
  portfolio/   @mayank/portfolio  Astro portfolio site that reads its content from packages/cv/src/*.tex
```

### CV package (packages/cv)

A Node.js wrapper around a LuaLaTeX CV build pipeline. Paths below are relative to `packages/cv/`; its scripts run with that directory as cwd. There are two main Node.js components:

- **[build.js](packages/cv/build.js)** — `CVBuilder` class. Runs `lualatex` as a subprocess with `TEXINPUTS=./src/:./src/fonts/:` so the compiler finds class files and fonts. Manages a build queue (serializes concurrent builds), watches `src/*.{tex,cls,sty}` via chokidar, and cleans aux files.

- **[server.js](packages/cv/server.js)** — `CVServer` class. Express server + WebSocket (ws) server. Wraps `CVBuilder` and exposes REST API endpoints. Broadcasts `build_complete` and `file_changed` events to all connected WebSocket clients so the dashboard updates in real time.

The compiled output `cv.pdf` is written to the **package root** `packages/cv/cv.pdf` (not `src/`), because `lualatex` is invoked with `-output-directory=.`.

#### LaTeX source structure

- [src/cv.tex](packages/cv/src/cv.tex) — Main document; `\input`s the section files.
- [src/yaac-another-awesome-cv.cls](packages/cv/src/yaac-another-awesome-cv.cls) — Custom LaTeX class defining all layout macros (`\experience`, `\consultantexperience`, `\emptySeparator`, `\makecvheader`, `\socialinfo`, etc.).
- `src/section_*.tex` — One file per CV section (experience, education, skills, etc.).
- [src/fonts/](packages/cv/src/fonts/) — Source Sans Pro OTF files loaded by the class via fontspec.

#### API endpoints (server.js)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/build` | Trigger compilation |
| POST | `/api/clean` | Delete aux files |
| GET | `/api/status` | Build state + PDF metadata |
| GET | `/cv.pdf` | Serve compiled PDF |
| GET/POST | `/api/file/:filename` | Read/write `.tex`/`.cls`/`.sty` files (resolved under `src/`) |

#### LaTeX class macros (for editing CV content)

```latex
\name{First}{Last}
\tagline{Job Title}
\photo{2.5cm}{darwiin}          % darwiin.png in packages/cv
\socialinfo{ \linkedin{...} \github{...} \email{...} }
\makecvheader

\begin{experiences}
  \experience{EndDate}{Title}{Company}{Country}{StartDate}{description}{tech stack}
  \emptySeparator
  \consultantexperience{...}    % adds client field
\end{experiences}
```

### Portfolio package (packages/portfolio)

Static [Astro](https://astro.build) site, no UI framework. Interactivity is vanilla TypeScript plus GSAP (ScrollTrigger) and Lenis smooth scrolling.

- **Content comes from the CV, not from hand-written copy.** [src/lib/latex.ts](packages/portfolio/src/lib/latex.ts) is a small brace-aware reader for the CV's macros; [src/lib/cv.ts](packages/portfolio/src/lib/cv.ts) `loadCV()` turns `cv.tex`, `section_summary`, `section_career_timeline`, `section_experience`, `section_skills`, `section_education` and `section_strengths` into typed data at build time. Commented-out (`%`) LaTeX is ignored. Career-timeline entries (month dates, titles) are merged with experience entries (location, highlights, stack) by company name. If you add or rename a CV macro, update the parser and run `npm run web:build` to confirm the site still builds.
- [scripts/sync-cv-pdf.mjs](packages/portfolio/scripts/sync-cv-pdf.mjs) copies `packages/cv/cv.pdf` to `public/mayank-suman-cv.pdf` before `dev`/`build`; the download links are omitted when no PDF exists.
- [src/scripts/](packages/portfolio/src/scripts/): `contour.ts` (WebGL2 topographic hero shader), `hero.ts` (intro timeline + cursor-reactive variable-font name), `route.ts` (sticky career trail synced to scroll), `main.ts` (wires everything: Lenis, nav, theme toggle, expanders, skills readout, copy email).
- Design tokens live in [src/styles/global.css](packages/portfolio/src/styles/global.css) (light + dark via `prefers-color-scheme` and `[data-theme]`). Fonts are self-hosted via `@fontsource-variable` (Bricolage Grotesque, Newsreader).
- All motion must respect `prefers-reduced-motion`; all content must be present in the static HTML (JS only enhances).

## ATS compatibility (always enforce)

This CV must stay parseable by Applicant Tracking Systems. **Any change to `packages/cv/src/section_*.tex`, `packages/cv/src/cv.tex`, or the `.cls` file must preserve or improve ATS-friendliness** — check this before considering CV content work done:

- **Selectable, linear text**: never rely on images, icons-as-text, or tables/multi-column layouts for content an ATS needs to parse (name, titles, dates, employers, skills, bullet text). Photos/icons are decorative only — never encode information in a visual-only element.
- **Standard section headings**: keep recognizable headings (Experience, Education, Skills, etc.) — don't rename them to stylized/creative labels.
- **Reading order**: LaTeX/PDF text-extraction order must match visual order. Avoid layouts (e.g. two-column, floating boxes) that would scramble extraction order — this is why the two-column layout was reverted (see git history around `a232245`).
- **Plain dates and contact info**: dates and email/phone/links must appear as real extractable text, not embedded in images or icon glyphs without adjacent text.
- **Standard fonts/encoding**: keep using fontspec with real Unicode text (no custom glyph substitution that breaks copy-paste/extraction).
- **Verify after changes**: run `npm run cv:build`, then confirm text is selectable/copyable from `packages/cv/cv.pdf` (e.g. `pdftotext packages/cv/cv.pdf - | less`) and that section headings, job titles, dates, and skills all extract cleanly in the right order.
