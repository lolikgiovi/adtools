#!/bin/bash

# Run tests before building
echo "🧪 Running static validation tests..."
node tests/run-tests.js

# Check if static tests passed
if [ $? -ne 0 ]; then
    echo "❌ Static validation tests failed! Build aborted."
    exit 1
fi

echo "🧪 Running dynamic execution tests..."
node tests/run-tests-dynamic.js

# Check if dynamic tests passed
if [ $? -ne 0 ]; then
    echo "❌ Dynamic execution tests failed! Build aborted."
    exit 1
fi

echo "✅ Tests passed! Proceeding with build..."

# Build the package
TIMESTAMP=$(date +%Y-%m-%d__%H_%M_%S)
zip -r "${TIMESTAMP}-ADtools.zip" index.html icon.png src/