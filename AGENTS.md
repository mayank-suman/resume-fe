# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Cursor, Aider, Copilot, etc.) working in this repository. See also [CLAUDE.md](CLAUDE.md) (Claude Code-specific, kept in sync with this file).

> **Sync note:** This file is kept in sync with [CLAUDE.md](CLAUDE.md) (Claude Code-specific guidance). If you add, remove, or change anything here, make the same change in CLAUDE.md, and vice versa.

## Commands

```bash
npm start          # Start dev server with dashboard at http://localhost:3000 (watches .tex files, auto-opens browser)
npm run build      # One-shot LuaLaTeX compilation → cv.pdf
npm run watch      # Watch src/*.tex, src/*.cls, src/*.sty and rebuild on change
npm run clean      # Remove LaTeX auxiliary files (*.aux, *.log, *.out, etc.)
npm run dev        # clean + watch
PORT=3001 npm start  # Use a different port
```

**Prerequisite:** LuaTeX must be installed (`lualatex --version`). Install via `brew install --cask mactex`.

## Architecture

This is a Node.js wrapper around a LuaLaTeX CV build pipeline. There are two main Node.js components:

- **build.js** — `CVBuilder` class. Runs `lualatex` as a subprocess with `TEXINPUTS=./src/:./src/fonts/:` so the compiler finds class files and fonts. Manages a build queue (serializes concurrent builds), watches `src/*.{tex,cls,sty}` via chokidar, and cleans aux files.

- **server.js** — `CVServer` class. Express server + WebSocket (ws) server. Wraps `CVBuilder` and exposes REST API endpoints. Broadcasts `build_complete` and `file_changed` events to all connected WebSocket clients so the dashboard updates in real time.

The compiled output `cv.pdf` is written to the **project root** (not `src/`), because `lualatex` is invoked with `-output-directory=.`.

### LaTeX source structure

- `src/cv.tex` — Main document; `\input`s the section files.
- `src/yaac-another-awesome-cv.cls` — Custom LaTeX class defining all layout macros (`\experience`, `\consultantexperience`, `\emptySeparator`, `\makecvheader`, `\socialinfo`, etc.).
- `src/section_*.tex` — One file per CV section (experience, education, skills, etc.).
- `src/fonts/` — Source Sans Pro OTF files loaded by the class via fontspec.

### API endpoints (server.js)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/build` | Trigger compilation |
| POST | `/api/clean` | Delete aux files |
| GET | `/api/status` | Build state + PDF metadata |
| GET | `/cv.pdf` | Serve compiled PDF |
| GET/POST | `/api/file/:filename` | Read/write `.tex`/`.cls`/`.sty` files (resolved under `src/`) |

### LaTeX class macros (for editing CV content)

```latex
\name{First}{Last}
\tagline{Job Title}
\photo{2.5cm}{darwiin}          % darwiin.png in project root
\socialinfo{ \linkedin{...} \github{...} \email{...} }
\makecvheader

\begin{experiences}
  \experience{EndDate}{Title}{Company}{Country}{StartDate}{description}{tech stack}
  \emptySeparator
  \consultantexperience{...}    % adds client field
\end{experiences}
```

## ATS compatibility (always enforce)

This CV must stay parseable by Applicant Tracking Systems. **Any change to `src/section_*.tex`, `src/cv.tex`, or the `.cls` file must preserve or improve ATS-friendliness** — check this before considering CV content work done:

- **Selectable, linear text**: never rely on images, icons-as-text, or tables/multi-column layouts for content an ATS needs to parse (name, titles, dates, employers, skills, bullet text). Photos/icons are decorative only — never encode information in a visual-only element.
- **Standard section headings**: keep recognizable headings (Experience, Education, Skills, etc.) — don't rename them to stylized/creative labels.
- **Reading order**: LaTeX/PDF text-extraction order must match visual order. Avoid layouts (e.g. two-column, floating boxes) that would scramble extraction order — this is why a two-column layout was reverted (see git history around commit `a232245`).
- **Plain dates and contact info**: dates and email/phone/links must appear as real extractable text, not embedded in images or icon glyphs without adjacent text.
- **Standard fonts/encoding**: keep using fontspec with real Unicode text (no custom glyph substitution that breaks copy-paste/extraction).
- **Verify after changes**: run `npm run build`, then confirm text is selectable/copyable from `cv.pdf` (e.g. `pdftotext cv.pdf - | less`) and that section headings, job titles, dates, and skills all extract cleanly in the right order.
