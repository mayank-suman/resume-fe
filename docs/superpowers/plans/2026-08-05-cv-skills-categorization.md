# CV Skills Recategorization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 12-category skills list in `src/section_competences.tex` with the 8-category, frontend-first grouping approved in `docs/superpowers/specs/2026-08-05-cv-skills-categorization-design.md`.

**Architecture:** Single LaTeX content file edit — no build pipeline or class changes. Verify by running the project's build command to confirm the `.tex` still compiles.

**Tech Stack:** LuaLaTeX (via `npm run build`), `yaac-another-awesome-cv` class, `\keywordsentry` macro.

## Global Constraints

- Only `src/section_competences.tex` is modified.
- Final category order (top to bottom): Languages, Frontend, Testing, Tooling & CI/CD, Backend, Cloud & Version Control, AI Tools, Other.
- Commented-out legacy entries (`Programmation`, `Future Interest (Leaning)`) are removed, not just left commented.
- Every skill token currently present in the file must appear in exactly one new category (no skill dropped, none duplicated) — see mapping in Task 1.

---

### Task 1: Rewrite the skills section

**Files:**
- Modify: `src/section_competences.tex:12-29` (the `\begin{keywords}...\end{keywords}` block)

**Interfaces:**
- Consumes: `\keywordsentry{Category}{Skills}` macro defined in `src/yaac-another-awesome-cv.cls` (unchanged, just re-invoked with new arguments).
- Produces: n/a (leaf content file, nothing downstream depends on category names).

**Full mapping from old → new (every existing skill accounted for):**

| Old category | Skills | New category |
|---|---|---|
| Frontend | HTML5, CSS3, SASS, Flexbox | split: HTML5/CSS3/SASS → Languages; Flexbox → Frontend |
| Functional Programming | TypeScript, ES6+ (ECMAScript), vanilla Javascript | Languages |
| Libraries | ReactJs, NextJs, Redux, Redux Toolkit (RTK Query), GraphQL | Frontend |
| Testing | Jest, React Testing Library, Playwright, Cypress, Enzyme, Storybook | Testing (unchanged) |
| Backend | NodeJS, MySQL, PostgreSQL, MongoDB, Golang | Backend (unchanged) |
| CI/CD | Jenkins, Gitlab | Tooling & CI/CD |
| Building Tools | Webpack, Vite, Turborepo, Esbuild, ParcelJS, Gulp | Tooling & CI/CD |
| Version Control System | GitHub, Gitlab, Bitbucket | Cloud & Version Control |
| Cloud | AWS, Lambda, ES2, S3, Salesforce, Google Cloud Platform (GCP) | Cloud & Version Control |
| CMS | Magento, WordPress | Other |
| Environments | Linux, MacOS, Windows, Bash, Zsh | Other |
| AI Tools | Claude Code, Github Copilot, Cursor, Gemini, OpenAI Codex | AI Tools (unchanged) |
| (commented) Programmation | — | dropped |
| (commented) Future Interest (Leaning) | React Native | dropped |

- [ ] **Step 1: Replace the keywords block**

Replace lines 12-29 of `src/section_competences.tex` with:

```latex
%Section compétences
\sectionTitle{Skills}{\faTasks}
\begin{keywords}
        \keywordsentry{Languages}{TypeScript, JavaScript (ES6+), HTML5, CSS3, SASS}
        \keywordsentry{Frontend}{ReactJs, NextJs, Redux (RTK Query), GraphQL, Flexbox}
        \keywordsentry{Testing}{Jest, React Testing Library, Playwright, Cypress, Enzyme, Storybook}
        \keywordsentry{Tooling \& CI/CD}{Webpack, Vite, Turborepo, Esbuild, ParcelJS, Gulp, Jenkins, Gitlab CI}
        \keywordsentry{Backend}{NodeJS, MySQL, PostgreSQL, MongoDB, Golang}
        \keywordsentry{Cloud \& Version Control}{AWS (Lambda, EC2, S3), Google Cloud Platform (GCP), Salesforce, GitHub, Gitlab, Bitbucket}
        \keywordsentry{AI Tools}{Claude Code, Github Copilot, Cursor, Gemini, OpenAI Codex}
        \keywordsentry{Other}{Magento, WordPress, Linux, MacOS, Windows, Bash, Zsh}
\end{keywords}
```

Note: `&` in the category names is escaped as `\&` for LaTeX.

- [ ] **Step 2: Build the CV to verify it compiles**

Run: `npm run build`
Expected: Exits 0, `cv.pdf` regenerated at project root with no LaTeX errors (check for `! ` error lines in the LuaLaTeX log output).

- [ ] **Step 3: Visually spot-check the PDF**

Open `cv.pdf` (e.g. `open cv.pdf` on macOS) and confirm the Skills section shows 8 categories in the specified order, each rendering without overflow or truncation.

- [ ] **Step 4: Commit**

```bash
git add src/section_competences.tex cv.pdf
git commit -m "$(cat <<'EOF'
Recategorize CV skills section into frontend-first groupings

Replaces the 12 mixed domain/function categories with 8 consistently-
scoped ones, per docs/superpowers/specs/2026-08-05-cv-skills-categorization-design.md.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
