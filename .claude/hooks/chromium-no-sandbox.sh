#!/bin/bash
# Chromium de la nube corre como root, y así solo arranca sin sandbox (lo usa taste-skill vía CHROME_PATH).
exec /opt/pw-browsers/chromium --no-sandbox "$@"
