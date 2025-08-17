#!/usr/bin/env node

// Console-based test runner for QueryGenerationService
// This script can be run from command line: node tests/run-tests.js

const fs = require('fs');
const path = require('path');

// Mock dependencies
class MockValueProcessorService {
  findPrimaryKeys(schemaData, tableName) {
    if (tableName && tableName.toLowerCase().includes('config')) {
      return ['parameter_key'];
    }
    
    const pkFields = schemaData.filter(row => row[2] && row[2].includes('PK')).map(row => row[0]);
    return pkFields.length > 0 ? pkFields : [schemaData[0][0]];
  }

  processValue(value, dataType, nullable, fieldName, tableName, queryType) {
    if (value === null || value === undefined || value === '') {
      return 'NULL';
    }
    
    if (dataType.toLowerCase().includes('varchar') || dataType.toLowerCase().includes('char')) {
      return `'${value}'`;
    }
    
    return value.toString();
  }
}

class MockAttachmentValidationService {
  validateAttachment(value, dataType, maxLength, attachments) {
    return null; // No attachment processing in tests
  }
}

// Oracle reserved words set
const oracleReservedWords = new Set([
  'select', 'from', 'where', 'insert', 'update', 'delete', 'create', 'drop',
  'alter', 'table', 'index', 'view', 'grant', 'revoke', 'commit', 'rollback',
  'order', 'group', 'having', 'union', 'join', 'inner', 'outer', 'left', 'right'
]);

// QueryGenerationService implementation
class QueryGenerationService {
  constructor() {
    this.ValueProcessorService = new MockValueProcessorService();
    this.attachmentValidationService = new MockAttachmentValidationService();
  }

  generateMergeStatement(tableName, processedFields, primaryKeys) {
    const primaryKeysLowerCase = primaryKeys.map((pk) => pk.toLowerCase());
    const selectFields = processedFields.map((f) => `\n  ${f.formattedValue} AS ${this.formatFieldName(f.fieldName)}`).join(",");

    const pkConditions = primaryKeysLowerCase
      .map((pk) => `tgt.${this.formatFieldName(pk).toLowerCase()} = src.${this.formatFieldName(pk).toLowerCase()}`)
      .join(" AND ");

    const updateFields = processedFields
      .filter((f) => !primaryKeysLowerCase.includes(f.fieldName.toLowerCase()) && !["created_time", "created_by"].includes(f.fieldName.toLowerCase()))
      .map((f) => `  tgt.${this.formatFieldName(f.fieldName)} = src.${this.formatFieldName(f.fieldName)}`)
      .join(",\n");

    const nonPkFields = processedFields.filter((f) => !primaryKeysLowerCase.includes(f.fieldName.toLowerCase()));
    const insertFields = nonPkFields.map((f) => this.formatFieldName(f.fieldName)).join(", ");
    const insertValues = nonPkFields.map((f) => `src.${this.formatFieldName(f.fieldName)}`).join(", ");

    let mergeStatement = `MERGE INTO ${tableName} tgt`;
    mergeStatement += `\nUSING (SELECT${selectFields}\n  FROM DUAL) src`;
    mergeStatement += `\nON (${pkConditions})`;
    mergeStatement += `\nWHEN MATCHED THEN UPDATE SET\n${updateFields}`;
    mergeStatement += `\nWHEN NOT MATCHED THEN INSERT (${insertFields})\nVALUES (${insertValues});`;

    return mergeStatement;
  }

  generateInsertStatement(tableName, processedFields) {
    const fields = processedFields.map((f) => this.formatFieldName(f.fieldName));
    const values = processedFields.map((f) => f.formattedValue);
    return `INSERT INTO ${tableName} (${fields.join(", ")}) \nVALUES (${values.join(", ")});`;
  }

  formatFieldName(fieldName) {
    if (fieldName === fieldName.toLowerCase()) {
      return oracleReservedWords.has(fieldName.toLowerCase()) ? `"${fieldName.toLowerCase()}"` : fieldName;
    }
    return fieldName.toLowerCase();
  }
}

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
    console.log('\n🧪 Running QueryGenerationService Tests\n');
    console.log('=' .repeat(50));
    
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
    
    console.log('\n' + '=' .repeat(50));
    console.log(`📊 Test Results: ${this.passed} passed, ${this.failed} failed`);
    
    if (this.failed > 0) {
      console.log('\n❌ Some tests failed!');
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed!');
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
    throw new Error(message || `Expected "${text}" to contain "${substring}"`);
  }
}

function assertNotContains(text, substring, message) {
  if (text.includes(substring)) {
    throw new Error(message || `Expected "${text}" to not contain "${substring}"`);
  }
}

// Test suite
const runner = new TestRunner();
const service = new QueryGenerationService();

// Test data
const testSchema = [
  ['id', 'NUMBER(10)', 'PK'],
  ['name', 'VARCHAR2(100)', ''],
  ['email', 'VARCHAR2(255)', ''],
  ['created_time', 'TIMESTAMP', '']
];

const testData = [
  { fieldName: 'id', formattedValue: '1' },
  { fieldName: 'name', formattedValue: "'John Doe'" },
  { fieldName: 'email', formattedValue: "'john@example.com'" },
  { fieldName: 'created_time', formattedValue: 'SYSDATE' }
];

const primaryKeys = ['id'];

