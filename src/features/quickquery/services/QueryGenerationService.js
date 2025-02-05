import { ValueProcessorService } from "./ValueProcessorService.js";
import { oracleReservedWords } from "../constants/Constants.js";

export class QueryGenerationService {
  constructor() {
    this.ValueProcessorService = new ValueProcessorService();
  }

  generateQuery(tableName, queryType, schemaData, inputData) {
    // 1. Get field names from first row of input data
    const fieldNames = inputData[0].map((name) => name.toLowerCase());
    console.log("Field names extracted");

    // 2. Get data rows (excluding header row)
    const dataRows = inputData.slice(1).filter((row) => row.some((cell) => cell !== null && cell !== ""));
    console.log("Data rows extracted");

    // 3. Map schema with field name as key
    const schemaMap = new Map(schemaData.map((row) => [row[0].toLowerCase(), row]));

    // 4. Process each row of data
    const processedRows = dataRows.map((rowData, rowIndex) => {
      try {
        // For each field in the row
        return fieldNames.map((fieldName, colIndex) => {
          // Get the schema definition for this field
          const schemaRow = schemaMap.get(fieldName.toLowerCase());

          // Extract dataType and nullable from schema
          const [, dataType, nullable] = schemaRow;
          // Get the actual value from the data
          const value = rowData[colIndex];

          // Return formatted object
          return {
            fieldName,
            formattedValue: this.ValueProcessorService.processValue(value, dataType, nullable, fieldName, tableName),
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
      .filter((f) => !primaryKeysLowerCase.includes(f.fieldName) && !["created_time", "created_by"].includes(f.fieldName))
      .map((f) => `  tgt.${this.formatFieldName(f.fieldName)} = src.${this.formatFieldName(f.fieldName)}`)
      .join(",\n");

    // Format INSERT fields and values
    const insertFields = processedFields.map((f) => this.formatFieldName(f.fieldName)).join(", ");
    const insertValues = processedFields.map((f) => `src.${this.formatFieldName(f.fieldName)}`).join(", ");

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
    const pkValueMap = new Map(primaryKeys.map((pk) => [pk.toLowerCase(), new Set()]));

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

    let selectStatement = `\nSELECT * FROM ${tableName} WHERE ${whereConditions.join(" AND ")} ORDER BY created_time ASC;`;
    selectStatement += `\nSELECT ${primaryKeys
      .map((pk) => pk.toLowerCase())
      .join(", ")}, updated_time FROM ${tableName} WHERE updated_time >= SYSDATE - INTERVAL '5' MINUTE;`;
    return selectStatement;
  }

  formatFieldName(fieldName) {
    return oracleReservedWords.has(fieldName.toLowerCase()) ? `"${fieldName.toUpperCase()}"` : fieldName;
  }
}
