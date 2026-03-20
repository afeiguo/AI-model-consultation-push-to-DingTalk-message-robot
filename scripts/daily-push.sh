#!/bin/bash
# Daily AI Model Digest Push Script
# Run this script via cron for daily automated pushes at 9:00 AM

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="$SKILL_DIR/output"
CACHE_DIR="$SKILL_DIR/cache"

# Ensure directories exist
mkdir -p "$OUTPUT_DIR" "$CACHE_DIR"

# Fetch models and generate reports
cd "$SKILL_DIR"
node scripts/fetch-models.js 2>&1

# Get today's report files
TODAY=$(date +%Y-%m-%d)
REPORT_FILE="$OUTPUT_DIR/digest-${TODAY}-1.md"

if [ -f "$REPORT_FILE" ]; then
    echo "✅ Reports generated successfully"
    echo "📤 Reports ready for push notification"
    echo ""
    echo "Generated files:"
    ls -la "$OUTPUT_DIR/digest-${TODAY}"*.md 2>/dev/null || echo "No files found"
else
    echo "❌ Failed to generate reports"
    exit 1
fi

# Note: Actual push is handled by OpenClaw cron system
# The message tool will be called by the cron job
