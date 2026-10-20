---
name: web-design-guidelines
description: Audit UI code (HTML, CSS, JS) against Vercel's Web Interface Guidelines and report violations as file:line findings. Use when asked to review the UI, audit the design, check accessibility or UX, or before shipping a visible change to the site.
argument-hint: <file-or-pattern>
---

# Web Interface Guidelines

Audit files against the [Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines)
(MIT, Vercel Labs). This skill only finds problems; fixing them is a separate step the user asks for.

## Steps

1. Get the rules. Fetch the latest version first:
   `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`
   If the fetch fails (no network), use the copy next to this file: `guidelines.md`.
2. Pick the files. Use the argument if given. With no argument, audit the site's pages:
   `index.html`, `financiamiento.html`, `css/*.css` and `js/*.js` (skip `server/` and `tests/`).
3. Read each file and check it against every rule in the guidelines.
4. Report in the guidelines' terse `file:line` format, grouped by file, most serious first.
   Write the findings in Spanish, since this project's UI and team are Spanish-speaking.

## Project notes

- The site is plain HTML + Bootstrap 5 + vanilla JS, so rules written for React or Tailwind apply
  to their HTML/CSS equivalent (`focus-visible:ring-*` means a visible `:focus-visible` style).
- Copy rules about typography (curly quotes, ellipsis `…`) apply to the Spanish copy too.
- Numbers about money should use tabular figures (`font-variant-numeric: tabular-nums`).
- To check the rendered result and not only the code, open the page with the `playwright-cli` skill.
