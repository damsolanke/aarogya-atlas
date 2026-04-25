#!/usr/bin/env bash
# Build a clean submission.zip excluding secrets, build artifacts, and large data.
# Usage: ./scripts/build_submission.sh [output-name]
set -euo pipefail

OUT="${1:-submission.zip}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Safety check: never commit .env
if [ -f apps/api/.env ]; then
  echo "✓ apps/api/.env exists locally (will NOT be included in zip)"
fi

# Generate the file list git would track, plus any docs/screenshots
TMPDIR="$(mktemp -d)"
trap "rm -rf $TMPDIR" EXIT
STAGING="$TMPDIR/aarogya-atlas"
mkdir -p "$STAGING"

# Use git ls-files when in a repo, else find with explicit excludes
if [ -d .git ]; then
  echo "Using git ls-files for clean snapshot…"
  git ls-files | tar -czf "$TMPDIR/files.tgz" -T -
  tar -xzf "$TMPDIR/files.tgz" -C "$STAGING"
else
  echo "No .git — falling back to explicit copy…"
  rsync -a \
    --exclude='.env' \
    --exclude='.env.local' \
    --exclude='node_modules' \
    --exclude='.venv' \
    --exclude='__pycache__' \
    --exclude='.next' \
    --exclude='*.pyc' \
    --exclude='data/raw/' \
    --exclude='data/embeddings/' \
    --exclude='dist/' \
    --exclude='.DS_Store' \
    ./ "$STAGING/"
fi

# Always include the docs/screenshots directory even if not yet committed
if [ -d docs/screenshots ]; then
  mkdir -p "$STAGING/docs/screenshots"
  cp -R docs/screenshots/. "$STAGING/docs/screenshots/"
fi

# Sanity: scrub any accidental .env that snuck in
find "$STAGING" -name ".env" -delete
find "$STAGING" -name ".env.local" -delete

cd "$TMPDIR"
zip -qr "$OUT" aarogya-atlas
mv "$OUT" "$ROOT/$OUT"

echo ""
echo "✓ Built $ROOT/$OUT"
ls -lh "$ROOT/$OUT"
echo ""
echo "Top of contents:"
unzip -l "$ROOT/$OUT" | head -30

# Final secret scan
echo ""
echo "Secret scan (should report 0 hits):"
unzip -p "$ROOT/$OUT" 2>/dev/null \
  | grep -E "(sk-ant-api|dapi[0-9a-f]{32}|ANTHROPIC_API_KEY=sk-)" \
  | head -3 || echo "  ✓ no Anthropic / Databricks tokens leaked"
