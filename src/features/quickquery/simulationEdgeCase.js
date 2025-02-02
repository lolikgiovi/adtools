// function handleSimulationFillSchema() {
//     // Fill the table name input with a complex case
//     document.getElementById("tableNameInput").value = "edge_Test.TABLE_123";

//     // Edge test cases for schema
//     const testSchema = [
//       // Test case: Mixed case field names and special characters
//       ["Field_NAME_1", "VARCHAR2(50)", "PK", "", "1", "Test PK field"],

//       // Test case: Number field with maximum precision and scale
//       ["amount_2", "NUMBER(38,10)", "No", "0", "2", "Max Oracle number"],

//       // Test case: Nullable field with default
//       ["description", "VARCHAR2(4000)", "Yes", "'N/A'", "3", "Max VARCHAR2"],

//       // Test case: Boolean/Flag field
//       ["is_active_FLAG", "NUMBER(1,0)", "No", "1", "4", "Boolean field"],

//       // Test case: Reserved word as field name
//       ["\"TABLE\"", "VARCHAR2(100)", "No", "", "5", "Reserved word"],

//       // Test case: Timestamp with timezone
//       ["event_time", "TIMESTAMP(9) WITH TIME ZONE", "No", "SYSDATE", "6", "Max precision"],

//       // Test case: CLOB type
//       ["large_text", "CLOB", "Yes", "", "7", "CLOB field"]
//     ];

//     schemaTable.loadData(testSchema);
//   }

//   function handleSimulationFillData() {
//     // Test data with edge cases
//     const testData = [
//       // Header row - mixed case and special characters
//       ["Field_NAME_1", "amount_2", "description", "is_active_FLAG", "\"TABLE\"", "event_time", "large_text"],

//       // Row 1: Testing maximum values and special cases
//       [
//         "ABC123!@#$", // PK with special chars
//         "12345678901234567890.1234567890", // Large number
//         "This is a very long text string that tests the VARCHAR2 limit...", // Long text
//         "1", // Boolean true
//         "DROP TABLE", // SQL keyword
//         "2024-12-31 23:59:59.999999999 +00:00", // Max timestamp
//         "Very long CLOB text..." // CLOB content
//       ],

//       // Row 2: Testing minimum/edge values
//       [
//         "", // Empty PK (should trigger error)
//         "-0.00000000001", // Small negative number
//         "", // Empty nullable field
//         "0", // Boolean false
//         "", // Empty reserved word field
//         "", // Empty timestamp (should use SYSDATE)
//         "" // Empty CLOB
//       ],

//       // Row 3: Testing special characters and formats
//       [
//         "PK''QUOTE", // Single quote in PK
//         "1,234.56", // Number with comma
//         "Line1\nLine2", // Text with newline
//         "2", // Invalid boolean (should trigger error)
//         "TABLE;DROP", // Semicolon in text
//         "01-JAN-24", // Different date format
//         "<?xml version=\"1.0\"?><root>TEST</root>" // XML in CLOB
//       ]
//     ];

//     dataTable.loadData(testData);
//     updateDataSpreadsheet();
//   }
