#!/usr/bin/env bash
# Build a Chrome Web Store-ready zip of the extension.
# Usage: npm run build  →  produces dist/botlens-<version>.zip
set -euo pipefail

cd "$(dirname "$0")/.."

VERSION=$(node -p "require('./manifest.json').version")
NAME="botlens-${VERSION}"
OUT_DIR="dist"
ZIP_PATH="${OUT_DIR}/${NAME}.zip"

rm -rf "${OUT_DIR}"
mkdir -p "${OUT_DIR}/${NAME}"

# Files shipped to the store. Add new top-level extension files here.
FILES=(
  manifest.json
  popup.html
  popup.js
  content.js
  styles.css
  tokens.css
)

for f in "${FILES[@]}"; do
  cp "$f" "${OUT_DIR}/${NAME}/"
done
cp -R icons "${OUT_DIR}/${NAME}/icons"

# Validate the manifest version matches what we expect
node -e "
  const m = require('./${OUT_DIR}/${NAME}/manifest.json');
  if (m.manifest_version !== 3) { console.error('Not MV3!'); process.exit(1); }
  if (!m.icons || !m.action) { console.error('Missing icons/action'); process.exit(1); }
  console.log('Manifest OK — v' + m.version);
"

(cd "${OUT_DIR}" && zip -rq "${NAME}.zip" "${NAME}")
rm -rf "${OUT_DIR}/${NAME}"

SIZE=$(du -h "${ZIP_PATH}" | cut -f1)
echo "✓ Built ${ZIP_PATH} (${SIZE})"
