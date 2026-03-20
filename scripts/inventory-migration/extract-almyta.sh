#!/usr/bin/env bash
# Extract CSVs from Almyta Access databases using mdb-export.
# Requires: mdbtools (brew install mdbtools)
#
# Usage: ./scripts/inventory-migration/extract-almyta.sh
set -euo pipefail

ALMYTA_BASE="/Users/mkgbuilds/Library/CloudStorage/OneDrive-MDMContracting/MG Work/03_IT_Technology/Almyta-Postgres/AlmytaSystems"
OUTPUT_DIR="$(cd "$(dirname "$0")" && pwd)/exports"

mkdir -p "$OUTPUT_DIR"

# Each company subfolder contains acsd312.data (the actual Access data file)
COMPANIES=("#MDM Telecom Inc.#" "#MDM Wood Industries#" "#MDM Contracting Inc.#")

# Tables we need for migration — ordered by migration dependency
TABLES=(
  UOM              # Unit of measure reference
  Categories       # Item categories
  Parts            # Items master
  PartsActive      # Serial-tracked items currently active
  Vendor           # Supplier info
  VendorCatalog    # Supplier-item mappings
  BOM              # Bill of materials
  BOMreports       # BOM reporting hierarchy
)

total_exported=0

for company in "${COMPANIES[@]}"; do
  DATA_FILE="$ALMYTA_BASE/$company/acsd312.data"
  if [ ! -f "$DATA_FILE" ]; then
    echo "WARN: $DATA_FILE not found, skipping"
    continue
  fi

  # Strip # and replace spaces with underscores for safe filenames
  SAFE_NAME=$(echo "$company" | tr -d '#' | tr ' ' '_')
  echo ""
  echo "=== Extracting: $SAFE_NAME ==="

  for table in "${TABLES[@]}"; do
    OUTFILE="$OUTPUT_DIR/${SAFE_NAME}_${table}.csv"
    echo -n "  $table... "

    if mdb-export "$DATA_FILE" "$table" > "$OUTFILE" 2>/dev/null; then
      # Count rows (subtract header)
      row_count=$(($(wc -l < "$OUTFILE") - 1))
      echo "${row_count} rows"
      total_exported=$((total_exported + row_count))
    else
      echo "WARN: table not found"
      rm -f "$OUTFILE"
    fi
  done
done

echo ""
echo "=== Extraction complete ==="
echo "Total rows exported: $total_exported"
echo "Output directory: $OUTPUT_DIR"
ls -lh "$OUTPUT_DIR"/*.csv 2>/dev/null || echo "No CSV files generated"
