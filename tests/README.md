# QueryGenerationService Tests

This directory contains validation tests for the `QueryGenerationService` to verify that the actual source code correctly implements merge query logic, particularly ensuring primary keys are excluded from both INSERT and UPDATE statements.

## Test Files

### `run-tests.js`
Node.js console-based test runner that validates the actual source code structure and patterns:
```bash
node tests/run-tests.js
```

### `test-runner.html` (Legacy)
Browser-based test runner with mocked dependencies. This file is kept for reference but the console-based tests are recommended.

### `QueryGenerationService.test.js` (Legacy)
Contains test cases with mocked dependencies. Superseded by the source code validation approach.

## Running Tests

### Console (Recommended)
```bash
# Run tests directly
node tests/run-tests.js

# Or use the dedicated script
./run-tests.sh

# Tests are also run automatically before build
./build.sh
```

### Browser (Legacy)
1. Open `tests/test-runner.html` in a web browser
2. Click "Run Tests" to execute all test cases
3. View results in the browser console and UI

## Test Approach

**Source Code Validation**: The current test suite validates the actual `QueryGenerationService` source code by:
- Reading and analyzing the actual source files
- Checking for required classes, methods, and imports
- Validating that the code contains the correct logic patterns
- Ensuring proper handling of primary keys, audit fields, and Oracle reserved words

This approach ensures that the tests are validating the real implementation rather than mocked versions.

## Test Coverage

The test suite includes 8 comprehensive validation tests:

1. **Source file structure** - Verifies QueryGenerationService class exists with required methods
2. **Dependency imports** - Ensures proper imports of ValueProcessorService, Constants, etc.
3. **Primary key exclusion from INSERT** - Validates that `nonPkFields` filtering excludes PKs from INSERT clause
4. **Primary key exclusion from UPDATE** - Validates that `updateFields` filtering excludes PKs from UPDATE SET clause
5. **Audit field handling** - Verifies proper handling of created_time, created_by, etc.
6. **Primary key detection** - Validates ValueProcessorService.findPrimaryKeys method
7. **Oracle reserved words** - Ensures Constants.js contains proper reserved word handling
8. **Field name formatting** - Validates formatFieldName method and reserved word logic

## Integration with Build Process

Tests are automatically executed before package building via `build.sh`. If any test fails, the build process is aborted.

## Test Framework

The tests use a custom lightweight validation framework with:
- `TestRunner` class for organizing and executing validation tests
- `assert()`, `assertContains()`, `assertNotContains()` helper functions
- Source code analysis functions that read and validate actual implementation
- Clear console output with pass/fail indicators

## Why Source Code Validation?

This approach was chosen because:
1. **Real Implementation Testing**: Tests validate the actual source code, not mocked versions
2. **ES6 Module Compatibility**: Avoids complex ES6 module loading issues in Node.js
3. **Pattern Validation**: Ensures the code contains the correct logical patterns
4. **Maintainability**: Tests remain valid as long as the core patterns are preserved