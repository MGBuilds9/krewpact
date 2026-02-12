#!/usr/bin/env bash
set -euo pipefail

# Custom Ralph Loop — Claude Code mode with quality gates
# Based on snarktank/ralph, customized for MGBuilds9 workflow

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MAX_ITERATIONS="${1:-15}"
ITERATION=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}=== Ralph Loop (Custom) ===${NC}"
echo -e "Tool: Claude Code"
echo -e "Max iterations: ${MAX_ITERATIONS}"
echo -e "PRD: ${SCRIPT_DIR}/prd.json"
echo ""

# Verify prerequisites
if ! command -v claude &>/dev/null; then
  echo -e "${RED}Error: claude CLI not found. Install: npm i -g @anthropic-ai/claude-code${NC}"
  exit 1
fi

if ! command -v jq &>/dev/null; then
  echo -e "${RED}Error: jq not found. Install: brew install jq (macOS) or apt install jq (Linux)${NC}"
  exit 1
fi

if [[ ! -f "${SCRIPT_DIR}/prd.json" ]]; then
  echo -e "${RED}Error: prd.json not found in ${SCRIPT_DIR}${NC}"
  echo "Run /ralph-plan to generate one, or copy from templates/prd.json.example"
  exit 1
fi

# Archive previous run if branch changed
BRANCH_NAME=$(jq -r '.branchName' "${SCRIPT_DIR}/prd.json")
if [[ -f "${SCRIPT_DIR}/.last-branch" ]]; then
  LAST_BRANCH=$(cat "${SCRIPT_DIR}/.last-branch")
  if [[ "$LAST_BRANCH" != "$BRANCH_NAME" ]]; then
    ARCHIVE_DIR="${SCRIPT_DIR}/archive/$(date +%Y-%m-%d)-${LAST_BRANCH//\//-}"
    mkdir -p "$ARCHIVE_DIR"
    cp "${SCRIPT_DIR}/prd.json" "$ARCHIVE_DIR/" 2>/dev/null || true
    cp "${SCRIPT_DIR}/progress.txt" "$ARCHIVE_DIR/" 2>/dev/null || true
    echo -e "${YELLOW}Archived previous run to ${ARCHIVE_DIR}${NC}"
  fi
fi
echo "$BRANCH_NAME" > "${SCRIPT_DIR}/.last-branch"

# Initialize progress.txt if missing
if [[ ! -f "${SCRIPT_DIR}/progress.txt" ]]; then
  cat > "${SCRIPT_DIR}/progress.txt" << 'PROGRESS'
# Ralph Progress Log
Started: $(date -u +%Y-%m-%dT%H:%M:%SZ)

## Codebase Patterns
(No patterns discovered yet)

---
PROGRESS
  echo -e "${YELLOW}Initialized progress.txt${NC}"
fi

# Main loop
while [[ $ITERATION -lt $MAX_ITERATIONS ]]; do
  ITERATION=$((ITERATION + 1))

  # Check if all stories pass
  REMAINING=$(jq '[.userStories[] | select(.passes == false)] | length' "${SCRIPT_DIR}/prd.json")
  if [[ "$REMAINING" -eq 0 ]]; then
    echo -e "${GREEN}=== ALL STORIES COMPLETE ===${NC}"
    echo -e "Finished in ${ITERATION} iterations."
    exit 0
  fi

  CURRENT_STORY=$(jq -r '[.userStories[] | select(.passes == false)] | sort_by(.priority) | .[0].id + " - " + .[0].title' "${SCRIPT_DIR}/prd.json")

  echo ""
  echo -e "${CYAN}=== Iteration ${ITERATION}/${MAX_ITERATIONS} ===${NC}"
  echo -e "Stories remaining: ${REMAINING}"
  echo -e "Current story: ${CURRENT_STORY}"
  echo -e "$(date '+%Y-%m-%d %H:%M:%S')"
  echo ""

  # Run Claude Code with the custom prompt
  RESULT=$(claude --dangerously-skip-permissions --print < "${SCRIPT_DIR}/CLAUDE.md" 2>&1) || true

  echo "$RESULT"

  # Check for completion signal
  if echo "$RESULT" | grep -q '<promise>COMPLETE</promise>'; then
    echo -e "${GREEN}=== RALPH COMPLETE ===${NC}"
    echo -e "All stories implemented and verified."
    echo -e "Total iterations: ${ITERATION}"
    exit 0
  fi

  # Brief pause between iterations
  sleep 2
done

echo -e "${RED}=== MAX ITERATIONS REACHED ===${NC}"
echo -e "Completed ${ITERATION} iterations without finishing all stories."
REMAINING=$(jq '[.userStories[] | select(.passes == false)] | length' "${SCRIPT_DIR}/prd.json")
echo -e "Stories remaining: ${REMAINING}"
echo -e "Review progress.txt and prd.json for status."
exit 1
