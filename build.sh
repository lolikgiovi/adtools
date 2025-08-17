#!/bin/bash

# Run tests before building
echo "🧪 Running tests..."
node tests/run-tests.js

# Check if tests passed
if [ $? -ne 0 ]; then
    echo "❌ Tests failed! Build aborted."
    exit 1
fi

echo "✅ Tests passed! Proceeding with build..."

# Build the package
TIMESTAMP=$(date +%Y-%m-%d__%H_%M_%S)
zip -r "${TIMESTAMP}-ADtools.zip" index.html icon.png src/