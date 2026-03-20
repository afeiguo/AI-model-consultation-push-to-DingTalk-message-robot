#!/bin/bash
# Daily AI Model Digest Push Script for DingTalk
# Run this script via cron for daily automated pushes at 9:00 AM
# Usage: Add to crontab: 0 9 * * * /home/admin/.openclaw/workspace/skills/model-daily-digest/scripts/daily-push-dingtalk.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="$SKILL_DIR/output"
CACHE_DIR="$SKILL_DIR/cache"
LOG_FILE="/tmp/model-digest-push.log"

# DingTalk user ID (郭涛涛)
DINGTALK_USER="063266164336551949"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting daily model digest push..." >> "$LOG_FILE"

# Ensure directories exist
mkdir -p "$OUTPUT_DIR" "$CACHE_DIR"

# Fetch models and generate reports
cd "$SKILL_DIR"
node scripts/fetch-models.js >> "$LOG_FILE" 2>&1

if [ $? -ne 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Failed to generate reports" >> "$LOG_FILE"
    exit 1
fi

# Get today's report files
TODAY=$(date +%Y-%m-%d)
REPORT_FILE="$OUTPUT_DIR/digest-${TODAY}-1.md"

if [ ! -f "$REPORT_FILE" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Report file not found: $REPORT_FILE" >> "$LOG_FILE"
    exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Reports generated successfully" >> "$LOG_FILE"

# Push to DingTalk using OpenClaw message tool
# Note: This requires OpenClaw gateway to be running

# Push Part 1: 热门模型
if [ -f "$OUTPUT_DIR/digest-${TODAY}-1.md" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Pushing Part 1: Hot Models..." >> "$LOG_FILE"
    # Use openclaw CLI to send message
    openclaw message send \
        --channel dingtalk \
        --to "$DINGTALK_USER" \
        --file "$OUTPUT_DIR/digest-${TODAY}-1.md" >> "$LOG_FILE" 2>&1 || \
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: Failed to push Part 1" >> "$LOG_FILE"
fi

# Push Part 2: 增速最快
if [ -f "$OUTPUT_DIR/digest-${TODAY}-2.md" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Pushing Part 2: Fast Growing..." >> "$LOG_FILE"
    sleep 2
    openclaw message send \
        --channel dingtalk \
        --to "$DINGTALK_USER" \
        --file "$OUTPUT_DIR/digest-${TODAY}-2.md" >> "$LOG_FILE" 2>&1 || \
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: Failed to push Part 2" >> "$LOG_FILE"
fi

# Push Part 3: 多模态模型
if [ -f "$OUTPUT_DIR/digest-${TODAY}-3.md" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Pushing Part 3: Multimodal..." >> "$LOG_FILE"
    sleep 2
    openclaw message send \
        --channel dingtalk \
        --to "$DINGTALK_USER" \
        --file "$OUTPUT_DIR/digest-${TODAY}-3.md" >> "$LOG_FILE" 2>&1 || \
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: Failed to push Part 3" >> "$LOG_FILE"
fi

# Push Part 4 & 5: 世界模型和具身智能
if [ -f "$OUTPUT_DIR/digest-${TODAY}-4.md" ] && [ -f "$OUTPUT_DIR/digest-${TODAY}-5.md" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Pushing Part 4 & 5: World Models & Embodied AI..." >> "$LOG_FILE"
    sleep 2
    # Combine parts 4 and 5
    cat "$OUTPUT_DIR/digest-${TODAY}-4.md" "$OUTPUT_DIR/digest-${TODAY}-5.md" > /tmp/combined_part45.md
    openclaw message send \
        --channel dingtalk \
        --to "$DINGTALK_USER" \
        --file /tmp/combined_part45.md >> "$LOG_FILE" 2>&1 || \
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: Failed to push Part 4&5" >> "$LOG_FILE"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Daily push completed" >> "$LOG_FILE"
echo "---" >> "$LOG_FILE"
