// querify.service.js
import { QueryValidator } from "./querify.validator.js";
import { QueryFormatter } from "./querify.formatter.js";
import { QueryGenerator } from "./querify.generator.js";
import { FileProcessor } from "./querify.processor.js";

export class QuerifyService {
  constructor() {
    // Initialize all service components
    this.validator = new QueryValidator();
    this.formatter = new QueryFormatter();
    this.generator = new QueryGenerator();
    this.fileProcessor = new FileProcessor();

    // Store query generation results
    this.generatedQueries = {};
    this.fileValidationStatus = {};
    this.components = {};
    this.fileContents = {};
    this.selectedFile = null;
  }

  setComponents(components) {
    this.components = components;
  }

  /**
   * Process a file and generate SQL queries
   * @param {File} file - The file to process
   * @param {string} queryType - Type of query to generate (insert/merge/merge-classic)
   * @returns {Promise<Object>} Processing result
   */
  async processFile(file, queryType) {
    try {
      // Process the file
      const processedFile = await this.fileProcessor.processFile(file);
      if (!processedFile.tableData || !processedFile.tableSchema) {
        throw new Error("Invalid file structure");
      }

      // Validate the data
      const validationResult = this.validator.validateData(processedFile.tableData, processedFile.tableSchema);

      if (!validationResult.isValid) {
        this.updateFileStatus(file.name, false, validationResult.errorMessage);
        return validationResult;
      }

      // Find primary keys
      const fileName = file.name.split(".").slice(0, -1).join(".");
      const primaryKeys = this.findPrimaryKeys(processedFile.tableSchema, fileName);

      // Generate query
      const query = this.generator.generateQuery(processedFile.tableData, processedFile.tableSchema, queryType, fileName, primaryKeys);

      // Store the results
      this.storeGeneratedQuery(file.name, {
        query,
        tableSchema: processedFile.tableSchema,
        primaryKeys,
        fullTableName: fileName,
      });

      this.updateFileStatus(file.name, true);

      return {
        isValid: true,
        query,
        tableSchema: processedFile.tableSchema,
        primaryKeys,
      };
    } catch (error) {
      this.updateFileStatus(file.name, false, error.message);
      return {
        isValid: false,
        errorMessage: error.message,
      };
    }
  }

