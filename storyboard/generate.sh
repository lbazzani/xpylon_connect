#!/bin/bash
# Regenerate animation.json from content.md using Claude Code CLI
# Usage: ./generate.sh

set -e
cd "$(dirname "$0")"

# Backup current version
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
if [ -f animation.json ]; then
  cp animation.json "history/animation_${TIMESTAMP}.json"
  echo "Backed up animation.json → history/animation_${TIMESTAMP}.json"
fi
if [ -f content.md ]; then
  cp content.md "history/content_${TIMESTAMP}.md"
  echo "Backed up content.md → history/content_${TIMESTAMP}.md"
fi

# Generate new animation.json
echo "Generating animation.json from content.md..."
cat content.md | claude -p "$(cat prompt.md)" > animation.json.tmp

# Validate JSON
if python3 -c "import json; json.load(open('animation.json.tmp'))" 2>/dev/null; then
  mv animation.json.tmp animation.json
  echo "✓ animation.json generated successfully"
else
  rm -f animation.json.tmp
  echo "✗ Generated JSON is invalid. Keeping previous version."
  exit 1
fi
