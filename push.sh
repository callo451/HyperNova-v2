#!/bin/bash

# Make sure we're in the right directory
cd "$(dirname "$0")"

# Configure Git if needed
git config --global user.email "your.email@example.com"
git config --global user.name "Your Name"

# Remove any existing remote
git remote remove origin

# Add the new remote
git remote add origin https://github.com/callo451/HyperNova-v2.git

# Make sure we're on the main branch
git checkout main

# Create a new branch to avoid conflicts
git checkout -b clean-version

# Remove sensitive files from Git tracking
git rm --cached firebase-service-account.json || true
git rm --cached *-service-account*.json || true
git rm --cached *credentials*.json || true
git rm --cached *secret*.json || true

# Add all files
git add .

# Commit changes
git commit -m "Complete rewrite with integrated multiplayer UI (removed sensitive files)"

# Push to the new branch
git push -u origin clean-version

echo "Done! Your code has been pushed to the 'clean-version' branch of HyperNova-v2." 