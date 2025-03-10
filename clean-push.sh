#!/bin/bash

# Create a clean directory
CLEAN_DIR="../HyperNova-clean"
rm -rf "$CLEAN_DIR"
mkdir -p "$CLEAN_DIR"

# Copy all files except sensitive ones
rsync -av --exclude="firebase-service-account.json" \
          --exclude="*-service-account*.json" \
          --exclude="*credentials*.json" \
          --exclude="*secret*.json" \
          --exclude=".git" \
          --exclude="node_modules" \
          ./ "$CLEAN_DIR/"

# Initialize Git in the clean directory
cd "$CLEAN_DIR"
git init

# Configure Git
git config --global user.email "your.email@example.com"
git config --global user.name "Your Name"

# Add the remote
git remote add origin https://github.com/callo451/HyperNova-v2.git

# Add all files
git add .

# Commit changes
git commit -m "Complete rewrite with integrated multiplayer UI"

# Push to the main branch
git push -u origin main --force

echo "Done! Your code has been pushed to the 'main' branch of HyperNova-v2." 