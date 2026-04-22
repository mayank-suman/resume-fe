# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

- **[build.js](build.js)** — `CVBuilder` class. Runs `lualatex` as a subprocess with `TEXINPUTS=./src/:./src/fonts/:` so the compiler finds class files and fonts. Manages a build queue (serializes concurrent builds), watches `src/*.{tex,cls,sty}` via chokidar, and cleans aux files.

- **[server.js](server.js)** — `CVServer` class. Express server + WebSocket (ws) server. Wraps `CVBuilder` and exposes REST API endpoints. Broadcasts `build_complete` and `file_changed` events to all connected WebSocket clients so the dashboard updates in real time.

The compiled output `cv.pdf` is written to the **project root** (not `src/`), because `lualatex` is invoked with `-output-directory=.`.

### LaTeX source structure

- [src/cv.tex](src/cv.tex) — Main document; `\input`s the section files.
- [src/yaac-another-awesome-cv.cls](src/yaac-another-awesome-cv.cls) — Custom LaTeX class defining all layout macros (`\experience`, `\consultantexperience`, `\emptySeparator`, `\makecvheader`, `\socialinfo`, etc.).
- `src/section_*.tex` — One file per CV section (experience, education, skills, etc.).
- [src/fonts/](src/fonts/) — Source Sans Pro OTF files loaded by the class via fontspec.

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
