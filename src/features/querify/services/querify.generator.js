import { QueryFormatter } from "./querify.formatter.js";

export class QueryGenerator {
  constructor() {
    this.formatter = new QueryFormatter();
  }

  generateQuery(tableData, tableSchema, queryType, fileName, primaryKeys) {
    const { schemaName, tableName } = this.parseFileName(fileName);
    const fullTableName = `${schemaName.toLowerCase()}.${tableName.toLowerCase()}`;
    const fieldNames = tableData[0].map((field) => field.toLowerCase());

    // Create mappings
    const { fieldIndices, schemaMap } = this.createMappings(tableData[0], tableSchema);

    // Generate base query
    let query = "SET DEFINE OFF;\n\n";

    // Generate specific query type
    switch (queryType) {
      case "insert":
        query += this.generateInsertQuery(tableData, fieldNames, fieldIndices, schemaMap, fullTableName);
        break;
      case "merge":
        query += this.generateMergeQuery(tableData, fieldNames, fieldIndices, schemaMap, fullTableName, primaryKeys);
        break;
      case "merge-classic":
        query += this.generateMergeClassicQuery(tableData, fieldNames, fieldIndices, schemaMap, fullTableName, primaryKeys);
        break;
      default:
        throw new Error(`Unsupported query type: ${queryType}`);
    }

    // Add verification queries
    query += this.generateSelectQuery(fullTableName, primaryKeys, tableData, fieldIndices, schemaMap);

    return query;
  }

  createMappings(headers, schema) {
    // Create field indices mapping
    const fieldIndices = {};
    headers.forEach((field, index) => {
      fieldIndices[field.toLowerCase()] = index;
    });

    // Create schema mapping
    const schemaMap = {};
    schema.forEach((schemaItem) => {
      schemaMap[schemaItem.field.toLowerCase()] = schemaItem;
    });

    return { fieldIndices, schemaMap };
  }

  generateInsertQuery(tableData, fieldNames, fieldIndices, schemaMap, fullTableName) {
    let query = "";
    // Generate INSERT statements for each row
    for (let i = 1; i < tableData.length; i++) {
      const values = this.formatRowValues(tableData[i], fieldNames, fieldIndices, schemaMap, fullTableName);
      query += `INSERT INTO ${fullTableName} (${fieldNames.join(", ")}) VALUES (${values.join(", ")});\n`;
    }
    return query;
  }

  generateMergeQuery(tableData, fieldNames, fieldIndices, schemaMap, fullTableName, primaryKeys) {
    let query = `MERGE INTO ${fullTableName} t\nUSING (\n`;

    // Generate the source data subquery
    const sourceRows = [];
    for (let i = 1; i < tableData.length; i++) {
      const values = this.formatRowValues(tableData[i], fieldNames, fieldIndices, schemaMap, fullTableName);
      sourceRows.push(`  SELECT ${fieldNames.map((field, index) => `${values[index]} AS ${field}`).join(", ")} FROM DUAL`);
    }
    query += sourceRows.join(" UNION ALL\n");

    // Add merge conditions and actions
    query += `\n) s\nON (${primaryKeys.map((pk) => `t.${pk} = s.${pk}`).join(" AND ")})\n`;
    query += `WHEN MATCHED THEN UPDATE SET\n`;
    query += this.generateUpdateSet(fieldNames, primaryKeys);
    query += `\nWHEN NOT MATCHED THEN INSERT (${fieldNames.join(", ")})\n`;
    query += `VALUES (${fieldNames.map((field) => `s.${field}`).join(", ")});\n`;

    return query;
  }

  formatRowValues(row, fieldNames, fieldIndices, schemaMap, fullTableName) {
    return fieldNames.map((field) => {
      const value = row[fieldIndices[field]];
      return this.formatter.formatValue(value, schemaMap[field], fullTableName);
    });
  }

  generateMergeClassicQuery(tableData, fieldNames, fieldIndices, schemaMap, fullTableName, primaryKeys) {
    let query = "";
    for (let i = 1; i < tableData.length; i++) {
      const values = this.formatRowValues(tableData[i], fieldNames, fieldIndices, schemaMap, fullTableName);

      query += `MERGE INTO ${fullTableName} tgt\nUSING (SELECT\n`;
      query += fieldNames.map((field, index) => `  ${values[index]} AS ${field}`).join(",\n");
      query += `\nFROM DUAL) src\n`;
      query += `ON (${primaryKeys.map((pk) => `tgt.${pk} = src.${pk}`).join(" AND ")})\n`;
      query += `WHEN MATCHED THEN UPDATE SET\n`;
      query += this.generateUpdateSet(fieldNames, primaryKeys, "tgt", "src");
      query += `\nWHEN NOT MATCHED THEN INSERT (${fieldNames.join(", ")})\n`;
      query += `VALUES (${fieldNames.map((field) => `src.${field}`).join(", ")});\n\n`;
    }
    return query;
  }

  generateUpdateSet(fieldNames, primaryKeys, targetAlias = "t", sourceAlias = "s") {
    return fieldNames
      .filter((field) => !primaryKeys.some((pk) => pk.toLowerCase() === field.toLowerCase()) && !this.formatter.isSystemField(field))
      .map((field) => `  ${targetAlias}.${field} = ${sourceAlias}.${field}`)
      .join(",\n");
  }

  generateSelectQuery(fullTableName, primaryKeys, tableData, fieldIndices, schemaMap) {
    let query = "\n--Check updated data in the last 5 minutes\n";
    query += `SELECT * FROM ${fullTableName} WHERE updated_time >= SYSDATE - INTERVAL '5' MINUTE;\n`;

    // Generate WHERE clause for primary keys
    const pkConditions = primaryKeys.map((pk) => {
      const pkValues = tableData
        .slice(1)
        .map((row) => {
          const pkIndex = fieldIndices[pk.toLowerCase()];
          const pkValue = row[pkIndex];
          return this.formatter.formatValue(pkValue, schemaMap[pk.toLowerCase()], fullTableName);
        })
        .filter((value) => value !== "NULL");
      return `${pk} IN (${pkValues.join(", ")})`;
    });

    query += `SELECT * FROM ${fullTableName} WHERE ${pkConditions.join(" AND ")};\n`;
    return query;
  }

  parseFileName(fileName) {
    if (fileName.includes(".")) {
      const [schemaName, tableName] = fileName.split(".");
      return { schemaName, tableName };
    }
    return {
      schemaName: "schema_name",
      tableName: fileName,
    };
  }
}
