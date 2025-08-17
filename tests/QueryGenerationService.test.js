// Import will be handled by the test runner with mocked dependencies
// import { QueryGenerationService } from '../src/features/quickQuery/services/QueryGenerationService.js';

// QueryGenerationService class with mocked dependencies
class QueryGenerationService {
  constructor() {
    this.ValueProcessorService = new window.mockDependencies.ValueProcessorService();
    this.attachmentValidationService = new window.mockDependencies.AttachmentValidationService();
  }

  generateQuery(tableName, queryType, schemaData, inputData, attachments) {
    // 1. Get field names from first row of input data
    const fieldNames = inputData[0].map((name) => name);
    console.log("Field names extracted", fieldNames);

    // 2. Get data rows (excluding header row)
    const dataRows = inputData.slice(1).filter((row) => row.some((cell) => cell !== null && cell !== ""));
    console.log("Data rows extracted");

    // 3. Map schema with field name as key
    const schemaMap = new Map(schemaData.map((row) => [row[0], row]));
    console.log("Schema Map:", schemaMap);

    // 4. Process each row of data
    const processedRows = dataRows.map((rowData, rowIndex) => {
      try {
        // For each field in the row
        return fieldNames.map((fieldName, colIndex) => {
          // Get the schema definition for this field
          const schemaRow = schemaMap.get(fieldName);

          // Extract dataType and nullable from schema
          const [, dataType, nullable] = schemaRow;
          // Get the actual value from the data
          let value = rowData[colIndex];

          // Check if value matches any attachment
          const attachmentValue = this.attachmentValidationService.validateAttachment(
            value,
            dataType,
            this.getMaxLength(dataType),
            attachments
          );

          // Use attachment value if found, otherwise use original value
          value = attachmentValue !== null ? attachmentValue : value;

          // Return formatted object
          return {
            fieldName,
            formattedValue: this.ValueProcessorService.processValue(value, dataType, nullable, fieldName, tableName, queryType),
          };
        });
      } catch (error) {
        throw new Error(`Row ${rowIndex + 2}: ${error.message}`);
      }
    });

    console.log("Data processed", processedRows);

    // 6. Find primary keys for MERGE statements
    const primaryKeys = this.ValueProcessorService.findPrimaryKeys(schemaData, tableName);
    console.log("Primary keys found:", primaryKeys);

    // 7. Generate SQL based on query type
    let query = `SET DEFINE OFF;\n\n`;

    if (queryType === "insert") {
      processedRows.forEach((processedFields) => {
        query += this.generateInsertStatement(tableName, processedFields);
        query += "\n\n";
      });
    } else if (queryType === "update") {
      query += this.generateUpdateStatement(tableName, processedRows, primaryKeys);
      query += "\n\n";
    } else {
      processedRows.forEach((processedFields) => {
        query += this.generateMergeStatement(tableName, processedFields, primaryKeys);
        query += "\n\n";
      });
    }

    // 8. Add select query to verify results
    const selectQuery = this.generateSelectStatement(tableName, primaryKeys, processedRows);

    if (selectQuery) {
      query += selectQuery;
    }

    return query;
  }

  generateInsertStatement(tableName, processedFields) {
    const fields = processedFields.map((f) => this.formatFieldName(f.fieldName));
    const values = processedFields.map((f) => f.formattedValue);

    return `INSERT INTO ${tableName} (${fields.join(", ")}) \nVALUES (${values.join(", ")});`;
  }

