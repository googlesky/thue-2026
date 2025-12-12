#!/bin/bash

# Build script for Tax Calculator 2026
# This script builds the Next.js app inside Docker and exports static HTML

set -e

echo "=== Building Tax Calculator 2026 ==="
echo ""

# Clean previous build
rm -rf out

# Build using Docker
echo "Building with Docker..."
docker build -t thue-2026-builder .

# Create output directory
mkdir -p out

# Copy built files from container
echo "Copying built files..."
docker create --name thue-2026-temp thue-2026-builder
docker cp thue-2026-temp:/output/. ./out/
docker rm thue-2026-temp

echo ""
echo "=== Build complete! ==="
echo "Static files are in the 'out' directory"
echo ""
echo "To preview locally:"
echo "  npx serve out"
echo ""
echo "To deploy to GitHub Pages:"
echo "  1. Push the 'out' folder contents to gh-pages branch"
echo "  2. Or use GitHub Actions (see .github/workflows/deploy.yml)"
