#!/bin/bash
# convert-pitch-deck.sh — Convert PITCH_DECK.md to PDF
# Requires: npm install -g @marp-team/marp-cli
# Or use: https://marp.app/ (drag & drop)

echo "=== Pitch Deck to PDF Converter ==="
echo ""
echo "Option 1: Marp CLI (recommended)"
echo "  npm install -g @marp-team/marp-cli"
echo "  marp docs/PITCH_DECK.md --pdf --output docs/pitch-deck.pdf"
echo ""
echo "Option 2: Marp Web Editor (no install)"
echo "  1. Open https://marp.app/"
echo "  2. Drag docs/PITCH_DECK.md into the editor"
echo "  3. File → Export → PDF"
echo ""
echo "Option 3: VS Code + Marp Extension"
echo "  1. Install 'Marp for VS Code' extension"
echo "  2. Open docs/PITCH_DECK.md"
echo "  3. Ctrl+Shift+P → 'Marp: Export Slide Deck as PDF'"
echo ""
echo "Option 4: Pandoc (if installed)"
echo "  pandoc docs/PITCH_DECK.md -o docs/pitch-deck.pdf --pdf-engine=weasyprint"
echo ""
echo "=== Required for Grant Submission ==="
echo "✅ docs/PITCH_DECK.md created (15 slides)"
echo "⏳ Convert to PDF → docs/pitch-deck.pdf"
echo "⏳ Upload to grant application form"