#!/bin/bash

# Test runner script for QueryGenerationService
# This script runs the unit tests without building the package

echo "🧪 Running QueryGenerationService Tests..."
echo ""

# Run the static validation test suite
echo "📋 Static Validation Tests:"
node tests/run-tests.js
STATIC_EXIT_CODE=$?

echo ""
# Run the dynamic execution test suite
echo "⚡ Dynamic Execution Tests:"
node tests/run-tests-dynamic.js
DYNAMIC_EXIT_CODE=$?

echo ""
# Check overall results
if [ $STATIC_EXIT_CODE -eq 0 ] && [ $DYNAMIC_EXIT_CODE -eq 0 ]; then
    echo "✅ All tests completed successfully!"
    exit 0
else
    echo "❌ Some tests failed. Please check the output above."
    if [ $STATIC_EXIT_CODE -ne 0 ]; then
        echo "   - Static validation tests failed"
    fi
    if [ $DYNAMIC_EXIT_CODE -ne 0 ]; then
        echo "   - Dynamic execution tests failed"
    fi
    exit 1
fi

exit $TEST_EXIT_CODE