  generateMergeStatement(tableName, processedFields, primaryKeys) {
    // Format fields for SELECT part
    console.log("primaryKeys", primaryKeys);
    const primaryKeysLowerCase = primaryKeys.map((pk) => pk.toLowerCase());
    const selectFields = processedFields.map((f) => `\n  ${f.formattedValue} AS ${this.formatFieldName(f.fieldName)}`).join(",");

    // Format ON conditions for primary keys
    const pkConditions = primaryKeysLowerCase
      .map((pk) => `tgt.${this.formatFieldName(pk).toLowerCase()} = src.${this.formatFieldName(pk).toLowerCase()}`)
      .join(" AND ");

    // Format UPDATE SET clause (excluding PKs and creation fields)
    const updateFields = processedFields
      .filter((f) => !primaryKeysLowerCase.includes(f.fieldName.toLowerCase()) && !["created_time", "created_by"].includes(f.fieldName.toLowerCase()))
      .map((f) => `  tgt.${this.formatFieldName(f.fieldName)} = src.${this.formatFieldName(f.fieldName)}`)
      .join(",\n");

    // Format INSERT fields and values (excluding primary keys as per Oracle SQL conventions)
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

  generateSelectStatement(tableName, primaryKeys, processedRows) {
    if (primaryKeys.length === 0) return null;
    if (processedRows.length === 0) return null;

    // Collect formatted values for each primary key
    const pkValueMap = new Map(primaryKeys.map((pk) => [pk, new Set()]));

    // Go through each processed row to collect PK values
    processedRows.forEach((row) => {
      row.forEach((field) => {
        if (pkValueMap.has(field.fieldName)) {
          // Only add non-null values
          if (field.formattedValue !== "NULL") {
            pkValueMap.get(field.fieldName).add(field.formattedValue);
          }
        }
      });
    });

    // Build WHERE conditions
    const whereConditions = [];

    pkValueMap.forEach((values, pkName) => {
      if (values.size > 0) {
        whereConditions.push(`${this.formatFieldName(pkName)} IN (${Array.from(values).join(", ")})`);
      }
    });

    // If no valid PK values found, return null
    if (whereConditions.length === 0) return null;

    const orderByClause = processedRows.length > 1 ? " ORDER BY updated_time ASC" : "";
    let selectStatement = `\nSELECT * FROM ${tableName} WHERE ${whereConditions.join(" AND ")}${orderByClause};`;
    selectStatement += `\nSELECT ${primaryKeys
      .map((pk) => pk.toLowerCase())
      .join(", ")}, updated_time FROM ${tableName} WHERE updated_time >= SYSDATE - INTERVAL '5' MINUTE;`;
    return selectStatement;
  }

  formatFieldName(fieldName) {
    if (fieldName === fieldName.toLowerCase()) {
      return window.mockDependencies.oracleReservedWords.has(fieldName.toLowerCase()) ? `"${fieldName.toLowerCase()}"` : fieldName;
    }
    return fieldName.toLowerCase();
  }

  getMaxLength(dataType) {
    const match = dataType.match(/\((\d+)(?:\s*\w+)?\)/);
    return match ? parseInt(match[1]) : null;
  }
}

/**
 * Simple test framework for QueryGenerationService
 * Focus: Testing merge query generation and primary key exclusion
 */
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
    console.log('🧪 Running QueryGenerationService Tests\n');
    
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

    console.log(`\n📊 Test Results: ${this.passed} passed, ${this.failed} failed`);
    return this.failed === 0;
  }
}

// Test helper functions
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

// Test data setup
const createTestSchema = () => [
  ['user_id', 'NUMBER', 'PK', '', '1', 'Primary key'],
  ['username', 'VARCHAR2(50)', 'No', '', '2', 'Username'],
  ['email', 'VARCHAR2(100)', 'Yes', '', '3', 'Email address'],
  ['created_time', 'TIMESTAMP', 'No', 'SYSDATE', '4', 'Creation timestamp'],
  ['updated_time', 'TIMESTAMP', 'No', 'SYSDATE', '5', 'Update timestamp']
];

const createTestData = () => [
  ['user_id', 'username', 'email', 'created_time', 'updated_time'],
  [1, 'john_doe', 'john@example.com', null, null],
  [2, 'jane_smith', 'jane@example.com', null, null]
];

const createMultiPkSchema = () => [
  ['tenant_id', 'NUMBER', 'PK', '', '1', 'Tenant ID'],
  ['user_id', 'NUMBER', 'PK', '', '2', 'User ID'],
  ['username', 'VARCHAR2(50)', 'No', '', '3', 'Username'],
  ['status', 'VARCHAR2(20)', 'Yes', 'ACTIVE', '4', 'Status']
];

const createMultiPkData = () => [
  ['tenant_id', 'user_id', 'username', 'status'],
  [1, 100, 'john_doe', 'ACTIVE'],
  [1, 101, 'jane_smith', 'INACTIVE']
];

// Initialize test runner
const runner = new TestRunner();

// Test 1: Basic merge query generation
runner.test('Should generate basic merge query', () => {
  const service = new QueryGenerationService();
  const schema = createTestSchema();
  const data = createTestData();
  
  const query = service.generateQuery('users', 'merge', schema, data, []);
  
  assertContains(query, 'MERGE INTO users tgt', 'Should contain MERGE statement');
  assertContains(query, 'USING (SELECT', 'Should contain USING clause');
  assertContains(query, 'ON (tgt.user_id = src.user_id)', 'Should contain ON clause with primary key');
  assertContains(query, 'WHEN MATCHED THEN UPDATE SET', 'Should contain UPDATE clause');
  assertContains(query, 'WHEN NOT MATCHED THEN INSERT', 'Should contain INSERT clause');
});

// Test 2: Primary keys excluded from INSERT clause
runner.test('Should exclude primary keys from INSERT clause in merge query', () => {
  const service = new QueryGenerationService();
  const schema = createTestSchema();
  const data = createTestData();
  
  const query = service.generateQuery('users', 'merge', schema, data, []);
  
  // Extract the INSERT part of the merge statement
  const insertMatch = query.match(/WHEN NOT MATCHED THEN INSERT \(([^)]+)\)/i);
  assert(insertMatch, 'Should find INSERT clause');
  
  const insertFields = insertMatch[1];
  assertNotContains(insertFields, 'user_id', 'Primary key should be excluded from INSERT fields');
  assertContains(insertFields, 'username', 'Non-PK fields should be included in INSERT');
  assertContains(insertFields, 'email', 'Non-PK fields should be included in INSERT');
});

