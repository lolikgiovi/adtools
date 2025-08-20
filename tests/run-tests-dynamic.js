#!/usr/bin/env node

// Dynamic execution test runner for QueryGenerationService
// This script actually imports and executes the QueryGenerationService functions

import { QueryGenerationService } from '../src/features/quickQuery/services/QueryGenerationService.js';
import { ValueProcessorService } from '../src/features/quickQuery/services/ValueProcessorService.js';
import { oracleReservedWords } from '../src/features/quickQuery/constants/Constants.js';

// Test framework
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, testFn) {
    this.tests.push({ name, testFn });
  }

  async run() {
    console.log('\n🧪 Running QueryGenerationService Dynamic Execution Tests\n');
    console.log('=' .repeat(70));
    
    for (const { name, testFn } of this.tests) {
      try {
        await testFn();
        console.log(`✅ ${name}`);
        this.passed++;
      } catch (error) {
        console.log(`❌ ${name}`);
        console.log(`   Error: ${error.message}`);
        this.failed++;
      }
    }
    
    console.log('\n' + '=' .repeat(70));
    console.log(`📊 Test Results: ${this.passed} passed, ${this.failed} failed`);
    
    if (this.failed > 0) {
      console.log('\n❌ Some tests failed!');
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed!');
      console.log('\n📝 Note: These tests execute the actual QueryGenerationService functions.');
      console.log('   Real data is passed through the functions to verify runtime behavior.');
      process.exit(0);
    }
  }
}

// Assertion helpers
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertContains(text, substring, message) {
  if (!text.includes(substring)) {
    throw new Error(message || `Expected text to contain "${substring}"`);
  }
}

function assertNotContains(text, substring, message) {
  if (text.includes(substring)) {
    throw new Error(message || `Expected text to NOT contain "${substring}"`);
  }
}

// Test data
const sampleSchema = [
  ['user_id', 'NUMBER(10)', 'PK'],
  ['username', 'VARCHAR2(50)', 'NO'],
  ['email', 'VARCHAR2(100)', 'YES'],
  ['created_time', 'TIMESTAMP', 'NO'],
  ['created_by', 'VARCHAR2(50)', 'NO']
];

const sampleInputData = [
  ['user_id', 'username', 'email', 'created_time', 'created_by'],
  ['1', 'john_doe', 'john@example.com', null, 'SYSTEM'],
  ['2', 'jane_smith', 'jane@example.com', null, 'SYSTEM']
];

const multiPkSchema = [
  ['tenant_id', 'NUMBER(10)', 'PK'],
  ['user_id', 'NUMBER(10)', 'PK'],
  ['username', 'VARCHAR2(50)', 'NO'],
  ['status', 'VARCHAR2(20)', 'YES']
];

const multiPkInputData = [
  ['tenant_id', 'user_id', 'username', 'status'],
  ['1', '100', 'admin', 'ACTIVE'],
  ['2', '200', 'user', 'INACTIVE']
];

const attachments = []; // Empty attachments for testing

// Test data with Oracle reserved words (lowercase and uppercase)
const reservedWordSchema = [
  ['id', 'NUMBER(10)', 'PK'],
  ['sequence', 'NUMBER(10)', 'NO'],    // Oracle reserved word (lowercase - should be quoted)
  ['select', 'VARCHAR2(50)', 'NO'],     // Oracle reserved word (lowercase - should be quoted)
  ['from', 'VARCHAR2(100)', 'YES'],     // Oracle reserved word (lowercase - should be quoted)
  ['where', 'VARCHAR2(200)', 'NO'],     // Oracle reserved word (lowercase - should be quoted)
  ['order', 'VARCHAR2(50)', 'NO'],      // Oracle reserved word (lowercase - should be quoted)
  ['SEQUENCE', 'NUMBER(10)', 'NO'],     // Oracle reserved word (uppercase - should NOT be quoted)
  ['SELECT', 'VARCHAR2(50)', 'NO'],     // Oracle reserved word (uppercase - should NOT be quoted)
  ['FROM', 'VARCHAR2(100)', 'YES'],     // Oracle reserved word (uppercase - should NOT be quoted)
  ['WHERE', 'VARCHAR2(200)', 'NO'],     // Oracle reserved word (uppercase - should NOT be quoted)
  ['ORDER', 'VARCHAR2(50)', 'NO']       // Oracle reserved word (uppercase - should NOT be quoted)
];

