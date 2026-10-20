# Skills de diseño para Claude Code

Claude Code carga estas skills solo en cualquier sesión abierta en este repo (local o en la nube).
Se invocan por su nombre (`/design-taste-frontend`, `/web-design-guidelines`, …) o Claude las usa
cuando el pedido encaja con su descripción.

| Skill | Para qué | Origen | Licencia |
| --- | --- | --- | --- |
| `design-taste-frontend` | **Taste Skill**: criterio estético, dirección de arte y un inspector en navegador real que marca lo que se ve "hecho por IA" | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) @ `63aba5f` (v2.1.3), copia sin `evals/` | MIT |
| `web-design-guidelines` | **Guías de diseño web**: audita HTML/CSS/JS contra las Web Interface Guidelines de Vercel y lista problemas en formato `archivo:línea` | Reglas de [vercel-labs/web-interface-guidelines](https://github.com/vercel-labs/web-interface-guidelines) @ `434b7f9` (copia offline en `guidelines.md`); SKILL.md propio, basado en el de [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | MIT |
| `awesome-design` | **Awesome Design**: sistemas de diseño reales (tipografía, color, espaciado, componentes) como DESIGN.md; 7 de fintech incluidos, el resto se descarga | [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md) @ `3b60532` | MIT |
| `image-to-code` | **Image to Code**: le pasás una captura y la recrea en el stack del sitio, comparando capturas hasta que coincidan | Propia, adaptada de [Leonxlnx/imagegen-skills](https://github.com/Leonxlnx/imagegen-skills) y [plugin87/ux-ui-agent-skills](https://github.com/plugin87/ux-ui-agent-skills) | MIT |
| `playwright-cli` | **Playwright CLI**: abre el navegador, navega, hace clic, completa formularios y saca capturas | [microsoft/playwright-cli](https://github.com/microsoft/playwright-cli), copiada de `@playwright/cli@0.1.22` | Apache-2.0 |

## Requisitos

- `npm install` instala `@playwright/cli` (devDependency). En la nube lo hace el hook de arranque.
- Taste Skill necesita Node 22+ y Chrome, Edge o Chromium.
- En tu máquina, `playwright-cli` usa Chrome si lo tenés instalado; si no:
  `npx playwright-cli install-browser chromium`.
- En la nube, `.claude/hooks/session-start.sh` apunta ambas herramientas al Chromium preinstalado.

## Actualizar

Las skills están copiadas (no son submódulos) para que funcionen igual en la nube y sin red.
Para actualizar una, volvé a copiar la carpeta desde su repo y anotá el commit nuevo en esta tabla.
Para `playwright-cli`, subí la versión de `@playwright/cli` en `package.json` y copiá
`node_modules/playwright-core/lib/tools/skills/playwright-cli/`.