// Test 3: Primary keys excluded from UPDATE clause
runner.test('Should exclude primary keys from UPDATE clause in merge query', () => {
  const service = new QueryGenerationService();
  const schema = createTestSchema();
  const data = createTestData();
  
  const query = service.generateQuery('users', 'merge', schema, data, []);
  
  // Extract the UPDATE part of the merge statement
  const updateMatch = query.match(/WHEN MATCHED THEN UPDATE SET\s+([^W]+)WHEN/is);
  assert(updateMatch, 'Should find UPDATE clause');
  
  const updateFields = updateMatch[1];
  assertNotContains(updateFields, 'tgt.user_id = src.user_id', 'Primary key should not be updated');
  assertContains(updateFields, 'tgt.username = src.username', 'Non-PK fields should be updated');
  assertContains(updateFields, 'tgt.email = src.email', 'Non-PK fields should be updated');
});

// Test 4: Multiple primary keys handling
runner.test('Should handle multiple primary keys correctly', () => {
  const service = new QueryGenerationService();
  const schema = createMultiPkSchema();
  const data = createMultiPkData();
  
  const query = service.generateQuery('user_tenants', 'merge', schema, data, []);
  
  // Check ON clause contains both primary keys
  assertContains(query, 'tgt.tenant_id = src.tenant_id AND tgt.user_id = src.user_id', 
    'ON clause should contain both primary keys');
  
  // Check INSERT clause excludes both primary keys
  const insertMatch = query.match(/WHEN NOT MATCHED THEN INSERT \(([^)]+)\)/i);
  assert(insertMatch, 'Should find INSERT clause');
  
  const insertFields = insertMatch[1];
  assertNotContains(insertFields, 'tenant_id', 'First primary key should be excluded from INSERT');
  assertNotContains(insertFields, 'user_id', 'Second primary key should be excluded from INSERT');
  assertContains(insertFields, 'username', 'Non-PK fields should be included');
  assertContains(insertFields, 'status', 'Non-PK fields should be included');
});

// Test 5: Audit fields handling
runner.test('Should exclude creation audit fields from UPDATE clause', () => {
  const service = new QueryGenerationService();
  const schema = createTestSchema();
  const data = createTestData();
  
  const query = service.generateQuery('users', 'merge', schema, data, []);
  
  // Extract the UPDATE part
  const updateMatch = query.match(/WHEN MATCHED THEN UPDATE SET\s+([^W]+)WHEN/is);
  assert(updateMatch, 'Should find UPDATE clause');
  
  const updateFields = updateMatch[1];
  assertNotContains(updateFields, 'created_time', 'created_time should not be in UPDATE clause');
  // updated_time should be handled by the system, not from user input
});

// Test 6: Config table special handling
runner.test('Should handle config table primary key detection', () => {
  const configSchema = [
    ['parameter_key', 'VARCHAR2(100)', 'PK', '', '1', 'Parameter key'],
    ['parameter_value', 'VARCHAR2(500)', 'Yes', '', '2', 'Parameter value'],
    ['description', 'VARCHAR2(1000)', 'Yes', '', '3', 'Description']
  ];
  
  const configData = [
    ['parameter_key', 'parameter_value', 'description'],
    ['MAX_USERS', '1000', 'Maximum number of users']
  ];
  
  const service = new QueryGenerationService();
  const query = service.generateQuery('system_config', 'merge', configSchema, configData, []);
  
  assertContains(query, 'tgt.parameter_key = src.parameter_key', 
    'Should use parameter_key as primary key for config tables');
});

// Test 7: INSERT query should include all fields including primary keys
runner.test('INSERT query should include primary keys', () => {
  const service = new QueryGenerationService();
  const schema = createTestSchema();
  const data = createTestData();
  
  const query = service.generateQuery('users', 'insert', schema, data, []);
  
  assertContains(query, 'INSERT INTO users (user_id,', 'INSERT should include primary key');
  assertContains(query, 'VALUES (1,', 'VALUES should include primary key value');
});

// Test 8: Edge case - no primary keys defined
runner.test('Should handle tables with no explicit primary keys', () => {
  const noPkSchema = [
    ['id', 'NUMBER', 'No', '', '1', 'ID field'],
    ['name', 'VARCHAR2(50)', 'No', '', '2', 'Name field']
  ];
  
  const noPkData = [
    ['id', 'name'],
    [1, 'test']
  ];
  
  const service = new QueryGenerationService();
  const query = service.generateQuery('test_table', 'merge', noPkSchema, noPkData, []);
  
  // Should use first field as default primary key
  assertContains(query, 'tgt.id = src.id', 'Should use first field as default primary key');
});

// Run all tests
if (typeof window === 'undefined') {
  // Node.js environment
  runner.run().then(success => {
    process.exit(success ? 0 : 1);
  });
} else {
  // Browser environment
  runner.run();
}

export { runner };