const reservedWordInputData = [
  ['id', 'sequence', 'select', 'from', 'where', 'order', 'SEQUENCE', 'SELECT', 'FROM', 'WHERE', 'ORDER'],
  ['1', '100', 'test_select', 'test_from', 'test_where', 'test_order', '200', 'TEST_SELECT', 'TEST_FROM', 'TEST_WHERE', 'TEST_ORDER'],
  ['2', '300', 'another_select', 'another_from', 'another_where', 'another_order', '400', 'ANOTHER_SELECT', 'ANOTHER_FROM', 'ANOTHER_WHERE', 'ANOTHER_ORDER']
];

// Test suite
const runner = new TestRunner();

runner.test('QueryGenerationService can be instantiated', () => {
  const service = new QueryGenerationService();
  assert(service instanceof QueryGenerationService, 'Should create QueryGenerationService instance');
  assert(typeof service.generateMergeStatement === 'function', 'Should have generateMergeStatement method');
});

runner.test('generateQuery with merge includes primary keys in INSERT clause', () => {
  const service = new QueryGenerationService();
  
  // Generate merge statement
  const mergeSQL = service.generateQuery('users', 'merge', sampleSchema, sampleInputData, attachments);
  
  console.log('\n--- Generated MERGE SQL ---');
  console.log(mergeSQL);
  console.log('--- End SQL ---\n');
  
  // Verify primary keys ARE in INSERT clause (all fields should be inserted for new records)
  assertContains(mergeSQL, 'INSERT (', 'Should contain INSERT clause');
  assertContains(mergeSQL, 'user_id', 'Primary key user_id SHOULD be in INSERT fields');
  assertContains(mergeSQL, 'username', 'Non-primary key fields should be in INSERT');
  assertContains(mergeSQL, 'email', 'Non-primary key fields should be in INSERT');
});

runner.test('generateQuery with merge excludes primary keys from UPDATE clause', () => {
  const service = new QueryGenerationService();
  
  const mergeSQL = service.generateQuery('users', 'merge', sampleSchema, sampleInputData, attachments);
  
  // Extract just the UPDATE SET section
  const updateSetMatch = mergeSQL.match(/UPDATE SET([\s\S]*?)WHEN NOT MATCHED/);
  const updateSetSection = updateSetMatch ? updateSetMatch[1] : '';
  
  // Verify primary keys are NOT in UPDATE SET clause
  assertContains(mergeSQL, 'UPDATE SET', 'Should contain UPDATE SET clause');
  assertNotContains(updateSetSection, 'tgt.user_id =', 'Primary key user_id should NOT be in UPDATE SET');
  assertContains(updateSetSection, 'tgt.username =', 'Non-primary key fields should be in UPDATE SET');
});

runner.test('generateQuery with merge excludes audit fields from UPDATE clause', () => {
  const service = new QueryGenerationService();
  
  const mergeSQL = service.generateQuery('users', 'merge', sampleSchema, sampleInputData, attachments);
  
  // Verify audit fields are NOT in UPDATE SET clause
  assertNotContains(mergeSQL, 'tgt.created_time = src.created_time', 'created_time should NOT be in UPDATE SET');
  assertNotContains(mergeSQL, 'tgt.created_by = src.created_by', 'created_by should NOT be in UPDATE SET');
});

runner.test('generateQuery with merge handles multiple primary keys correctly', () => {
  const service = new QueryGenerationService();
  
  const mergeSQL = service.generateQuery('user_tenants', 'merge', multiPkSchema, multiPkInputData, attachments);
  
  console.log('\n--- Multi-PK MERGE SQL ---');
  console.log(mergeSQL);
  console.log('--- End SQL ---');
  
  // Extract just the UPDATE SET section
  const updateSetMatch = mergeSQL.match(/UPDATE SET([\s\S]*?)WHEN NOT MATCHED/);
  const updateSetSection = updateSetMatch ? updateSetMatch[1] : '';
  
  // Should include both primary keys in ON clause
  assertContains(mergeSQL, 'tgt.tenant_id = src.tenant_id', 'Should include tenant_id in ON clause');
  assertContains(mergeSQL, 'tgt.user_id = src.user_id', 'Should include user_id in ON clause');
  
  // Should include primary keys in INSERT clause (all fields needed for new records)
  assertContains(mergeSQL, 'tenant_id', 'tenant_id SHOULD be in INSERT fields');
  assertContains(mergeSQL, 'user_id', 'user_id SHOULD be in INSERT fields');
  
  // Should not include primary keys in UPDATE SET clause
  assertNotContains(updateSetSection, 'tgt.tenant_id =', 'tenant_id should NOT be in UPDATE SET');
  assertNotContains(updateSetSection, 'tgt.user_id =', 'user_id should NOT be in UPDATE SET');
});