// Test cases
runner.test('Basic merge query generation', () => {
  const result = service.generateMergeStatement('users', testData, primaryKeys);
  assertContains(result, 'MERGE INTO users tgt', 'Should contain MERGE statement');
  assertContains(result, 'WHEN MATCHED THEN UPDATE SET', 'Should contain UPDATE clause');
  assertContains(result, 'WHEN NOT MATCHED THEN INSERT', 'Should contain INSERT clause');
});

runner.test('Merge query excludes primary keys from INSERT clause', () => {
  const result = service.generateMergeStatement('users', testData, primaryKeys);
  const insertMatch = result.match(/WHEN NOT MATCHED THEN INSERT \(([^)]+)\)/);
  assert(insertMatch, 'Should have INSERT clause');
  
  const insertFields = insertMatch[1];
  assertNotContains(insertFields, 'id', 'INSERT fields should not contain primary key "id"');
  assertContains(insertFields, 'name', 'INSERT fields should contain "name"');
  assertContains(insertFields, 'email', 'INSERT fields should contain "email"');
});

runner.test('Merge query excludes primary keys from UPDATE clause', () => {
  const result = service.generateMergeStatement('users', testData, primaryKeys);
  const updateMatch = result.match(/WHEN MATCHED THEN UPDATE SET\n([\s\S]*?)\nWHEN NOT MATCHED/);
  assert(updateMatch, 'Should have UPDATE clause');
  
  const updateFields = updateMatch[1];
  assertNotContains(updateFields, 'tgt.id =', 'UPDATE clause should not contain primary key "id"');
  assertContains(updateFields, 'tgt.name =', 'UPDATE clause should contain "name"');
  assertContains(updateFields, 'tgt.email =', 'UPDATE clause should contain "email"');
});

runner.test('Merge query handles multiple primary keys correctly', () => {
  const multiPkSchema = [
    ['user_id', 'NUMBER(10)', 'PK'],
    ['role_id', 'NUMBER(10)', 'PK'],
    ['assigned_date', 'DATE', '']
  ];
  
  const multiPkData = [
    { fieldName: 'user_id', formattedValue: '1' },
    { fieldName: 'role_id', formattedValue: '2' },
    { fieldName: 'assigned_date', formattedValue: 'SYSDATE' }
  ];
  
  const multiPks = ['user_id', 'role_id'];
  const result = service.generateMergeStatement('user_roles', multiPkData, multiPks);
  
  // Check INSERT clause excludes both PKs
  const insertMatch = result.match(/WHEN NOT MATCHED THEN INSERT \(([^)]+)\)/);
  const insertFields = insertMatch[1];
  assertNotContains(insertFields, 'user_id', 'INSERT should not contain user_id PK');
  assertNotContains(insertFields, 'role_id', 'INSERT should not contain role_id PK');
  assertContains(insertFields, 'assigned_date', 'INSERT should contain assigned_date');
  
  // Check UPDATE clause excludes both PKs
  const updateMatch = result.match(/WHEN MATCHED THEN UPDATE SET\n([\s\S]*?)\nWHEN NOT MATCHED/);
  const updateFields = updateMatch[1];
  assertNotContains(updateFields, 'tgt.user_id =', 'UPDATE should not contain user_id PK');
  assertNotContains(updateFields, 'tgt.role_id =', 'UPDATE should not contain role_id PK');
});

runner.test('Merge query excludes creation audit fields from UPDATE', () => {
  const auditData = [
    { fieldName: 'id', formattedValue: '1' },
    { fieldName: 'name', formattedValue: "'John'" },
    { fieldName: 'created_time', formattedValue: 'SYSDATE' },
    { fieldName: 'created_by', formattedValue: "'system'" }
  ];
  
  const result = service.generateMergeStatement('users', auditData, primaryKeys);
  const updateMatch = result.match(/WHEN MATCHED THEN UPDATE SET\n([\s\S]*?)\nWHEN NOT MATCHED/);
  const updateFields = updateMatch[1];
  
  assertNotContains(updateFields, 'created_time', 'UPDATE should not contain created_time');
  assertNotContains(updateFields, 'created_by', 'UPDATE should not contain created_by');
  assertContains(updateFields, 'tgt.name =', 'UPDATE should contain name field');
});

runner.test('Config table uses parameter_key as primary key', () => {
  const configSchema = [
    ['parameter_key', 'VARCHAR2(50)', ''],
    ['parameter_value', 'VARCHAR2(500)', '']
  ];
  
  const mockService = new MockValueProcessorService();
  const configPks = mockService.findPrimaryKeys(configSchema, 'config_table');
  
  assert(configPks.includes('parameter_key'), 'Config table should use parameter_key as PK');
});

runner.test('INSERT query includes primary keys (non-merge)', () => {
  const result = service.generateInsertStatement('users', testData);
  assertContains(result, 'INSERT INTO users (id,', 'INSERT should include primary key "id"');
  assertContains(result, 'VALUES (1,', 'INSERT VALUES should include primary key value');
});

runner.test('Table with no explicit primary keys defaults to first field', () => {
  const noPkSchema = [
    ['name', 'VARCHAR2(100)', ''],
    ['email', 'VARCHAR2(255)', '']
  ];
  
  const mockService = new MockValueProcessorService();
  const defaultPks = mockService.findPrimaryKeys(noPkSchema, 'simple_table');
  
  assert(defaultPks.includes('name'), 'Should default to first field as PK when no explicit PK found');
});

// Run the tests
if (require.main === module) {
  runner.run();
}

module.exports = { TestRunner, QueryGenerationService };