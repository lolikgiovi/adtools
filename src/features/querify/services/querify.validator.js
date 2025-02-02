export class QueryValidator {
  validateData(tableData, tableSchema) {
    // 1. Check if data exists
    if (tableData.length === 0) {
      return {
        isValid: false,
        errorMessage: "Data is empty.",
      };
    }

    // 2. Check if field counts match
    if (tableData[0].length !== tableSchema.length) {
      return {
        isValid: false,
        errorMessage: `Mismatch in field count. Sheet1 has ${tableData[0].length} field names, but Sheet2 has ${tableSchema.length} field names.`,
      };
    }

    // 3. Check field name matches between sheets
    const fieldNames = new Set(tableData[0]);
    const schemaFieldNames = new Set(tableSchema.map((field) => field.field));

    // Check Sheet1 fields exist in Sheet2
    for (let field of fieldNames) {
      if (!schemaFieldNames.has(field)) {
        return {
          isValid: false,
          errorMessage: `Field '${field}' in Sheet1 does not exist in Sheet2.`,
        };
      }
    }

    // Check Sheet2 fields exist in Sheet1
    for (let field of schemaFieldNames) {
      if (!fieldNames.has(field)) {
        return {
          isValid: false,
          errorMessage: `Field '${field}' in Sheet2 does not exist in Sheet1.`,
        };
      }
    }

    // 4. Create field index mapping
    const fieldIndices = {};
    tableData[0].forEach((field, index) => {
      fieldIndices[field] = index;
    });

    // 5. Validate data types and NULL constraints
    for (let i = 1; i < tableData.length; i++) {
      for (let schema of tableSchema) {
        const fieldIndex = fieldIndices[schema.field];
        const value = tableData[i][fieldIndex];

        // Skip validation for system fields
        if (this.isSystemField(schema.field)) {
          continue;
        }

        // Check for NULL in non-nullable fields
        if (this.isNullInNonNullableField(schema, value)) {
          const columnLetter = this.getExcelColumnName(fieldIndex);
          return {
            isValid: false,
            errorMessage: `NON NULLABLE data on ROW ${i + 1} COLUMN ${columnLetter} is NULL(${schema.field}), PLEASE RECHECK`,
          };
        }

        // Validate field data type
        if (!this.validateField(value, schema)) {
          const columnLetter = this.getExcelColumnName(fieldIndex);
          return {
            isValid: false,
            errorMessage: `Invalid data in Sheet1 at row ${i + 1}, column ${columnLetter} (${schema.field}). Expected ${
              schema.dataType
            }, got ${value}`,
          };
        }
      }
    }

    return { isValid: true, errorMessage: "" };
  }

  isSystemField(fieldName) {
    const systemFields = ["created_time", "created_by", "updated_time", "updated_by", "config_id"];
    return systemFields.includes(fieldName.toLowerCase());
  }

  isNullInNonNullableField(schema, value) {
    return schema.nullable.toLowerCase() === "no" && (value === null || value === undefined || value === "NULL" || value === "null");
  }

  validateField(value, schema) {
    // Allow nulls for nullable fields
    if (
      schema.nullable.toLowerCase() === "yes" &&
      (value === null || value === undefined || value === "NULL" || value === "null" || value === "")
    ) {
      return true;
    }

    // Validate based on data type
    const dataType = schema.dataType.split("(")[0].toUpperCase();
    switch (dataType) {
      case "VARCHAR2":
      case "VARCHAR":
        return true; // Always valid for string types
      case "NUMBER":
        return !isNaN(parseFloat(value)) && isFinite(value);
      case "TIMESTAMP":
        return this.isValidTimestamp(value);
      default:
        return true; // Accept unknown types
    }
  }

  isValidTimestamp(value) {
    if (typeof value === "string" && value.toLowerCase() === "sysdate") {
      return true;
    }

    const formats = [
      "DD-MM-YYYY",
      "DD-MM-YYYY HH:mm:ss",
      "YYYY-MM-DD",
      "YYYY-MM-DD HH:mm:ss",
      "DD-MM-YYYY HH.mm.ss,SSSSSSSSS",
      "DD/MM/YYYY",
      "DD/M/YYYY",
      "M/D/YYYY H:mm:ss.SSSSSS A",
    ];

    return formats.some((format) => moment(value, format, true).isValid());
  }

  getExcelColumnName(index) {
    let columnName = "";
    while (index >= 0) {
      columnName = String.fromCharCode(65 + (index % 26)) + columnName;
      index = Math.floor(index / 26) - 1;
    }
    return columnName;
  }
}
