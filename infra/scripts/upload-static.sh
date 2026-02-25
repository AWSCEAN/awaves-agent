#!/usr/bin/env bash
# upload-static.sh — Upload Next.js static assets to S3 and invalidate CloudFront.
#
# Use this for manual deploys outside of CI/CD, or when you only changed
# static assets and don't need to rebuild the Docker image.
#
# Prerequisites:
#   - AWS CLI configured with credentials that have S3 write + CloudFront access
#   - Next.js production build already run: pnpm --filter web build
#
# Usage:
#   ./infra/scripts/upload-static.sh
#   ./infra/scripts/upload-static.sh --skip-invalidation

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
BUCKET="awaves-frontend-dev-107570140649"
DISTRIBUTION_ID="EDCXZ1CBA9XL4"
REGION="us-east-1"
STATIC_DIR="apps/web/.next/static"
PUBLIC_DIR="apps/web/public"
SKIP_INVALIDATION=false

# ── Parse args ────────────────────────────────────────────────────────────────
for arg in "$@"; do
  case $arg in
    --skip-invalidation) SKIP_INVALIDATION=true ;;
    *) echo "Unknown arg: $arg"; exit 1 ;;
  esac
done

# ── Validate build output exists ──────────────────────────────────────────────
if [ ! -d "$STATIC_DIR" ]; then
  echo "Error: $STATIC_DIR not found."
  echo "Run 'pnpm --filter web build' from the repo root first."
  exit 1
fi

# ── Upload _next/static/ ─────────────────────────────────────────────────────
# Files are content-hashed by Next.js — safe to cache for 1 year (immutable).
# --delete removes stale files from previous deploys.
echo "Uploading _next/static/ to s3://$BUCKET/_next/static/ ..."
aws s3 sync "$STATIC_DIR" \
  "s3://$BUCKET/_next/static/" \
  --cache-control "public, max-age=31536000, immutable" \
  --delete \
  --region "$REGION"

# ── Upload public/ ────────────────────────────────────────────────────────────
# Non-hashed files (favicon, manifest, OG images) — shorter cache TTL.
if [ -d "$PUBLIC_DIR" ]; then
  echo "Uploading public/ to s3://$BUCKET/ ..."
  aws s3 sync "$PUBLIC_DIR" \
    "s3://$BUCKET/" \
    --cache-control "public, max-age=86400" \
    --delete \
    --region "$REGION" \
    --exclude "*.DS_Store"
fi

# ── CloudFront invalidation ───────────────────────────────────────────────────
if [ "$SKIP_INVALIDATION" = true ]; then
  echo "Skipping CloudFront invalidation (--skip-invalidation)."
else
  echo "Creating CloudFront invalidation for distribution $DISTRIBUTION_ID ..."
  INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id "$DISTRIBUTION_ID" \
    --paths "/favicon.ico" "/manifest.json" "/_next/static/*" \
    --query 'Invalidation.Id' \
    --output text)
  echo "Invalidation created: $INVALIDATION_ID"
  echo "Track status: aws cloudfront get-invalidation --distribution-id $DISTRIBUTION_ID --id $INVALIDATION_ID"
fi

echo ""
echo "Done. Static assets live at:"
echo "  https://cdn.awaves.net/_next/static/"
echo "  https://cdn.awaves.net/favicon.ico"
