# Mayank Suman: CV and portfolio

npm-workspaces monorepo with one source of truth for career content: the LaTeX CV.

| Package | What it is |
| --- | --- |
| [`packages/cv`](packages/cv) | LaTeX CV (LuaLaTeX) with a Node.js build server and live dashboard. Produces `packages/cv/cv.pdf`. |
| [`packages/portfolio`](packages/portfolio) | Portfolio website ([mayanksuman.dev](https://mayanksuman.dev)) built with Astro, GSAP and a WebGL hero. Reads its content from the CV's `.tex` files at build time and ships the compiled PDF as a download. |

## Getting started

```bash
npm install          # once, at the repo root
npm run cv           # CV dashboard at http://localhost:3000
npm run web          # portfolio dev server at http://localhost:4321
npm run build        # build the CV PDF, then the static site (packages/portfolio/dist)
```

Requires Node ≥ 22.12 and LuaTeX (`brew install --cask mactex`) for the CV.

## Editing content

Edit the CV in `packages/cv/src/section_*.tex`. The portfolio picks up the change on its next build, so the PDF and the website never drift apart. See [CLAUDE.md](CLAUDE.md) for architecture notes and the ATS rules the CV follows.
