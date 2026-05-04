#!/bin/bash

# Anteraja Dashboard Data Update Script
# This script copies new monthly data from ../data/ to public/data/
# and deploys to Vercel

set -e  # Exit on error

echo "🔍 Checking for new data files..."

# Source and destination directories
SOURCE_DIR="../data"
DEST_DIR="public/data"

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo "❌ Error: Source directory $SOURCE_DIR not found"
    exit 1
fi

# Find all CSV files in source that match the pattern
NEW_FILES=$(find "$SOURCE_DIR" -name "aca_order_*.csv" -type f)

if [ -z "$NEW_FILES" ]; then
    echo "❌ No CSV files found in $SOURCE_DIR"
    exit 1
fi

echo "📋 Found data files:"
echo "$NEW_FILES"
echo ""

# Copy each file
COPIED_COUNT=0
for file in $NEW_FILES; do
    filename=$(basename "$file")
    
    # Check if file already exists in destination
    if [ -f "$DEST_DIR/$filename" ]; then
        # Compare file sizes to see if it's different
        SOURCE_SIZE=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
        DEST_SIZE=$(stat -f%z "$DEST_DIR/$filename" 2>/dev/null || stat -c%s "$DEST_DIR/$filename" 2>/dev/null)
        
        if [ "$SOURCE_SIZE" -eq "$DEST_SIZE" ]; then
            echo "⏭️  Skipping $filename (already up to date)"
            continue
        else
            echo "🔄 Updating $filename (size changed: $DEST_SIZE → $SOURCE_SIZE bytes)"
        fi
    else
        echo "✅ Copying new file: $filename"
    fi
    
    cp "$file" "$DEST_DIR/$filename"
    COPIED_COUNT=$((COPIED_COUNT + 1))
done

if [ $COPIED_COUNT -eq 0 ]; then
    echo ""
    echo "✨ All data files are already up to date. No deployment needed."
    exit 0
fi

echo ""
echo "📦 Building dashboard..."
npm run build

echo ""
echo "📤 Committing and deploying to Vercel..."
git add public/data/*.csv build/
git commit -m "data: update monthly data files ($COPIED_COUNT file(s) updated)"
git push origin main

echo ""
echo "✅ Deployment complete! Wait 2-3 minutes for Vercel to rebuild."
echo "🌐 Dashboard: https://amadashboard.vercel.app/"
