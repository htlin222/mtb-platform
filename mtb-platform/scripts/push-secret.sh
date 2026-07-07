#!/usr/bin/env bash
# Push ANTHROPIC_API_KEY from a local .dev.vars / .env to the Cloudflare Pages
# project secret. The key is read from disk and piped to wrangler — never echoed,
# never committed. Run: bash scripts/push-secret.sh   (or: pnpm secret)
set -euo pipefail
cd "$(dirname "$0")/.."

KEY=$(grep -hE '^ANTHROPIC_API_KEY=' .dev.vars .env 2>/dev/null | head -1 | cut -d= -f2-)
if [ -z "${KEY:-}" ]; then
  echo "No ANTHROPIC_API_KEY found in .dev.vars or .env."
  echo "Add it (copy .dev.vars.example → .dev.vars, paste your key) and re-run."
  exit 1
fi

printf '%s' "$KEY" | wrangler pages secret put ANTHROPIC_API_KEY --project-name mtb-platform
echo "✓ Secret pushed. Redeploy (pnpm build && wrangler pages deploy dist) if needed."
