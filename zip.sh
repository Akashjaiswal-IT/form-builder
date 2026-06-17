#!/bin/bash

# Create a timestamped archive excluding dependencies, caches, and build output.
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_FILE="trpc-monorepo_${TIMESTAMP}.tar.gz"

tar --exclude='*/node_modules' \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='.turbo' \
    --exclude='*/.turbo' \
    --exclude='.next' \
    --exclude='*/.next' \
    --exclude='dist' \
    --exclude='*/dist' \
    --exclude='build' \
    --exclude='*/build' \
    --exclude='coverage' \
    --exclude='*/coverage' \
    --exclude='.DS_Store' \
    --exclude='*.tar.gz' \
    -czf "$OUTPUT_FILE" .

echo "✓ Archive created: $OUTPUT_FILE"
