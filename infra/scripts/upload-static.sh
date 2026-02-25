#!/usr/bin/env bash
# upload-static.sh — Upload Next.js static assets to S3.
#
# Use this for manual deploys outside of CI/CD, or when you only changed
# static assets and don't need to rebuild the Docker image.
#
# CloudFront invalidation is intentionally omitted:
#   - _next/static/* files are content-hashed by Next.js — each deploy produces
#     new filenames, so there is nothing stale in CloudFront to invalidate.
#   - public/ files (favicon, manifest) have a 24h TTL and rarely change.
#
# Prerequisites:
#   - AWS CLI configured with credentials that have S3 write access
#     to awaves-frontend-dev-107570140649
#   - Next.js production build already run: pnpm --filter web build
#
# Usage:
#   ./infra/scripts/upload-static.sh

set -euo pipefail

BUCKET="awaves-frontend-dev-107570140649"
REGION="us-east-1"
STATIC_DIR="apps/web/.next/static"
PUBLIC_DIR="apps/web/public"

# ── Validate build output exists ──────────────────────────────────────────────
if [ ! -d "$STATIC_DIR" ]; then
  echo "Error: $STATIC_DIR not found."
  echo "Run 'pnpm --filter web build' from the repo root first."
  exit 1
fi

# ── Upload _next/static/ ─────────────────────────────────────────────────────
# Content-hashed files — safe to cache for 1 year (immutable).
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

echo ""
echo "Done. Static assets live at: https://cdn.awaves.net/_next/static/"