runner.test('Primary key detection works correctly', () => {
  const valueProcessor = new ValueProcessorService();
  
  const singlePK = valueProcessor.findPrimaryKeys(sampleSchema, 'users');
  assert(singlePK.length === 1, 'Should find exactly one primary key');
  assert(singlePK[0] === 'user_id', 'Should identify user_id as primary key');
  
  const multiPK = valueProcessor.findPrimaryKeys(multiPkSchema, 'user_tenants');
  assert(multiPK.length === 2, 'Should find exactly two primary keys');
  assert(multiPK.includes('tenant_id'), 'Should identify tenant_id as primary key');
  assert(multiPK.includes('user_id'), 'Should identify user_id as primary key');
});

runner.test('Oracle reserved words are handled correctly', () => {
  const service = new QueryGenerationService();
  
  // Test with a reserved word field
  const reservedWordField = service.formatFieldName('select');
  assertContains(reservedWordField, '"', 'Reserved words should be quoted');
  
  // Test with a normal field
  const normalField = service.formatFieldName('username');
  assertNotContains(normalField, '"', 'Normal fields should not be quoted');
});

runner.test('Oracle reserved words are properly quoted in MERGE statement', () => {
  const service = new QueryGenerationService();
  
  const mergeSQL = service.generateQuery('test_table', 'merge', reservedWordSchema, reservedWordInputData, attachments);
  
  console.log('\n--- MERGE SQL with Reserved Words ---');
  console.log(mergeSQL);
  console.log('--- End SQL ---\n');
  
  // Verify lowercase reserved words are quoted
  assertContains(mergeSQL, '"sequence"', 'lowercase sequence should be quoted as "sequence"');
  assertContains(mergeSQL, '"select"', 'lowercase select should be quoted as "select"');
  assertContains(mergeSQL, '"from"', 'lowercase from should be quoted as "from"');
  assertContains(mergeSQL, '"where"', 'lowercase where should be quoted as "where"');
  assertContains(mergeSQL, '"order"', 'lowercase order should be quoted as "order"');
  
  // Verify uppercase reserved words are NOT quoted (treated as normal field names)
  assertNotContains(mergeSQL, '"SEQUENCE"', 'uppercase SEQUENCE should NOT be quoted');
  assertNotContains(mergeSQL, '"SELECT"', 'uppercase SELECT should NOT be quoted');
  assertNotContains(mergeSQL, '"FROM"', 'uppercase FROM should NOT be quoted');
  assertNotContains(mergeSQL, '"WHERE"', 'uppercase WHERE should NOT be quoted');
  assertNotContains(mergeSQL, '"ORDER"', 'uppercase ORDER should NOT be quoted');
  
  // Verify non-reserved words are not quoted
  assertNotContains(mergeSQL, '"id"', 'Non-reserved word id should not be quoted');
  
  // Verify uppercase reserved words appear as unquoted lowercase field names
  assertContains(mergeSQL, ' sequence', 'uppercase SEQUENCE should appear as unquoted lowercase sequence');
  assertNotContains(mergeSQL, '"SEQUENCE"', 'uppercase SEQUENCE should NOT appear quoted');
});

runner.test('Reserved words are quoted in INSERT clause', () => {
  const service = new QueryGenerationService();
  
  const mergeSQL = service.generateQuery('test_table', 'merge', reservedWordSchema, reservedWordInputData, attachments);
  
  // Check INSERT clause specifically
  const insertMatch = mergeSQL.match(/INSERT \(([^)]+)\)/);
  const insertClause = insertMatch ? insertMatch[1] : '';
  
  // Lowercase reserved words should be quoted
  assertContains(insertClause, '"sequence"', 'lowercase sequence should be quoted in INSERT clause');
  assertContains(insertClause, '"select"', 'lowercase select should be quoted in INSERT clause');
  assertContains(insertClause, '"from"', 'lowercase from should be quoted in INSERT clause');
  
  // Uppercase reserved words should NOT be quoted (they appear as lowercase unquoted)
  assertNotContains(insertClause, '"SEQUENCE"', 'uppercase SEQUENCE should NOT be quoted in INSERT clause');
  assertContains(insertClause, 'sequence', 'uppercase SEQUENCE should appear as unquoted lowercase sequence in INSERT clause');
});

