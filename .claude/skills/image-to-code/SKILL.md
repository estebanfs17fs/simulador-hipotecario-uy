---
name: image-to-code
description: Rebuild a design from a screenshot, mockup or photo of a UI the user likes, as real HTML/CSS in this project's stack, then compare the render side by side with the reference until they match. Use when the user shares an image of a design and wants it recreated, or says "make it look like this".
argument-hint: <path-to-image> [target page or section]
---

# Image to Code

Turn a reference image into working UI. Match the design language (layout, type, colour, spacing,
depth, components) faithfully; never lift the reference's logos, photographs or copyrighted copy.

Adapted for Claude Code from the image-to-code skills in
[Leonxlnx/imagegen-skills](https://github.com/Leonxlnx/imagegen-skills) and
[plugin87/ux-ui-agent-skills](https://github.com/plugin87/ux-ui-agent-skills) (both MIT). Those
versions generate the image first or depend on a full kit; this one starts from the user's image.

## Steps

1. **Get the image.** Read it with the Read tool (PNG, JPG, WebP). Screenshots the user uploaded to
   the project usually sit in the project files folder (for example `capturas/`). If it is a live
   site, capture it with `playwright-cli` instead (`open <url>`, `resize 1440 900`, `screenshot`).
2. **Read it like a designer** and write the spec down before coding:
   - Layout: grid, columns, max width, section order, alignment, what sits above the fold.
   - Type: serif/sans/mono feel, sizes of each level in px, weights, line height, letter spacing.
   - Colour: page background, surfaces, text levels, one primary action, accents, borders. Sample
     real values; estimate hex from the pixels rather than inventing them.
   - Spacing: base unit, gaps between sections, card padding, density.
   - Shape and depth: radius, shadows vs. hairline borders.
   - Components: buttons, inputs, cards, tables, nav, each with its states.
3. **Map it onto the project.** The site is static HTML + Bootstrap 5 + vanilla JS
   (`index.html`, `financiamiento.html`, `css/styles.css`, `js/`). Put the values in CSS custom
   properties, reuse Bootstrap components where they fit, keep existing ids, `name`s and JS hooks so
   the calculator keeps working. If the look is close to a known system, read the matching file
   from the `awesome-design` skill to settle open decisions.
4. **Build it**, section by section, at desktop width first, then make it hold up at 375px.
5. **Verify against the reference.** Serve the site (`python3 -m http.server 8000` from the repo
   root), open it with `playwright-cli`, resize to the reference's width and take a screenshot.
   Read both images and list every visible difference (spacing, sizes, colours, alignment,
   missing elements). Fix and repeat until the remaining differences are deliberate. Also capture
   a 375px-wide screenshot.
6. **Check quality.** Run the `web-design-guidelines` audit on the changed files and `npm test`.
   Text contrast must pass WCAG AA even if the reference's does not.

## Report

Show the user the reference and the final screenshot side by side (attach both), list what was
matched, what was deliberately changed (accessibility, brand, content) and anything left open.
