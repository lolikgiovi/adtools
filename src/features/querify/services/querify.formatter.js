export class QueryFormatter {
  constructor() {
    this.dataTypeFormatters = {
      VARCHAR2: this.formatVarchar.bind(this),
      VARCHAR: this.formatVarchar.bind(this),
      CHAR: this.formatChar.bind(this),
      NUMBER: this.formatNumber.bind(this),
      DATE: this.formatDate.bind(this),
      TIMESTAMP: this.formatTimestamp.bind(this),
      CLOB: this.formatClob.bind(this),
      BLOB: this.formatBlob.bind(this),
    };
  }

  // Main format method
  formatValue(value, schema, fullTableName) {
    // Handle special fields first
    if (this.isSystemField(schema.field)) {
      return this.handleSystemField(schema.field, fullTableName);
    }

    // Handle null values
    if (this.isNullValue(value)) {
      return this.handleNullValue(schema);
    }

    // Get base data type without size/precision
    const baseType = this.getBaseDataType(schema.dataType);
    const formatter = this.dataTypeFormatters[baseType];

    if (formatter) {
      return formatter(value, schema);
    }

    // Default handling for unknown types
    return this.formatVarchar(value, schema);
  }

  // Data type formatters
  formatVarchar(value, schema) {
    const sanitized = this.sanitizeString(value.toString());
    return `'${sanitized}'`;
  }

  formatChar(value, schema) {
    const capacity = this.extractCapacity(schema.dataType);
    const sanitized = this.sanitizeString(value.toString());
    return capacity ? `RPAD('${sanitized}', ${capacity})` : `'${sanitized}'`;
  }

  formatNumber(value, schema) {
    // Handle different number formats
    if (typeof value === "string" && value.includes(",")) {
      return value.replace(",", "");
    }
    if (isNaN(value)) {
      throw new Error(`Invalid number format: ${value}`);
    }
    return value;
  }

  formatDate(value) {
    // Support multiple date formats
    const formats = {
      "YYYY-MM-DD": /^\d{4}-\d{2}-\d{2}$/,
      "DD-MM-YYYY": /^\d{2}-\d{2}-\d{4}$/,
      "MM/DD/YYYY": /^\d{2}\/\d{2}\/\d{4}$/,
    };

    for (const [format, regex] of Object.entries(formats)) {
      if (regex.test(value)) {
        return `TO_DATE('${value}', '${format}')`;
      }
    }

    throw new Error(`Unsupported date format: ${value}`);
  }

  formatTimestamp(value) {
    const formats = [
      {
        pattern: /^\d{2}-\d{2}-\d{4}$/,
        oracle: "DD-MM-YYYY",
      },
      {
        pattern: /^\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2}$/,
        oracle: "DD-MM-YYYY HH24:MI:SS",
      },
      {
        pattern: /^\d{2}-\d{2}-\d{4} \d{2}\.\d{2}\.\d{2},\d{9}$/,
        oracle: "DD-MM-YYYY HH24:MI:SS.FF9",
      },
      {
        pattern: /^\d{4}-\d{2}-\d{2}$/,
        oracle: "YYYY-MM-DD",
      },
      {
        pattern: /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/,
        oracle: "YYYY-MM-DD HH24:MI:SS",
      },
      {
        pattern: /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{6}$/,
        oracle: "YYYY-MM-DD HH24:MI:SS.FF6",
      },
    ];

    // Handle SYSDATE
    if (value.toUpperCase() === "SYSDATE") {
      return "SYSDATE";
    }

    // Find matching format
    for (const format of formats) {
      if (format.pattern.test(value)) {
        return `TO_TIMESTAMP('${value}', '${format.oracle}')`;
      }
    }

    throw new Error(`Unsupported timestamp format: ${value}`);
  }

  formatClob(value) {
    const chunks = this.chunkString(value, 1000);
    return chunks.map((chunk) => `to_clob('${this.sanitizeString(chunk)}')`).join(" || \n");
  }

  formatBlob(value) {
    // Assuming value is base64 encoded
    return `UTL_RAW.CAST_TO_RAW('${value}')`;
  }

  // Utility methods
  isSystemField(fieldName) {
    const systemFields = ["created_time", "updated_time", "created_by", "updated_by", "config_id", "system_config_id"];
    return systemFields.includes(fieldName.toLowerCase());
  }

  handleSystemField(fieldName, fullTableName) {
    const field = fieldName.toLowerCase();
    const systemValues = {
      created_time: "SYSDATE",
      updated_time: "SYSDATE",
      created_by: "'SYSTEM'",
      updated_by: "'SYSTEM'",
      config_id: `(SELECT MAX(${field})+1 FROM ${fullTableName})`,
      system_config_id: this.handleSystemConfigId(field, fullTableName),
    };
    return systemValues[field] || "NULL";
  }

  handleSystemConfigId(field, fullTableName) {
    return fullTableName.toLowerCase() === "config.system_config" ? `(SELECT MAX(CAST(${field} AS INT))+1 FROM ${fullTableName})` : "NULL";
  }

  isNullValue(value) {
    return value === null || value === undefined || value === "NULL" || value === "null" || value === "";
  }

  handleNullValue(schema) {
    // Could implement special NULL handling based on schema
    return "NULL";
  }

  getBaseDataType(dataType) {
    return dataType.split("(")[0].toUpperCase();
  }

  extractCapacity(dataType) {
    const match = dataType.match(/\((\d+)\)/);
    return match ? match[1] : null;
  }

  sanitizeString(str) {
    return str
      .replace(/'/g, "''") // Escape single quotes
      .replace(/[\u2018\u2019]/g, "''") // Smart single quotes
      .replace(/[\u201C\u201D]/g, '"'); // Smart double quotes
  }

  chunkString(str, size) {
    const chunks = [];
    for (let i = 0; i < str.length; i += size) {
      chunks.push(str.slice(i, i + size));
    }
    return chunks;
  }
}
