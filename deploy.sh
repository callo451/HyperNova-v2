#!/bin/bash

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
  echo "Error: doctl is not installed. Please install the DigitalOcean CLI first."
  echo "Visit: https://docs.digitalocean.com/reference/doctl/how-to/install/"
  exit 1
fi

# Check if user is authenticated
if ! doctl account get &> /dev/null; then
  echo "Error: You are not authenticated with DigitalOcean."
  echo "Please run 'doctl auth init' and try again."
  exit 1
fi

# Build the project
echo "Building the project..."
npm run build

# Deploy using app-spec.yaml
echo "Deploying to DigitalOcean App Platform..."
doctl apps create --spec app-spec.yaml

echo "Deployment initiated. Check your DigitalOcean dashboard for status."
echo "Visit: https://cloud.digitalocean.com/apps" 