runner.test('Reserved words are quoted in UPDATE SET clause', () => {
  const service = new QueryGenerationService();
  
  const mergeSQL = service.generateQuery('test_table', 'merge', reservedWordSchema, reservedWordInputData, attachments);
  
  // Extract UPDATE SET section
  const updateSetMatch = mergeSQL.match(/UPDATE SET([\s\S]*?)WHEN NOT MATCHED/);
  const updateSetSection = updateSetMatch ? updateSetMatch[1] : '';
  
  // Lowercase reserved words should be quoted
  assertContains(updateSetSection, 'tgt."sequence" = src."sequence"', 'lowercase sequence should be quoted in UPDATE SET');
  assertContains(updateSetSection, 'tgt."select" = src."select"', 'lowercase select should be quoted in UPDATE SET');
  assertContains(updateSetSection, 'tgt."from" = src."from"', 'lowercase from should be quoted in UPDATE SET');
  
  // Uppercase reserved words should NOT be quoted (they appear as lowercase unquoted)
  assertContains(updateSetSection, 'tgt.sequence = src.sequence', 'uppercase SEQUENCE should appear as unquoted lowercase sequence in UPDATE SET');
  assertNotContains(updateSetSection, 'tgt."SEQUENCE"', 'uppercase SEQUENCE should NOT be quoted in UPDATE SET');
});

runner.test('Reserved words are quoted in VALUES clause', () => {
  const service = new QueryGenerationService();
  
  const mergeSQL = service.generateQuery('test_table', 'merge', reservedWordSchema, reservedWordInputData, attachments);
  
  // Check VALUES clause
  const valuesMatch = mergeSQL.match(/VALUES \(([^)]+)\)/);
  const valuesClause = valuesMatch ? valuesMatch[1] : '';
  
  // Lowercase reserved words should be quoted
  assertContains(valuesClause, 'src."sequence"', 'lowercase sequence should be quoted in VALUES clause');
  assertContains(valuesClause, 'src."select"', 'lowercase select should be quoted in VALUES clause');
  assertContains(valuesClause, 'src."from"', 'lowercase from should be quoted in VALUES clause');
  
  // Uppercase reserved words should NOT be quoted (they appear as lowercase unquoted)
  assertContains(valuesClause, 'src.sequence', 'uppercase SEQUENCE should appear as unquoted lowercase sequence in VALUES clause');
  assertNotContains(valuesClause, 'src."SEQUENCE"', 'uppercase SEQUENCE should NOT be quoted in VALUES clause');
});

runner.test('Generated SQL structure is valid', () => {
  const service = new QueryGenerationService();
  
  const mergeSQL = service.generateQuery('users', 'merge', sampleSchema, sampleInputData, attachments);
  
  // Verify SQL structure
  assertContains(mergeSQL, 'MERGE INTO users tgt', 'Should have proper MERGE INTO clause');
  assertContains(mergeSQL, 'USING (SELECT', 'Should have USING clause with SELECT');
  assertContains(mergeSQL, 'FROM DUAL) src', 'Should use DUAL table');
  assertContains(mergeSQL, 'ON (tgt.user_id = src.user_id)', 'Should have proper ON clause');
  assertContains(mergeSQL, 'WHEN MATCHED THEN UPDATE SET', 'Should have WHEN MATCHED clause');
  assertContains(mergeSQL, 'WHEN NOT MATCHED THEN INSERT', 'Should have WHEN NOT MATCHED clause');
  assertContains(mergeSQL, 'VALUES (', 'Should have VALUES clause');
});

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('\n🔍 Testing actual QueryGenerationService execution...');
  console.log('\n📁 Importing and executing:');
  console.log('   - QueryGenerationService.js');
  console.log('   - ValueProcessorService.js');
  console.log('   - Constants.js');
  
  runner.run();
}

export { TestRunner };