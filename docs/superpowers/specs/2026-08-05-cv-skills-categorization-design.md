# CV Skills Section Recategorization

## Context

`src/section_competences.tex` lists skills under 12 `\keywordsentry` categories (2 commented out). Categories mix domain-based (Frontend, Backend) and function-based (Testing, CI/CD) groupings inconsistently, and include low-signal entries (CMS, Environments) that dilute a frontend-focused CV.

## Goal

Recategorize skills into a smaller set of consistently-scoped, frontend-first categories for a candidate targeting frontend-focused roles.

## Design

Replace the current category list with 8 categories, ordered frontend-first:

1. **Languages** — TypeScript, JavaScript (ES6+), HTML5, CSS3/SASS
2. **Frontend** — ReactJs, NextJs, Redux (RTK Query), GraphQL, Flexbox
3. **Testing** — Jest, React Testing Library, Playwright, Cypress, Enzyme, Storybook
4. **Tooling & CI/CD** — Webpack, Vite, Turborepo, Esbuild, ParcelJS, Gulp, Jenkins, GitLab CI
5. **Backend** — NodeJS, MySQL, PostgreSQL, MongoDB, Golang
6. **Cloud & Version Control** — AWS (Lambda, EC2, S3), GCP, Salesforce, GitHub, GitLab, Bitbucket
7. **AI Tools** — Claude Code, GitHub Copilot, Cursor, Gemini, OpenAI Codex
8. **Other** — Magento, WordPress, Linux, MacOS, Windows, Bash, Zsh

Commented-out entries (`Programmation`, `Future Interest (Leaning)`) are dropped — no longer relevant.

## Scope

Single-file change: `src/section_competences.tex`. No changes to the LaTeX class, build pipeline, or other sections.
