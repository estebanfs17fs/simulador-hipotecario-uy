#!/bin/bash
# Prepara las herramientas de diseño (playwright-cli, taste-skill) al abrir una sesión de Claude Code.
set -euo pipefail

cd "$CLAUDE_PROJECT_DIR"

# En la nube el repo se clona limpio: instalar dependencias (incluye @playwright/cli).
if [ "${CLAUDE_CODE_REMOTE:-}" = "true" ] && [ ! -x node_modules/.bin/playwright-cli ]; then
  npm install --no-audit --no-fund >/dev/null 2>&1 || echo "npm install falló; playwright-cli no está disponible" >&2
fi

[ -n "${CLAUDE_ENV_FILE:-}" ] || exit 0

# Que `playwright-cli` funcione sin npx.
echo "export PATH=\"$CLAUDE_PROJECT_DIR/node_modules/.bin:\$PATH\"" >> "$CLAUDE_ENV_FILE"

# En la nube no hay Chrome, pero sí el Chromium preinstalado de Playwright.
if [ -x /opt/pw-browsers/chromium ]; then
  {
    echo "export PLAYWRIGHT_MCP_BROWSER=chromium"
    echo "export PLAYWRIGHT_MCP_EXECUTABLE_PATH=/opt/pw-browsers/chromium"
    echo "export CHROME_PATH=$CLAUDE_PROJECT_DIR/.claude/hooks/chromium-no-sandbox.sh"
  } >> "$CLAUDE_ENV_FILE"
fi
