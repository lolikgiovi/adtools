# QueryGenerationService Tests

This directory contains unit tests for the QueryGenerationService to ensure proper SQL query generation, specifically verifying that merge queries exclude primary keys from update and insert statements.

## Test Files

- `run-tests.js` - Console-based test runner with comprehensive test suite
- `test-runner.html` - Browser-based test runner (alternative)
- `QueryGenerationService.test.js` - Test definitions (used by browser runner)

## Running Tests

### Console (Recommended)
```bash
# Run tests directly
node tests/run-tests.js

# Or run via build script (tests run automatically before build)
./build.sh
```

### Browser
Open `tests/test-runner.html` in a web browser and click "Run All Tests".

## Test Coverage

The test suite covers:

1. **Primary Key Exclusion** (Core Requirement):
   - Merge queries exclude primary keys from INSERT clause
   - Merge queries exclude primary keys from UPDATE clause
   - Multiple primary key handling

2. **Additional Validations**:
   - Basic merge query structure
   - Exclusion of audit fields (created_time, created_by) from UPDATE
   - Config table special handling (parameter_key as PK)
   - Regular INSERT queries include primary keys
   - Default PK behavior for tables without explicit PKs

## Integration with Build Process

Tests are automatically executed before each build via `build.sh`. If any test fails, the build process is aborted to ensure code quality.

## Test Framework

The tests use a custom lightweight test framework with:
- `assert()` - Basic assertions
- `assertContains()` - String containment checks
- `assertNotContains()` - String exclusion checks
- Mocked dependencies for isolated testing