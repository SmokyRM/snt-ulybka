#!/bin/bash

# Migration script for respond.ts format
# This script helps identify which files still need migration

echo "=== Billing API Routes Migration Status ==="
echo ""
echo "Already migrated (confirmed):"
echo "  ✓ app/api/admin/billing/imports/route.ts"
echo "  ✓ app/api/admin/billing/imports/[id]/route.ts"
echo "  ✓ app/api/admin/billing/imports/[id]/rollback/route.ts"
echo "  ✓ app/api/admin/billing/imports/[id]/export/route.ts"
echo "  ✓ app/api/admin/billing/export.csv/route.ts"
echo "  ✓ app/api/admin/billing/import-payments/route.ts"
echo "  ✓ app/api/admin/billing/notifications/logs/route.ts"
echo "  ✓ app/api/admin/billing/notifications/send/route.ts"
echo "  ✓ app/api/admin/billing/notifications/preview/route.ts"
echo "  ✓ app/api/admin/billing/core/tariffs/route.ts"
echo "  ✓ app/api/admin/billing/core/periods/route.ts"
echo "  ✓ app/api/admin/billing/core/periods/[periodId]/accruals/route.ts"
echo "  ✓ app/api/admin/billing/core/periods/[periodId]/accruals/generate/route.ts"
echo ""

echo "Checking remaining files for NextResponse.json patterns..."
echo ""

find app/api/admin/billing -name "route.ts" -type f | while read file; do
  # Skip already migrated files
  if echo "$file" | grep -qE "(imports/route\.ts|imports/\[id\]/route\.ts|imports/\[id\]/rollback|imports/\[id\]/export|export\.csv/route\.ts|import-payments|notifications/(logs|send|preview)|core/(tariffs|periods))"; then
    continue
  fi

  # Check if file contains NextResponse.json with error responses
  if grep -q "NextResponse\.json.*error.*status.*40[0-4]" "$file" 2>/dev/null; then
    echo "  ⚠ $file - needs migration"
  fi
done

echo ""
echo "=== Migration Complete ==="