  // Error Handling
  showError(message) {
    const errorDiv = document.getElementById("errorMessages");
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = "block";
      errorDiv.style.color = "red";
    }
  }

  showSuccess(message) {
    const errorDiv = document.getElementById("errorMessages");
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = "block";
      errorDiv.style.color = "green";
    }
  }

  clearError() {
    const errorDiv = document.getElementById("errorMessages");
    if (errorDiv) {
      errorDiv.textContent = "";
      errorDiv.style.display = "none";
    }
  }

  // UI Management
  showContentArea(areaId) {
    const contentAreas = document.querySelectorAll(".querify-content-area");
    contentAreas.forEach((area) => (area.style.display = "none"));
    const targetArea = document.getElementById(areaId);
    if (targetArea) {
      targetArea.style.display = "block";
    }
  }

  // File Management
  getFiles() {
    return this.components.fileManager?.getFiles() || { excel: [], text: [], image: [] };
  }

  getSelectedFile() {
    return this.selectedFile;
  }

  selectFile(file, type) {
    this.selectedFile = file;
    if (this.components.fileManager) {
      this.components.fileManager.selectFile(file, type);
    }
  }

  /**
   * Process multiple files
   * @param {File[]} files - Array of files to process
   * @param {string} queryType - Type of query to generate
   * @returns {Promise<Object>} Processing results for all files
   */
  async processFiles(files, queryType) {
    try {
      const results = {};
      for (const file of files) {
        results[file.name] = await this.processFile(file, queryType);
      }
      return results;
    } catch (error) {
      console.error("Error processing file:", error);
      return { isValid: false, errorMessage: error.message };
    }
  }

  /**
   * Get generated query for a file
   * @param {string} fileName - Name of the file
   * @returns {Object|null} Generated query information or null if not found
   */
  getGeneratedQuery(fileName) {
    return this.generatedQueries[fileName] || null;
  }

  /**
   * Get validation status for a file
   * @param {string} fileName - Name of the file
   * @returns {Object} Validation status and error message if any
   */
  getFileStatus(fileName) {
    return {
      isValid: this.fileValidationStatus[fileName] || false,
      errorMessage: this.fileValidationStatus[fileName + "_error"] || "",
    };
  }

  /**
   * Find primary keys for a table
   * @private
   */
  findPrimaryKeys(tableSchema, tableName) {
    if (!tableSchema || !Array.isArray(tableSchema)) {
      console.warn(`Invalid table schema for ${tableName}`);
      return ["unknown"];
    }

    // Special case for "config" tables
    if (tableName.toLowerCase().endsWith("config")) {
      const parameterKeyField = tableSchema.find((field) => field.field.toLowerCase() === "parameter_key");
      if (parameterKeyField) {
        return [parameterKeyField.field];
      }
    }

    // Special case for "event" tables
    if (tableName.toLowerCase().endsWith("event")) {
      const eventCodeField = tableSchema.find((field) => field.field.toLowerCase() === "event_code");
      if (eventCodeField) {
        return [eventCodeField.field];
      }
    }

    // Look for fields marked with "PK" in the order column
    const pkFields = tableSchema
      .filter((field) => field.order && field.order.toString().toLowerCase() === "pk")
      .map((field) => field.field);

    if (pkFields.length > 0) {
      return pkFields;
    }

    // Default to first field if no PK found
    return [tableSchema[0] ? tableSchema[0].field.toLowerCase() : "unknown"];
  }

  /**
   * Store generated query results
   * @private
   */
  storeGeneratedQuery(fileName, queryInfo) {
    this.generatedQueries[fileName] = queryInfo;
  }

  /**
   * Update file validation status
   * @private
   */
  updateFileStatus(fileName, isValid, errorMessage = "") {
    this.fileValidationStatus[fileName] = isValid;
    if (!isValid) {
      this.fileValidationStatus[fileName + "_error"] = errorMessage;
    }
  }

  /**
   * Clear all stored data
   */
  clearAll() {
    this.generatedQueries = {};
    this.fileValidationStatus = {};
  }

  /**
   * Split a large SQL query into smaller chunks
   * @param {string} fileName - Name of the file containing the query
   * @param {number} maxChunkSize - Maximum size of each chunk in bytes
   * @returns {Object} Split query information
   */
  splitQuery(fileName, maxChunkSize = 90 * 1024) {
    const queryInfo = this.generatedQueries[fileName];
    if (!queryInfo) {
      throw new Error("No query found for the specified file");
    }

    const sql = queryInfo.query;
    const statements = sql.split(/;(?=(?:[^']*'[^']*')*[^']*$)/);

    // Filter out SET DEFINE OFF and SELECT statements
    const relevantStatements = statements.filter((stmt) => {
      const trimmedStmt = stmt.trim().toUpperCase();
      return (
        !trimmedStmt.startsWith("SET DEFINE OFF") &&
        !trimmedStmt.startsWith("SELECT") &&
        (trimmedStmt.startsWith("INSERT") || trimmedStmt.startsWith("MERGE"))
      );
    });

    let chunks = [];
    let currentChunk = "";
    let oversizedChunksCount = 0;

    for (const statement of relevantStatements) {
      if (statement.trim() === "") continue;

      const potentialChunk = currentChunk + statement + ";";

      if (potentialChunk.length > maxChunkSize && currentChunk !== "") {
        chunks.push(currentChunk);
        currentChunk = statement + ";";
      } else {
        currentChunk = potentialChunk;
      }

      if (statement.length + 1 > maxChunkSize) {
        oversizedChunksCount++;
      }
    }

    if (currentChunk !== "") {
      chunks.push(currentChunk);
    }

    // Add SET DEFINE OFF and verification queries to each chunk
    chunks = chunks.map((chunk) => {
      return (
        "SET DEFINE OFF;\n" +
        chunk +
        `\n--Check updated data in the last 5 minutes\n` +
        `SELECT * FROM ${queryInfo.fullTableName} WHERE updated_time >= SYSDATE - INTERVAL '5' MINUTE;`
      );
    });

    return {
      chunks,
      oversizedChunksCount,
      totalChunks: chunks.length,
    };
  }
}
