import { copyToClipboard } from "../utils/buttons.js";

export function initQuickQuery(container, updateHeaderTitle) {
  const html = `
    <div class="tool-container quick-query-tool-container">
      <div class="quick-query-content">
        <div class="content-a">
          <div class="quick-query-left-panel">
            <div class="button-group quick-query-left-controls">
              <input type="text" id="tableNameInput" placeholder="Enter table name" value="schema_name.table_name">
              <select id="queryTypeSelect">
                <option value="merge">MERGE INTO</option>
                <option value="insert">INSERT</option>
              </select>
              <button id="generateQuery">Generate</button>
              <button id="clearAll">Clear</button>
            </div>
            <div id="spreadsheet-schema"></div>
            <div id="guideContainer">
              <button id="toggleGuide" class="toggle-guide">Tutorial & Simulation</button>
              <div id="guide" class="guide-content hidden">
                <h4>Quick Guide:</h4>
                <ul>
                  <li>Copy and paste your database schema.</li>
                  <li>Use "PK" in the Nullable field to indicate Primary Keys. If no "PK" is stated, default PK would be field[0].</li>
                  <li>You can have multiple primary keys.</li>
                  <li>Fill in the Data Input with your values.</li>
                  <li>Click buttons below to simulate the query generation.</li>
                </ul>
                <div class = "button-group simulate-buttons">
                  <button id="simulationFillSchemaButton" class="simulate-button">1. Fill Schema</button>
                  <p>&rarr;</p>
                  <button id="simulationFillDataButton" class="simulate-button">2. Fill Data</button>
                  <p>&rarr;</p>
                  <button id="simulationGenerateQueryButton" class="simulate-button">3. Generate Query</button>
                </div>
              </div>
            </div>
          </div>
          <div class="quick-query-right-panel">
            <div class="button-group quick-query-right-controls">
              <button id="toggleWordWrap">Word Wrap: Off</button>
              <button id="copySQL">Copy SQL</button>
              <button id="downloadSQL">Download SQL</button>
            </div>
            <div id="errorMessages"></div>
            <div id="queryEditor" class="quick-query-content-area"></div>
          </div>
        </div>
        <div class="content-b">
          <div class="button-group quick-query-left-controls">
            <h3>Data Input</h3>
            <p>Note: First row of data must be field names.</p>
            <button id="addFieldNames">Click here to add field names from your schema above</button>
          </div>
          <div id="spreadsheet-data"></div>
        </div>
      </div>
    </div>
  `;
  container.innerHTML = html;

  clearError();

  let editor;
  let schemaHot;
  let dataHot;

  // Load Handsontable script and CSS dynamically
  loadHandsontable().then(() => {
    initializeHandsontable();
    initializeEditor();
    setupEventListeners();
  });

  function loadHandsontable() {
    return new Promise((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href =
        "https://cdn.jsdelivr.net/npm/handsontable/dist/handsontable.full.min.css";
      document.head.appendChild(link);

      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/handsontable/dist/handsontable.full.min.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function initializeHandsontable() {
    const schemaContainer = document.getElementById("spreadsheet-schema");
    const data = [["", "", "", ""]];
    schemaHot = new Handsontable(schemaContainer, {
      data: data,
      colHeaders: [
        "Field Name",
        "Data Type",
        "Nullable/PK",
        "Default",
        "Column Id",
        "Comments",
      ],
      columns: [
        {
          // Field Name
          renderer: function (
            instance,
            td,
            row,
            col,
            prop,
            value,
            cellProperties
          ) {
            Handsontable.renderers.TextRenderer.apply(this, arguments);
            td.style.fontWeight = "bold";
          },
        },
        {}, // Data Type
        {
          // Nullable/PK
          type: "dropdown",
          source: ["Yes", "No", "PK"],
          validator: function (value, callback) {
            callback(["Yes", "No", "PK"].includes(value));
          },
          renderer: function (
            instance,
            td,
            row,
            col,
            prop,
            value,
            cellProperties
          ) {
            Handsontable.renderers.DropdownRenderer.apply(this, arguments);
            td.style.textAlign = "center";
          },
        },
        {}, // Default
        {
          // Column Id
          type: "numeric",
          validator: function (value, callback) {
            callback(
              value === null || value === "" || !isNaN(parseFloat(value))
            );
          },
          renderer: function (
            instance,
            td,
            row,
            col,
            prop,
            value,
            cellProperties
          ) {
            Handsontable.renderers.NumericRenderer.apply(this, arguments);
            td.style.textAlign = "center";
          },
        },
        {}, // Comments
      ],
      height: "auto",
      licenseKey: "non-commercial-and-evaluation",
      minCols: 6,
      contextMenu: true,
      mergeCells: true,
      manualColumnResize: true,
      afterChange: (changes) => {
        if (changes) {
          updateDataSpreadsheet();
        }
      },
      afterGetColHeader: function (col, TH) {
        const header = TH.querySelector(".colHeader");
        if (header) {
          header.style.fontWeight = "bold";
        }
      },
    });

    initializeDataHandsontable();
  }

  function initializeDataHandsontable() {
    const dataContainer = document.getElementById("spreadsheet-data");
    dataHot = new Handsontable(dataContainer, {
      data: [[], []],
      colHeaders: true,
      rowHeaders: true,
      height: "auto",
      licenseKey: "non-commercial-and-evaluation",
      minCols: 1,
      contextMenu: true,
      manualColumnResize: true,
      cells: function (row, col) {
        const cellProperties = {};
        if (row === 0) {
          cellProperties.renderer = function (
            instance,
            td,
            row,
            col,
            prop,
            value,
            cellProperties
          ) {
            Handsontable.renderers.TextRenderer.apply(this, arguments);
            td.style.fontWeight = "bold";
            td.style.textAlign = "center"; // Center-align the text
            td.className += " center-aligned"; // Add a class for additional styling if needed
          };
        }
        return cellProperties;
      },
    });
  }

  function updateDataSpreadsheet() {
    const schemaData = schemaHot.getData().filter((row) => row[0]);
    const columnCount = schemaData.length;

    // Generate alphabetical column headers
    const columnHeaders = Array.from({ length: columnCount }, (_, i) =>
      String.fromCharCode(65 + i)
    );

    dataHot.updateSettings({
      colHeaders: columnHeaders,
      columns: Array(columnCount).fill({ type: "text" }),
      minCols: columnCount,
    });

    const currentData = dataHot.getData();

    // If there's no data or less than two rows, create two empty rows
    if (currentData.length < 2) {
      const newData = [
        Array(columnCount).fill(null),
        Array(columnCount).fill(null),
      ];
      dataHot.loadData(newData);
    } else {
      // Ensure existing data has the correct number of columns
      const newData = currentData.map((row) => {
        return row
          .slice(0, columnCount)
          .concat(Array(Math.max(0, columnCount - row.length)).fill(null));
      });
      dataHot.loadData(newData);
    }
  }

  function initializeEditor() {
    editor = CodeMirror(document.getElementById("queryEditor"), {
      mode: "text/x-sql",
      theme: "material",
      lineNumbers: true,
      readOnly: false,
      viewportMargin: Infinity, // Enable auto-height
      lineWrapping: false, // Start with word wrap disabled
    });

    console.log("Editor initialized");
    // Refresh the editor to adjust its height
    setTimeout(() => editor.refresh(), 0);
  }

  // Add this function to refresh the editor's height
  function refreshEditorHeight() {
    editor.refresh();
  }

  function setupEventListeners() {
    document
      .getElementById("generateQuery")
      .addEventListener("click", handleGenerateQuery);
    document
      .getElementById("copySQL")
      .addEventListener("click", () =>
        copyToClipboard(editor.getValue(), document.getElementById("copySQL"))
      );
    document
      .getElementById("clearAll")
      .addEventListener("click", handleClearAll);
    document
      .getElementById("downloadSQL")
      .addEventListener("click", downloadSQL);
    document
      .getElementById("toggleGuide")
      .addEventListener("click", toggleGuide);
    document
      .getElementById("queryTypeSelect")
      .addEventListener("change", handleGenerateQuery);
    document
      .getElementById("toggleWordWrap")
      .addEventListener("click", toggleWordWrap);
    document
      .getElementById("simulationFillSchemaButton")
      .addEventListener("click", handleSimulationFillSchema);
    document
      .getElementById("simulationFillDataButton")
      .addEventListener("click", handleSimulationFillData);
    document
      .getElementById("simulationGenerateQueryButton")
      .addEventListener("click", handleSimulationGenerateQuery);
    document
      .getElementById("addFieldNames")
      .addEventListener("click", addFieldNamesFromSchema);
  }

  function toggleGuide() {
    const guideContent = document.getElementById("guide");
    const toggleButton = document.getElementById("toggleGuide");

    if (guideContent.classList.contains("hidden")) {
      guideContent.classList.remove("hidden");
      toggleButton.textContent = "Hide";
    } else {
      guideContent.classList.add("hidden");
      toggleButton.textContent = "Tutorial & Simulation";
    }
  }

  function handleSimulationFillSchema() {
    // Fill the table name input
    document.getElementById("tableNameInput").value = "schema_name.table_name";

    // Fill the data
    const sampleData = [
      ["TABLE_ID", "VARCHAR2(36 BYTE)", "PK", "", "1"],
      ["DESC_ID", "VARCHAR2(500 BYTE)", "PK", "", "2"],
      ["DESC_EN", "VARCHAR2(500 BYTE)", "No", "", "3"],
      ["AMOUNT", "NUMBER(15,2)", "Yes", "", "4"],
      ["SEQUENCE", "NUMBER(3,0)", "No", "", "5"],
      ["IS_ACTIVE", "NUMBER", "No", "", "6"],
      ["CREATED_TIME", "TIMESTAMP(6)", "No", "", "7"],
      ["CREATED_BY", "VARCHAR2(36 BYTE)", "No", "", "8"],
      ["UPDATED_TIME", "TIMESTAMP(6)", "No", "", "9"],
      ["UPDATED_BY", "VARCHAR2(36 BYTE)", "No", "", "10"],
    ];

    schemaHot.loadData(sampleData);
  }

  function handleSimulationFillData() {
    dataHot.loadData([
      [
        "TABLE_ID",
        "DESC_ID",
        "DESC_EN",
        "AMOUNT",
        "SEQUENCE",
        "IS_ACTIVE",
        "CREATED_TIME",
        "CREATED_BY",
        "UPDATED_TIME",
        "UPDATED_BY",
      ],
      [
        "TABLE_ID_1",
        "DESC_ID_1",
        "DESC_EN_1",
        "100000",
        "1",
        "1",
        "CREATED_TIME_1",
        "CREATED_BY_1",
        "UPDATED_TIME_1",
        "UPDATED_BY_1",
      ],
      [
        "TABLE_ID_2",
        "DESC_ID_2",
        "DESC_EN_2",
        "",
        "2",
        "1",
        "CREATED_TIME_2",
        "CREATED_BY_2",
        "UPDATED_TIME_2",
        "UPDATED_BY_2",
      ],
    ]);

    updateDataSpreadsheet();
  }

  function handleSimulationGenerateQuery() {
    // Generate the query
    handleGenerateQuery();

    // Hide the guide
    toggleGuide();
  }

  function handleClearAll() {
    // Clear the table name input
    document.getElementById("tableNameInput").value = "";

    // Reset the spreadsheet
    if (schemaHot) {
      schemaHot.updateSettings({
        data: [["", "", "", ""]],
        colHeaders: [
          "Column Name",
          "Data Type",
          "Nullable/PK",
          "Default",
          "Column Id",
          "Comments",
        ],
      });
    }

    if (dataHot) {
      dataHot.updateSettings({
        data: [[], []],
        colHeaders: true,
        minCols: 1,
      });
    }

    // Clear the query editor
    if (editor) {
      editor.setValue("");
    }

    // Clear error messages
    clearError();

    // Reset query type select
    document.getElementById("queryTypeSelect").value = "merge";
  }

  async function handleGenerateQuery() {
    const tableName = document.getElementById("tableNameInput").value.trim();
    const queryType = document.getElementById("queryTypeSelect").value;

    if (!tableName) {
      showError("Please enter a table name.");
      return;
    }

    try {
      const schemaData = schemaHot.getData().filter((row) => row[0]);
      const inputData = dataHot.getData();

      // Get field names from schema and data input
      const schemaFieldNames = schemaData.map((row) => row[0].toLowerCase());
      const dataFieldNames = inputData[0].map((field) =>
        field ? field.toLowerCase() : ""
      );

      // Find missing fields
      const missingInSchema = dataFieldNames.filter(
        (field) => field && !schemaFieldNames.includes(field)
      );
      const missingInData = schemaFieldNames.filter(
        (field) => !dataFieldNames.includes(field)
      );

      // Check if counts match and report missing fields
      if (missingInSchema.length > 0 || missingInData.length > 0) {
        let errorMessage = `Mismatch in fields. `;
        if (missingInSchema.length > 0) {
          errorMessage += `Fields in data input but not in schema: ${missingInSchema.join(
            ", "
          )}. `;
        }
        if (missingInData.length > 0) {
          errorMessage += `Fields in schema but not in data input: ${missingInData.join(
            ", "
          )}. `;
        }
        showError(errorMessage);
        return;
      }

      // Check for empty column names in data input
      const emptyColumnIndex = dataFieldNames.findIndex(
        (field) => field === ""
      );
      if (emptyColumnIndex !== -1) {
        showError(
          `Empty column name found in data input at column ${
            emptyColumnIndex + 1
          }.`
        );
        return;
      }

      // Separate field names (first row) from the actual data
      const fieldNames = inputData[0];
      const actualData = inputData
        .slice(1)
        .filter((row) => row.some((cell) => cell !== null && cell !== ""));

      // Add this check for minimum required data
      if (schemaData.length < 1 || actualData.length < 1) {
        showError(
          "Not enough data. Please input at least one row in both schema and data spreadsheets."
        );
        return;
      }

      const query = generateQuickQuery(
        tableName,
        queryType,
        schemaData,
        fieldNames,
        actualData
      );
      editor.setValue(query);
      clearError();
      refreshEditorHeight();
    } catch (error) {
      showError(`Error generating query: ${error.message}`);
    }
  }

  function generateQuickQuery(
    tableName,
    queryType,
    schemaData,
    fieldNames,
    inputData
  ) {
    console.log("Generating quick query for:", tableName);
    console.log("Query type:", queryType);
    console.log("Schema data:", schemaData);
    console.log("Field names:", fieldNames);
    console.log("Input data:", inputData);

    // Validate data
    const validationError = validateData(schemaData, fieldNames, inputData);
    if (validationError) {
      throw new Error(`Validation error: ${validationError}`);
    }

    // Find primary keys
    const primaryKeys = findPrimaryKeys(schemaData, tableName);
    console.log("Primary keys:", primaryKeys);

    // Generate query
    let query = `SET DEFINE OFF;\n\n`;

    query += generateMainQuery(
      queryType,
      tableName,
      schemaData,
      fieldNames,
      inputData,
      primaryKeys
    );

    // Generate select queries
    const selectQueries = generateSelectQueries(
      tableName,
      primaryKeys,
      schemaData,
      fieldNames,
      inputData
    );
    if (selectQueries) {
      query += selectQueries;
    }
    return query;
  }

  function validateData(schemaData, fieldNames, inputData) {
    const specialColumns = [
      "created_time",
      "updated_time",
      "created_by",
      "updated_by",
      "config_id",
      "system_config_id",
    ];

    for (let i = 0; i < fieldNames.length; i++) {
      const fieldName = fieldNames[i].toLowerCase();
      const schemaRow = schemaData.find(
        (row) => row[0].toLowerCase() === fieldName
      );

      if (!schemaRow) {
        return `Field "${fieldName}" in data input does not exist in the schema.`;
      }

      const [columnName, dataType, nullable] = schemaRow;
      if (specialColumns.includes(columnName.toLowerCase())) continue;

      if (!isValidDataType(dataType)) {
        return `Invalid data type "${dataType}" for column "${columnName}"`;
      }

      if (!["yes", "no", "pk"].includes(nullable.toLowerCase())) {
        return `Invalid nullable value "${nullable}" for column "${columnName}". Must be 'Yes', 'No', or contain 'PK'`;
      }

      for (let row of inputData) {
        const value = row[i];
        if (
          nullable.toLowerCase() === "no" &&
          (value === null || value === undefined || value === "")
        ) {
          return `NULL value not allowed for non-nullable column "${columnName}"`;
        }
        if (!isValidValueForDataType(value, dataType)) {
          return `Invalid value "${value}" for data type "${dataType}" in column "${columnName}"`;
        }
      }
    }

    return null; // No errors found
  }

  function isValidDataType(dataType) {
    const validTypes = [
      "NUMBER",
      "VARCHAR",
      "VARCHAR2",
      "DATE",
      "TIMESTAMP",
      "CHAR",
      "CLOB",
      "BLOB",
    ];
    return validTypes.some((type) => dataType.toUpperCase().startsWith(type));
  }

  function findPrimaryKeys(data, tableName) {
    console.log("Finding primary keys for:", tableName);
    console.log("Data:", data);

    // Special case for "config" tables
    if (tableName.toLowerCase().endsWith("config")) {
      const parameterKeyField = data.find(
        (field) => field[0].toLowerCase() === "parameter_key"
      );
      if (parameterKeyField) return [parameterKeyField[0]];
    }

    // Look for fields with "PK" or "pk" in the Nullable column
    const pkFields = data
      .filter((field) => field[2].toLowerCase().includes("pk"))
      .map((field) => field[0]);

    if (pkFields.length > 0) return pkFields;

    // If no primary keys found, use the first column
    console.log(
      "No explicit primary key found. Using first column:",
      data[0][0]
    );
    return [data[0][0]];
  }

  function generateMainQuery(
    queryType,
    tableName,
    schemaData,
    fieldNames,
    inputData,
    primaryKeys
  ) {
    let query = "";
    const lowercaseFieldNames = fieldNames.map((name) => name.toLowerCase());
    for (let rowData of inputData) {
      if (queryType === "insert") {
        query += generateInsertQuery(
          tableName,
          schemaData,
          lowercaseFieldNames,
          rowData
        );
      } else if (queryType === "merge") {
        query += generateMergeQuery(
          tableName,
          schemaData,
          lowercaseFieldNames,
          rowData,
          primaryKeys.map((pk) => pk.toLowerCase())
        );
      }
      query += "\n\n";
    }
    return query;
  }

  function generateInsertQuery(tableName, schemaData, fieldNames, rowData) {
    let query = `INSERT INTO ${tableName} (${fieldNames.join(
      ", "
    )}) \nVALUES (`;
    const values = fieldNames.map((fieldName, index) => {
      const schemaRow = schemaData.find(
        (row) => row[0].toLowerCase() === fieldName
      );
      return formatValue(
        rowData[index],
        schemaRow[1],
        schemaRow[2],
        tableName,
        fieldName
      );
    });
    query += values.join(", ") + ");";
    return query;
  }

  function generateMergeQuery(
    tableName,
    schemaData,
    fieldNames,
    rowData,
    primaryKeys
  ) {
    let query = `MERGE INTO ${tableName} tgt\nUSING (SELECT`;
    query += fieldNames
      .map((fieldName, index) => {
        const schemaRow = schemaData.find(
          (row) => row[0].toLowerCase() === fieldName
        );
        return `\n  ${formatValue(
          rowData[index],
          schemaRow[1],
          schemaRow[2],
          tableName,
          fieldName
        )} AS ${fieldName}`;
      })
      .join(",");
    query += `\nFROM DUAL) src\nON (${primaryKeys
      .map((pk) => `tgt.${pk.toUpperCase()} = src.${pk.toUpperCase()}`)
      .join(" AND ")})\n`;
    query += `WHEN MATCHED THEN UPDATE SET\n`;
    query += fieldNames
      .filter(
        (fieldName) =>
          !primaryKeys.map((pk) => pk.toLowerCase()).includes(fieldName) &&
          !["created_time", "created_by"].includes(fieldName)
      )
      .map((fieldName) => `  tgt.${fieldName} = src.${fieldName}`)
      .join(",\n");
    query += `\nWHEN NOT MATCHED THEN INSERT (${fieldNames.join(", ")})\n`;
    query += `VALUES (${fieldNames
      .map((fieldName) => `src.${fieldName}`)
      .join(", ")});`;
    return query;
  }

  function generateSelectQueries(
    tableName,
    primaryKeys,
    schemaData,
    fieldNames,
    inputData
  ) {
    console.log("Generating select queries for:", tableName);
    console.log("Primary keys:", primaryKeys);
    console.log("Input data:", inputData);

    let query = "";
    const lowercaseFieldNames = fieldNames.map((name) => name.toLowerCase());
    const lowercasePrimaryKeys = primaryKeys.map((pk) => pk.toLowerCase());
    const pkIndices = lowercasePrimaryKeys.map((pk) =>
      lowercaseFieldNames.indexOf(pk)
    );
    const pkValues = pkIndices.map((index) =>
      inputData.map((row) => row[index]).filter(Boolean)
    );

    console.log("PK values:", pkValues);

    if (pkValues.some((values) => values.length > 0)) {
      const selectClauses = lowercasePrimaryKeys
        .map((pk, index) => {
          const values = pkValues[index];
          if (values.length > 0) {
            const schemaRow = schemaData.find(
              (row) => row[0].toLowerCase() === pk
            );
            const formattedValues = values
              .map((value) =>
                formatValue(value, schemaRow[1], "Yes", tableName, pk)
              )
              .join(", ");
            return `${pk.toUpperCase()} IN (${formattedValues})`;
          }
          return null;
        })
        .filter(Boolean);

      const whereClause = selectClauses.join(" AND ");
      query += `\nSELECT * FROM ${tableName} WHERE ${whereClause} ORDER BY created_time ASC;`;
    } else {
      console.log("No valid primary key values found");
      query += `\n\n-- No valid primary key values found\n-- SELECT * FROM ${tableName} WHERE ...;`;
    }
    return query;
  }

  function isValidUUID(str) {
    const uuidV4Regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidV4Regex.test(str);
  }

  function formatValue(value, dataType, nullable, tableName, columnName) {
    const lowerColumnName = columnName.toLowerCase();

    // handling for created_time, updated_time, created_by, updated_by
    if (
      ["created_time", "updated_time", "created_by", "updated_by"].includes(
        lowerColumnName
      )
    ) {
      if (lowerColumnName.endsWith("_time")) {
        return "SYSDATE";
      } else {
        return "'SYSTEM'";
      }
    }

    // handling for NULL
    if (
      (value === null ||
        value.toLowerCase() === "null" ||
        value === undefined ||
        value === "") &&
      nullable.toLowerCase() === "yes"
    ) {
      return "NULL";
    }

    // Handle sequential config ID
    if (
      lowerColumnName === "config_id" &&
      dataType.toUpperCase() === "NUMBER"
    ) {
      return `(SELECT MAX(${lowerColumnName})+1 FROM ${tableName})`;
    }

    // Handle UUID for config_id
    if (
      lowerColumnName === "config_id" &&
      dataType.toUpperCase().startsWith("VARCHAR")
    ) {
      if (value.toLowerCase() === "uuid" || !isValidUUID(value)) {
        return `'${crypto.randomUUID()}'`;
      }
      // If it's already a valid UUID, return it as is
      return `'${value}'`;
    }

    // Handle sequential system config id
    if (lowerColumnName === "system_config_id") {
      return `(SELECT MAX(CAST(${lowerColumnName} AS INT))+1 FROM ${tableName})`;
    }

    // extra handling for non-nullable fields
    if (
      (value === null || value === undefined || value === "") &&
      nullable.toLowerCase() === "no"
    ) {
      throw new Error(
        `NULL value not allowed for non-nullable column in table ${tableName}`
      );
    }

    const upperDataType = dataType.toUpperCase();

    switch (true) {
      case upperDataType === "NUMBER(1,0)":
        if (value === "1" || value === "0") {
          return value;
        }
        throw new Error(
          `Invalid value for NUMBER(1,0): ${value}. Only 0 or 1 are allowed.`
        );

      case upperDataType.startsWith("VARCHAR") ||
        upperDataType.startsWith("CHAR"):
        return `'${value.replace(/'/g, "''")}'`;

      case upperDataType === "NUMBER" ||
        upperDataType.startsWith("FLOAT") ||
        upperDataType.startsWith("DECIMAL"):
        return isNaN(value) ? "NULL" : value;

      case upperDataType === "DATE":
        if (value.toUpperCase() === "SYSDATE") {
          return "SYSDATE";
        }
        return `TO_DATE('${value}', 'YYYY-MM-DD HH24:MI:SS')`;

      case upperDataType.startsWith("TIMESTAMP"):
        if (value.toUpperCase() === "SYSDATE") {
          return "SYSDATE";
        }
        return `TO_TIMESTAMP('${value}', 'YYYY-MM-DD HH24:MI:SS.FF')`;

      case upperDataType === "BOOLEAN":
        return value.toLowerCase() === "true" ? "1" : "0";

      case upperDataType === "CLOB":
        return formatCLOB(value);

      case upperDataType === "BLOB":
        return formatBLOB(value);

      default:
        console.warn(`Unhandled data type: ${dataType} for value: ${value}`);
        return `'${value}'`;
    }
  }

  function showError(message) {
    const errorMessagesDiv = document.getElementById("errorMessages");
    errorMessagesDiv.textContent = message;
    errorMessagesDiv.style.display = "block";
  }

  function clearError() {
    const errorMessagesDiv = document.getElementById("errorMessages");
    errorMessagesDiv.textContent = "";
    errorMessagesDiv.style.display = "none";
  }

  function formatCLOB(value) {
    const chunkSize = 1000;
    let result = "";
    let currentChunkSize = 0;
    let isFirstChunk = true;

    for (let i = 0; i < value.length; i++) {
      let char = value[i];

      if (char === "'" || char === "\u2018" || char === "\u2019") {
        char = "''";
      } else if (char === "\u201C" || char === "\u201D") {
        char = '"';
      }

      if (currentChunkSize + char.length > chunkSize || isFirstChunk) {
        if (!isFirstChunk) {
          result += "') || \n";
        }
        result += "to_clob('";
        currentChunkSize = 0;
        isFirstChunk = false;
      }

      result += char;
      currentChunkSize += char.length;
    }

    result += "')";
    return result;
  }

  function formatBLOB(value) {
    // Assuming value is a base64 encoded string
    return `UTL_RAW.CAST_TO_RAW('${value}')`;
  }

  function isValidValueForDataType(value, dataType) {
    if (
      value === null ||
      value === undefined ||
      value === "" ||
      value.toLowerCase() === "null"
    ) {
      return true; // Null values are checked separately
    }

    const upperDataType = dataType.toUpperCase();

    if (upperDataType === "NUMBER(1,0)") {
      return value === "0" || value === "1" || value === 0 || value === 1;
    } else if (upperDataType.startsWith("NUMBER")) {
      return !isNaN(parseFloat(value)) && isFinite(value);
    } else if (
      upperDataType.startsWith("VARCHAR2") ||
      upperDataType.startsWith("CHAR")
    ) {
      return typeof value === "string";
    } else if (
      upperDataType === "DATE" ||
      upperDataType.startsWith("TIMESTAMP")
    ) {
      return isValidDate(value);
    }

    return true; // For other data types, assume it's valid
  }

  function isValidDate(value) {
    if (value.toUpperCase() === "SYSDATE") {
      return true;
    }
    const date = new Date(value);
    return !isNaN(date.getTime());
  }

  function downloadSQL() {
    const sql = editor.getValue();
    if (!sql) {
      showError("No SQL to download. Please generate a query first.");
      return;
    }

    const tableNameInput = document.getElementById("tableNameInput");
    let tableName = tableNameInput.value.trim();

    // Sanitize the filename
    const sanitizedTableName = tableName
      .replace(/[^a-z0-9_.]/gi, "_")
      .toLowerCase();
    const filename = `${sanitizedTableName}.sql`;

    const blob = new Blob([sql], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function toggleWordWrap() {
    const wordWrapButton = document.getElementById("toggleWordWrap");
    const currentState = editor.getOption("lineWrapping");
    const newState = !currentState;

    editor.setOption("lineWrapping", newState);
    wordWrapButton.textContent = `Word Wrap: ${newState ? "On" : "Off"}`;

    // Refresh the editor to adjust its layout
    editor.refresh();
  }

  function adjustTableNameInputWidth() {
    const input = document.getElementById("tableNameInput");
    input.style.width = "auto";
    input.style.width = input.scrollWidth + 5 + "px";
  }

  adjustTableNameInputWidth();

  function addFieldNamesFromSchema() {
    const schemaData = schemaHot.getData().filter((row) => row[0]);
    const fieldNames = schemaData.map((row) => row[0]);

    // Get the current data from dataHot
    const currentData = dataHot.getData();

    // Set the first row to the field names
    if (currentData.length > 0) {
      currentData[0] = fieldNames;
    } else {
      currentData.push(fieldNames);
    }

    // Ensure there are at least two rows
    if (currentData.length < 2) {
      currentData.push(Array(fieldNames.length).fill(null));
    }

    // Update the dataHot instance with the new data
    dataHot.loadData(currentData);
  }
}
