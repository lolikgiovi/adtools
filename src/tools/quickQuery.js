import { copyToClipboard } from "../utils/buttons.js";

function retryOperation(operation, options = {}) {
  const {
    retries = 3,
    delay = 1000,
    backoff = 2,
    name = "Operation",
    onFailedAttempt = null,
  } = options;

  return new Promise((resolve, reject) => {
    let attempt = 0;

    function tryOperation() {
      operation()
        .then((result) => {
          if (attempt > 0) {
            console.log(`${name} succeeded on attempt ${attempt + 1}`);
          }
          resolve(result);
        })
        .catch((error) => {
          if (attempt < retries - 1) {
            const waitTime = delay * Math.pow(backoff, attempt);
            console.warn(
              `${name} failed, attempt ${
                attempt + 1
              }/${retries}. Retrying in ${waitTime}ms...`
            );

            if (onFailedAttempt) {
              onFailedAttempt(error, attempt + 1, retries);
            }

            attempt++;
            setTimeout(tryOperation, waitTime);
          } else {
            console.error(`${name} failed after ${retries} attempts`);
            reject(error);
          }
        });
    }

    tryOperation();
  });
}

const STORAGE_KEY = "quickquery_schemas";
const ORACLE_NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_$#]*$/;
const MAX_SCHEMA_LENGTH = 30;
const MAX_TABLE_LENGTH = 128;

// Storage Helper Functions
function parseTableIdentifier(fullTableName) {
  const [schemaName, tableName] = fullTableName.split(".");
  if (!schemaName || !tableName) {
    throw new Error(
      'Invalid table name format. Expected "schema_name.table_name"'
    );
  }
  return { schemaName, tableName };
}

function getStorageData() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return {
        schemas: {},
        lastUpdated: new Date().toISOString(),
      };
    }
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading storage:", error);
    return {
      schemas: {},
      lastUpdated: new Date().toISOString(),
    };
  }
}

function saveStorageData(data) {
  try {
    data.lastUpdated = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Error saving to storage:", error);
    return false;
  }
}

// Schema Management Functions
function saveSchema(fullTableName, schemaData) {
  try {
    const { schemaName, tableName } = parseTableIdentifier(fullTableName);
    const storageData = getStorageData();

    if (!storageData.schemas[schemaName]) {
      storageData.schemas[schemaName] = { tables: {} };
    }

    storageData.schemas[schemaName].tables[tableName] = {
      schema: schemaData,
      timestamp: new Date().toISOString(),
    };

    return saveStorageData(storageData);
  } catch (error) {
    console.error("Error saving schema:", error);
    return false;
  }
}

function loadSchema(fullTableName) {
  try {
    const { schemaName, tableName } = parseTableIdentifier(fullTableName);
    const storageData = getStorageData();
    return storageData.schemas[schemaName]?.tables[tableName]?.schema || null;
  } catch (error) {
    console.error("Error loading schema:", error);
    return null;
  }
}

function deleteSchema(fullTableName) {
  try {
    const { schemaName, tableName } = parseTableIdentifier(fullTableName);
    const storageData = getStorageData();

    if (storageData.schemas[schemaName]?.tables[tableName]) {
      delete storageData.schemas[schemaName].tables[tableName];

      if (Object.keys(storageData.schemas[schemaName].tables).length === 0) {
        delete storageData.schemas[schemaName];
      }

      return saveStorageData(storageData);
    }
    return false;
  } catch (error) {
    console.error("Error deleting schema:", error);
    return false;
  }
}

// Local Storage Query Functions
function getAllTables() {
  const storageData = getStorageData();
  const allTables = [];

  Object.entries(storageData.schemas).forEach(([schemaName, schemaData]) => {
    Object.entries(schemaData.tables).forEach(([tableName, tableData]) => {
      allTables.push({
        fullName: `${schemaName}.${tableName}`,
        schemaName,
        tableName,
        timestamp: tableData.timestamp,
      });
    });
  });

  return allTables.sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );
}

// Schema searching functions
function getByteLength(str) {
  return new TextEncoder().encode(str).length;
}

function validateOracleName(name, type = "schema") {
  if (!name) return false;

  // Check if name starts with a letter and contains only valid characters
  if (!ORACLE_NAME_REGEX.test(name)) return false;

  // Check length based on type
  const byteLength = getByteLength(name);
  if (type === "schema" && byteLength > MAX_SCHEMA_LENGTH) return false;
  if (type === "table" && byteLength > MAX_TABLE_LENGTH) return false;

  return true;
}

function sqlLikeToRegex(pattern) {
  return new RegExp(
    "^" +
      pattern
        .replace(/%/g, ".*")
        .replace(/_/g, ".")
        .replace(/\[/g, "\\[")
        .replace(/\]/g, "\\]") +
      "$",
    "i"
  );
}

function searchSavedSchemas(searchTerm) {
  const allTables = getAllTables();
  if (!searchTerm) return allTables;

  // Split into schema and table parts
  let [schemaSearch, tableSearch] = searchTerm.split(".");

  // Enhanced abbreviation function that generates multiple possible abbreviations
  function getSchemaAbbreviations(schemaName) {
    const parts = schemaName.split("_");
    const abbrs = new Set();

    // Full abbreviation (e.g., "wsb" for "wealth_secondary_bond")
    abbrs.add(parts.map((part) => part[0]?.toLowerCase()).join(""));

    // Partial abbreviations taking first two components (e.g., "ws" for "wealth_secondary_bond")
    if (parts.length > 2) {
      abbrs.add(
        parts
          .slice(0, 2)
          .map((part) => part[0]?.toLowerCase())
          .join("")
      );
    }

    // Sequential pairs of components (e.g., "ws", "sb" for "wealth_secondary_bond")
    for (let i = 0; i < parts.length - 1; i++) {
      abbrs.add(
        parts
          .slice(i, i + 2)
          .map((part) => part[0]?.toLowerCase())
          .join("")
      );
    }

    return abbrs;
  }

  function getScore(schema, table, searchTerm) {
    const termLower = searchTerm.toLowerCase();
    schema = schema.toLowerCase();
    table = table?.toLowerCase();

    // Get all possible abbreviations
    const schemaAbbrs = getSchemaAbbreviations(schema);

    if (schema === termLower) return 7; // Exact schema match
    if (table === termLower) return 6; // Exact table match
    if (schemaAbbrs.has(termLower)) return 5; // Any abbreviation match
    if (schema.startsWith(termLower)) return 4; // Schema starts with term
    if (table?.startsWith(termLower)) return 3; // Table starts with term
    if (schema.includes(termLower)) return 2; // Schema contains term
    if (table?.includes(termLower)) return 1; // Table contains term
    return 0;
  }

  // DBeaver-style search behavior
  if (!tableSearch) {
    const searchPattern = `%${schemaSearch}%`;
    const pattern = sqlLikeToRegex(searchPattern);

    return allTables
      .filter((table) => {
        const schemaAbbrs = getSchemaAbbreviations(table.schemaName);
        return (
          pattern.test(table.schemaName) ||
          pattern.test(table.tableName) ||
          schemaAbbrs.has(schemaSearch.toLowerCase())
        );
      })
      .sort((a, b) => {
        const scoreA = getScore(a.schemaName, a.tableName, schemaSearch);
        const scoreB = getScore(b.schemaName, b.tableName, schemaSearch);

        return scoreB - scoreA || a.schemaName.localeCompare(b.schemaName);
      });
  } else {
    // Table search logic with enhanced abbreviation support
    const schemaPattern = sqlLikeToRegex(`%${schemaSearch}%`);
    const tablePattern = sqlLikeToRegex(`%${tableSearch}%`);

    return allTables
      .filter((table) => {
        const schemaAbbrs = getSchemaAbbreviations(table.schemaName);
        return (
          (schemaPattern.test(table.schemaName) ||
            schemaAbbrs.has(schemaSearch.toLowerCase())) &&
          tablePattern.test(table.tableName)
        );
      })
      .sort((a, b) => {
        const schemaAbbrsA = getSchemaAbbreviations(a.schemaName);
        const schemaAbbrsB = getSchemaAbbreviations(b.schemaName);

        const schemaMatchA =
          schemaSearch.toLowerCase() === a.schemaName.toLowerCase() ||
          schemaAbbrsA.has(schemaSearch.toLowerCase());
        const schemaMatchB =
          schemaSearch.toLowerCase() === b.schemaName.toLowerCase() ||
          schemaAbbrsB.has(schemaSearch.toLowerCase());

        if (schemaMatchA !== schemaMatchB) return schemaMatchB ? 1 : -1;

        const tableMatchA =
          tableSearch.toLowerCase() === a.tableName.toLowerCase();
        const tableMatchB =
          tableSearch.toLowerCase() === b.tableName.toLowerCase();

        return tableMatchA ? -1 : tableMatchB ? 1 : 0;
      });
  }
}

function setupTableNameSearch(parent) {
  const {
    schemaTable,
    dataTable,
    updateDataSpreadsheet,
    handleAddFieldNames,
    clearError,
  } = parent;

  const tableNameInput = document.getElementById("tableNameInput");

  // Disable browser's default suggestions
  tableNameInput.setAttribute("autocomplete", "off");
  tableNameInput.setAttribute("autocorrect", "off");
  tableNameInput.setAttribute("autocapitalize", "off");
  tableNameInput.setAttribute("spellcheck", "false");

  // Create a container div and wrap it around the input
  const container = document.createElement("div");
  container.className = "table-search-container";
  tableNameInput.parentNode.insertBefore(container, tableNameInput);
  container.appendChild(tableNameInput);

  // Create dropdown container
  const dropdownContainer = document.createElement("div");
  dropdownContainer.className = "table-search-dropdown";
  dropdownContainer.style.display = "none";
  container.appendChild(dropdownContainer);

  // Keep track of selected item
  let selectedIndex = -1;
  let visibleItems = [];

  function showDropdown(results) {
    dropdownContainer.innerHTML = "";
    visibleItems = [];
    selectedIndex = -1;

    if (results.length === 0) {
      dropdownContainer.style.display = "none";
      return;
    }

    const groupedResults = results.reduce((groups, table) => {
      if (!groups[table.schemaName]) {
        groups[table.schemaName] = [];
      }
      groups[table.schemaName].push(table);
      return groups;
    }, {});

    Object.entries(groupedResults).forEach(([schemaName, tables]) => {
      const schemaGroup = document.createElement("div");
      schemaGroup.className = "schema-group";

      const schemaHeader = document.createElement("div");
      schemaHeader.className = "schema-header";
      schemaHeader.textContent = schemaName;
      schemaGroup.appendChild(schemaHeader);

      tables.forEach((table) => {
        const item = document.createElement("div");
        item.className = "search-result-item";
        item.textContent = table.tableName;

        // Store the full table name for easy access
        item.dataset.fullName = table.fullName;

        // Add to visible items array for keyboard navigation
        visibleItems.push(item);

        item.addEventListener("click", function () {
          selectResult(table.fullName);
        });

        schemaGroup.appendChild(item);
      });

      dropdownContainer.appendChild(schemaGroup);
    });

    dropdownContainer.style.display = "block";
  }

  function selectResult(fullName) {
    // Set the input value
    tableNameInput.value = fullName;
    dropdownContainer.style.display = "none";

    // Load the schema if it exists
    const schema = loadSchema(fullName);
    if (schema) {
      parent.schemaTable.loadData(schema);
      parent.dataTable.loadData([[], []]);
      parent.updateDataSpreadsheet();
      parent.handleAddFieldNames();
      parent.clearError();
    }

    // Reset selection
    selectedIndex = -1;
    tableNameInput.focus();
  }

  function updateSelection() {
    visibleItems.forEach((item, index) => {
      if (index === selectedIndex) {
        item.classList.add("selected");
        item.scrollIntoView({ block: "nearest" });
      } else {
        item.classList.remove("selected");
      }
    });
  }

  function handleKeyDown(event) {
    if (
      dropdownContainer.style.display === "none" &&
      event.key === "ArrowDown"
    ) {
      // If dropdown is hidden and down arrow is pressed, show recent items
      const results = searchSavedSchemas("").slice(0, 7); // Get 7 most recent
      showDropdown(results);
      selectedIndex = -1;
      return;
    }

    if (dropdownContainer.style.display === "block") {
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          selectedIndex = Math.min(selectedIndex + 1, visibleItems.length - 1);
          updateSelection();
          break;

        case "ArrowUp":
          event.preventDefault();
          selectedIndex = Math.max(selectedIndex - 1, -1);
          updateSelection();
          break;

        case "Enter":
          event.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < visibleItems.length) {
            selectResult(visibleItems[selectedIndex].dataset.fullName);
          }
          break;

        case "Escape":
          dropdownContainer.style.display = "none";
          selectedIndex = -1;
          break;
      }
    }
  }

  function handleInput(event) {
    const input = event.target.value.trim();

    // Clear any previous error styling
    tableNameInput.style.borderColor = "";

    if (!input) {
      // Show recent items if input is empty
      const results = searchSavedSchemas("").slice(0, 7); // Get 7 most recent
      showDropdown(results);
      return;
    }

    const parts = input.split(".");

    // Validate each part
    if (parts.length > 1) {
      const [schema, table] = parts;
      const isValidSchema = validateOracleName(schema, "schema");
      const isValidTable = table ? validateOracleName(table, "table") : true;

      if (!isValidSchema || !isValidTable) {
        tableNameInput.style.borderColor = "red";
        dropdownContainer.style.display = "none";
        return;
      }
    } else {
      const isValidSchema = validateOracleName(parts[0], "schema");
      if (!isValidSchema) {
        tableNameInput.style.borderColor = "red";
        dropdownContainer.style.display = "none";
        return;
      }
    }

    const results = searchSavedSchemas(input);
    showDropdown(results);
  }

  // Event Listeners
  tableNameInput.addEventListener("input", handleInput);
  tableNameInput.addEventListener("keydown", handleKeyDown);

  // Close dropdown when clicking outside
  document.addEventListener("click", (event) => {
    if (!container.contains(event.target)) {
      dropdownContainer.style.display = "none";
      selectedIndex = -1;
    }
  });
}

export function initQuickQuery(container, updateHeaderTitle) {
  const parent = {
    schemaTable: null,
    dataTable: null,
    updateDataSpreadsheet: null,
    handleAddFieldNames: null,
    clearError: null,
  };

  // Business Logics
  function initializeSchemaTable() {
    const schemaContainer = document.getElementById("spreadsheet-schema");
    const data = [["", "", "", ""]];
    schemaTable = new Handsontable(schemaContainer, {
      data: data,
      colHeaders: [
        "Field Name",
        "Data Type",
        "Nullable/PK",
        "Default",
        "Field Order",
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
            callback(
              [
                "Yes",
                "No",
                "PK",
                "yes",
                "no",
                "pk",
                "Yes",
                "No",
                "Pk",
                "Y",
                "N",
                "y",
                "n",
              ].includes(value)
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
            Handsontable.renderers.DropdownRenderer.apply(this, arguments);
            td.style.textAlign = "center";
          },
        },
        {}, // Default
        {
          // Field Order
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
      minRows: 1,
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

    parent.schemaTable = schemaTable;

    initializeDataTable();
  }

  function initializeDataTable() {
    const dataContainer = document.getElementById("spreadsheet-data");
    dataTable = new Handsontable(dataContainer, {
      data: [[], []],
      colHeaders: true,
      rowHeaders: true,
      height: "auto",
      licenseKey: "non-commercial-and-evaluation",
      minCols: 1,
      contextMenu: true,
      manualColumnResize: true,
      stretchH: "none", // allow horizontal scroll
      className: "hide-scrollbar", //custom css class to hide scroll
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
            td.style.textAlign = "center";
          };
        }
        return cellProperties;
      },
    });

    parent.dataTable = dataTable;
  }

  function updateDataSpreadsheet() {
    const schemaData = schemaTable.getData().filter((row) => row[0]);
    const columnCount = schemaData.length;

    // Generate alphabetical field headers
    const columnHeaders = Array.from({ length: columnCount }, (_, i) =>
      String.fromCharCode(65 + i)
    );

    dataTable.updateSettings({
      colHeaders: columnHeaders,
      columns: Array(columnCount).fill({ type: "text" }),
      minCols: columnCount,
    });

    const currentData = dataTable.getData();

    // If there's no data or less than two rows, create two empty rows
    if (currentData.length < 2) {
      const newData = [
        Array(columnCount).fill(null),
        Array(columnCount).fill(null),
      ];
      dataTable.loadData(newData);
    } else {
      // Ensure existing data has the correct number of columns
      const newData = currentData.map((row) => {
        return row
          .slice(0, columnCount)
          .concat(Array(Math.max(0, columnCount - row.length)).fill(null));
      });
      dataTable.loadData(newData);
    }
  }
  parent.updateDataSpreadsheet = updateDataSpreadsheet;

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

  // Event Handlers
  function handleAddDataRow() {
    const currentData = dataTable.getData();
    const schemaData = schemaTable.getData().filter((row) => row[0]);
    const columnCount = schemaData.length;
    const newRow = Array(columnCount).fill(null);
    const newData = [...currentData, newRow];
    dataTable.loadData(newData);
  }

  function handleRemoveDataRow() {
    // Get current data
    const currentData = dataTable.getData();

    // Remove the last row
    const newData = currentData.slice(0, -1);

    // Load the new data into the table
    dataTable.loadData(newData);
  }

  function handleAddNewSchemaRow() {
    const currentData = schemaTable.getData();
    const newRow = Array(6).fill(null);
    const newData = [...currentData, newRow];
    schemaTable.loadData(newData);
  }

  function handleRemoveLastSchemaRow() {
    const currentData = schemaTable.getData();
    const newData = currentData.slice(0, -1);
    schemaTable.loadData(newData);
  }

  function handleToggleGuide() {
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
      ["TABLE_ID", "VARCHAR2(36)", "PK", "", "1"],
      ["DESC_ID", "VARCHAR2(500)", "PK", "", "2"],
      ["DESC_EN", "VARCHAR2(500)", "No", "", "3"],
      ["AMOUNT", "NUMBER(15,2)", "Yes", "", "4"],
      ["SEQUENCE", "NUMBER(3,0)", "No", "", "5"],
      ["IS_ACTIVE", "NUMBER", "No", "", "6"],
      ["CREATED_TIME", "TIMESTAMP(6)", "No", "", "7"],
      ["CREATED_BY", "VARCHAR2(36)", "No", "", "8"],
      ["UPDATED_TIME", "TIMESTAMP(6)", "No", "", "9"],
      ["UPDATED_BY", "VARCHAR2(36)", "No", "", "10"],
    ];

    schemaTable.loadData(sampleData);
  }

  function handleSimulationFillData() {
    dataTable.loadData([
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

  // function handleSimulationFillSchema() {
  //   // Fill the table name input with a complex case
  //   document.getElementById("tableNameInput").value = "edge_Test.TABLE_123";

  //   // Edge test cases for schema
  //   const testSchema = [
  //     // Test case: Mixed case field names and special characters
  //     ["Field_NAME_1", "VARCHAR2(50)", "PK", "", "1", "Test PK field"],

  //     // Test case: Number field with maximum precision and scale
  //     ["amount_2", "NUMBER(38,10)", "No", "0", "2", "Max Oracle number"],

  //     // Test case: Nullable field with default
  //     ["description", "VARCHAR2(4000)", "Yes", "'N/A'", "3", "Max VARCHAR2"],

  //     // Test case: Boolean/Flag field
  //     ["is_active_FLAG", "NUMBER(1,0)", "No", "1", "4", "Boolean field"],

  //     // Test case: Reserved word as field name
  //     ["\"TABLE\"", "VARCHAR2(100)", "No", "", "5", "Reserved word"],

  //     // Test case: Timestamp with timezone
  //     ["event_time", "TIMESTAMP(9) WITH TIME ZONE", "No", "SYSDATE", "6", "Max precision"],

  //     // Test case: CLOB type
  //     ["large_text", "CLOB", "Yes", "", "7", "CLOB field"]
  //   ];

  //   schemaTable.loadData(testSchema);
  // }

  // function handleSimulationFillData() {
  //   // Test data with edge cases
  //   const testData = [
  //     // Header row - mixed case and special characters
  //     ["Field_NAME_1", "amount_2", "description", "is_active_FLAG", "\"TABLE\"", "event_time", "large_text"],

  //     // Row 1: Testing maximum values and special cases
  //     [
  //       "ABC123!@#$", // PK with special chars
  //       "12345678901234567890.1234567890", // Large number
  //       "This is a very long text string that tests the VARCHAR2 limit...", // Long text
  //       "1", // Boolean true
  //       "DROP TABLE", // SQL keyword
  //       "2024-12-31 23:59:59.999999999 +00:00", // Max timestamp
  //       "Very long CLOB text..." // CLOB content
  //     ],

  //     // Row 2: Testing minimum/edge values
  //     [
  //       "", // Empty PK (should trigger error)
  //       "-0.00000000001", // Small negative number
  //       "", // Empty nullable field
  //       "0", // Boolean false
  //       "", // Empty reserved word field
  //       "", // Empty timestamp (should use SYSDATE)
  //       "" // Empty CLOB
  //     ],

  //     // Row 3: Testing special characters and formats
  //     [
  //       "PK''QUOTE", // Single quote in PK
  //       "1,234.56", // Number with comma
  //       "Line1\nLine2", // Text with newline
  //       "2", // Invalid boolean (should trigger error)
  //       "TABLE;DROP", // Semicolon in text
  //       "01-JAN-24", // Different date format
  //       "<?xml version=\"1.0\"?><root>TEST</root>" // XML in CLOB
  //     ]
  //   ];

  //   dataTable.loadData(testData);
  //   updateDataSpreadsheet();
  // }

  function handleSimulationGenerateQuery() {
    // Generate the query
    handleGenerateQuery();

    // Hide the guide
    handleToggleGuide();
  }

  function handleDownloadSql() {
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

  function handleToggleWordWrap() {
    const wordWrapButton = document.getElementById("toggleWordWrap");
    const currentState = editor.getOption("lineWrapping");
    const newState = !currentState;

    editor.setOption("lineWrapping", newState);
    wordWrapButton.textContent = `Word Wrap: ${newState ? "On" : "Off"}`;

    // Refresh the editor to adjust its layout
    editor.refresh();
  }

  function handleAddFieldNames() {
    const schemaData = schemaTable.getData().filter((row) => row[0]);
    const fieldNames = schemaData.map((row) => row[0]);

    // Get the current data from dataTable
    const currentData = dataTable.getData();

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

    // Update the dataTable instance with the new data
    dataTable.loadData(currentData);
  }
  parent.handleAddFieldNames = handleAddFieldNames;

  function handleClearAll() {
    // Clear the table name input
    document.getElementById("tableNameInput").value = "";

    // Reset the spreadsheet
    if (schemaTable) {
      schemaTable.updateSettings({
        data: [["", "", "", ""]],
        colHeaders: [
          "Field Name",
          "Data Type",
          "Nullable/PK",
          "Default",
          "Field Order",
          "Comments",
        ],
      });
    }

    if (dataTable) {
      dataTable.updateSettings({
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
    try {
      // Get input data
      const tableName = document.getElementById("tableNameInput").value.trim();
      const queryType = document.getElementById("queryTypeSelect").value;

      // Get schema data (removing empty rows)
      const schemaData = schemaTable.getData().filter((row) => row[0]);

      // Get input data (all rows including headers)
      const inputData = dataTable.getData();

      // Handle empty table name
      if (!tableName) {
        throw new Error("Please fill in schema_name.table_name.");
      }

      // Table name format warning (not blocking)
      if (!tableName.includes(".")) {
        throw new Error(
          "Table name format should be 'schema_name.table_name'."
        );
      }

      // Generate the query
      const query = generateQuery(tableName, queryType, schemaData, inputData);

      // Update editor with generated query
      editor.setValue(query);
      clearError();
    } catch (error) {
      showError(error.message);
      editor.setValue("");
    }
  }

  // Non Event Handlers but Impacting UI
  function showError(message) {
    const errorMessagesDiv = document.getElementById("errorMessages");
    errorMessagesDiv.innerHTML = message;
    errorMessagesDiv.style.display = "block";
  }

  function showWarning(message) {
    const warningMessagesDiv = document.getElementById("warningMessages");
    warningMessagesDiv.innerHTML = message;
    warningMessagesDiv.style.display = "block";
    warningMessagesDiv.style.color = "orange";
  }

  function clearError() {
    const errorMessagesDiv = document.getElementById("errorMessages");
    const warningMessagesDiv = document.getElementById("warningMessages");
    errorMessagesDiv.textContent = "";
    warningMessagesDiv.textContent = "";
    errorMessagesDiv.style.display = "none";
    warningMessagesDiv.style.display = "none";
  }
  parent.clearError = clearError;

  // Schema Management Functions
  function createSchemaOverlay() {
    // Get elements
    const overlay = document.getElementById("schemaOverlay");
    const closeButton = document.getElementById("closeSchemaOverlay");
    const showButton = document.getElementById("showSavedSchemas");
    const exportButton = document.getElementById("exportSchemas");
    const clearAllButton = document.getElementById("clearAllSchemas");

    // Show overlay
    showButton.addEventListener("click", () => {
      overlay.classList.remove("hidden");
      updateSavedSchemasList();
    });

    // Close overlay
    closeButton.addEventListener("click", () => {
      overlay.classList.add("hidden");
    });

    // Close on click outside modal
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.classList.add("hidden");
      }
    });

    // Export button
    exportButton.addEventListener("click", () => {
      const allTables = getAllTables();
      if (allTables.length === 0) {
        showError("No schemas to export");
        return;
      }
      exportSchemas();
    });

    // Clear All button
    clearAllButton.addEventListener("click", () => {
      const allTables = getAllTables();
      if (allTables.length === 0) {
        showError("No schemas to clear");
        return;
      }

      if (
        confirm(
          "Are you sure you want to clear all saved schemas? This cannot be undone."
        )
      ) {
        clearAllSchemas();
      }
    });

    // Set up import functionality
    setupSchemaImport();
  }

  function updateSavedSchemasList() {
    const schemasList = document.getElementById("savedSchemasList");
    const allTables = getAllTables();

    if (allTables.length === 0) {
      schemasList.innerHTML = '<div class="no-schemas">No saved schemas</div>';
      return;
    }

    // Group by schema
    const groupedTables = allTables.reduce((groups, table) => {
      if (!groups[table.schemaName]) {
        groups[table.schemaName] = [];
      }
      groups[table.schemaName].push(table);
      return groups;
    }, {});

    // Clear existing content
    schemasList.innerHTML = "";

    // Create and append elements
    Object.entries(groupedTables).forEach(([schemaName, tables]) => {
      const groupDiv = document.createElement("div");
      groupDiv.className = "schema-group";

      const headerDiv = document.createElement("div");
      headerDiv.className = "schema-group-header";
      headerDiv.textContent = schemaName;
      groupDiv.appendChild(headerDiv);

      tables.forEach((table) => {
        const itemDiv = document.createElement("div");
        itemDiv.className = "schema-item";

        const infoDiv = document.createElement("div");
        infoDiv.className = "schema-info";

        const nameDiv = document.createElement("div");
        nameDiv.className = "schema-name";
        nameDiv.textContent = table.tableName;

        const timestampDiv = document.createElement("div");
        timestampDiv.className = "schema-timestamp";
        timestampDiv.textContent = new Date(table.timestamp).toLocaleString();

        infoDiv.appendChild(nameDiv);
        infoDiv.appendChild(timestampDiv);

        const actionsDiv = document.createElement("div");
        actionsDiv.className = "schema-actions";

        // Load button
        const loadBtn = document.createElement("button");
        loadBtn.textContent = "Load";
        loadBtn.addEventListener("click", () =>
          handleLoadSchema(table.fullName)
        );

        // Delete button
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", () =>
          handleDeleteSchema(table.fullName)
        );

        actionsDiv.appendChild(loadBtn);
        actionsDiv.appendChild(deleteBtn);

        itemDiv.appendChild(infoDiv);
        itemDiv.appendChild(actionsDiv);
        groupDiv.appendChild(itemDiv);
      });

      schemasList.appendChild(groupDiv);
    });
  }

  function handleLoadSchema(fullName) {
    const schema = loadSchema(fullName);
    if (schema) {
      document.getElementById("tableNameInput").value = fullName;
      schemaTable.loadData(schema);
      dataTable.loadData([[], []]);
      updateDataSpreadsheet();
      handleAddFieldNames();

      // Close the overlay after loading
      document.getElementById("schemaOverlay").classList.add("hidden");

      // Clear any existing error messages
      clearError();
    } else {
      showError(`Failed to load schema for ${fullName}`);
    }
  }

  function handleDeleteSchema(fullName) {
    if (confirm(`Delete schema for ${fullName}?`)) {
      const deleted = deleteSchema(fullName);
      if (deleted) {
        updateSavedSchemasList();

        // If the deleted schema was the current one, clear the input
        const currentTable = document.getElementById("tableNameInput").value;
        if (currentTable === fullName) {
          handleClearAll();
        }
      } else {
        showError(`Failed to delete schema for ${fullName}`);
      }
    }
  }

  function clearAllSchemas() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      updateSavedSchemasList();
      showError("All saved schemas have been cleared");

      // If current schema is loaded, clear it too
      handleClearAll();

      return true;
    } catch (error) {
      console.error("Error clearing schemas:", error);
      showError("Failed to clear schemas");
      return false;
    }
  }

  function setupSchemaImport() {
    const importButton = document.getElementById("importSchemas");
    const fileInput = document.getElementById("schemaFileInput");

    importButton.addEventListener("click", () => {
      fileInput.click();
    });

    fileInput.addEventListener("change", async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const jsonData = JSON.parse(text);

        // Validate schema format
        if (!isValidSchemaFormat(jsonData)) {
          throw new Error("Invalid schema format");
        }

        // Import schemas
        let importCount = 0;

        // Process each schema and its tables
        Object.entries(jsonData).forEach(([schemaName, tables]) => {
          Object.entries(tables).forEach(([tableName, schema]) => {
            const fullTableName = `${schemaName}.${tableName}`;
            if (saveSchema(fullTableName, schema)) {
              importCount++;
            }
          });
        });

        // Update UI
        updateSavedSchemasList();
        showError(`Successfully imported ${importCount} table schemas`);
        // clear after 3 seconds
        setTimeout(() => clearError(), 3000);
      } catch (error) {
        showError(`Failed to import schemas: ${error.message}`);
      } finally {
        fileInput.value = ""; // Reset file input
      }
    });
  }

  function isValidSchemaFormat(data) {
    if (!data || typeof data !== "object") return false;

    return Object.entries(data).every(([schemaName, tables]) => {
      if (typeof tables !== "object") return false;

      return Object.entries(tables).every(([tableName, schema]) => {
        return (
          Array.isArray(schema) &&
          schema.every(
            (row) =>
              Array.isArray(row) &&
              row.length >= 3 && // At least name, type, and nullable
              typeof row[0] === "string" &&
              typeof row[1] === "string" &&
              typeof row[2] === "string"
          )
        );
      });
    });
  }

  function exportSchemas() {
    const allTables = getAllTables();
    const exportData = {};

    // Group by schema and table
    allTables.forEach((table) => {
      const schema = loadSchema(table.fullName);
      if (schema) {
        // Initialize schema if needed
        if (!exportData[table.schemaName]) {
          exportData[table.schemaName] = {};
        }

        // Add table schema
        exportData[table.schemaName][table.tableName] = schema;
      }
    });

    // Create and download file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "quick_query_saved_schemas.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Quick Query Functions
  function adjustDbeaverSchema(schemaData) {
    // Check if it's a DBeaver schema format
    console.log("Adjusting schema data");

    // Remove the header row
    const removedHeader = schemaData.slice(1);

    // Transform the data
    const adjustedSchemaData = removedHeader.map((row) => {
      // Original DBeaver format:
      // [0]: Column Name
      // [1]: Column Type
      // [2]: Type Name
      // [3]: Column Size
      // [4]: Nullable
      // [5]: Default Value
      // [6]: Comments

      // Transform nullable from TRUE/FALSE to No/Yes
      const nullable = String(row[4]).toLowerCase() === "true" ? "No" : "Yes";

      // Transform [NULL] to empty string
      const defaultValue = row[5] === "[NULL]" ? "" : row[5];

      return [
        row[0], // [0] Field Name (same as Column Name)
        row[2], // [1] Data Type (use Type Name instead of Column Type)
        nullable, // [2] Nullable/PK
        defaultValue, // [3] Default Value
        row[1] || "", // [4] Field Order (use Column Type as order)
        row[6] || "", // [5] Comments
      ];
    });

    // Update the schemaTable with the new data
    if (schemaTable && typeof schemaTable.loadData === "function") {
      try {
        // Clear existing data and load new data
        schemaTable.loadData(adjustedSchemaData);
        updateDataSpreadsheet();
      } catch (error) {
        console.error("Error updating schema table:", error);
      }
    }
  }

  function validateSchema(schemaData) {
    // Check for empty schema
    if (schemaData.length === 0) {
      throw new Error(
        "Schema Validation Error:<br>Please fill in the schema (see the left panel)."
      );
    }

    // Check for DBeaver format
    if (schemaData[0][0] === "Column Name") {
      adjustDbeaverSchema(schemaData);
      showWarning("Schema data adjusted from DBeaver to SQL Developer format.");
      setTimeout(() => clearError(), 3000);
      return true;
    }

    // Track invalid entries
    const invalidDataTypes = [];
    const invalidNullableValues = [];

    // Validate each row in the schema once
    schemaData.forEach((row) => {
      const [fieldName, dataType, nullable] = row;

      // Validate data type
      if (!isValidOracleDataType(dataType)) {
        invalidDataTypes.push(`${dataType} (in field ${fieldName})`);
      }

      // Validate nullable values
      if (!isValidNullableDataType(nullable)) {
        invalidNullableValues.push(`${nullable} (in field ${fieldName})`);
      }
    });

    // Build error message if any validations failed
    if (invalidDataTypes.length > 0 || invalidNullableValues.length > 0) {
      const errors = [];

      if (invalidDataTypes.length > 0) {
        errors.push(
          `Invalid Oracle SQL Data Types: ${invalidDataTypes.join(", ")}`
        );
      }

      if (invalidNullableValues.length > 0) {
        errors.push(
          `Invalid nullable values: ${invalidNullableValues.join(
            ", "
          )}. Must be 'Yes', 'No', or 'PK'`
        );
      }

      throw new Error(`Schema Validation Error:<br>${errors.join("<br>")}`);
    }

    return true;
  }

  function isValidOracleDataType(dataType) {
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

  function isValidNullableDataType(nullable) {
    const validValues = [
      "Yes",
      "No",
      "PK",
      "yes",
      "no",
      "pk",
      "Y",
      "N",
      "y",
      "n",
    ];
    return validValues.includes(nullable);
  }

  function matchSchemaWithData(schemaData, inputData) {
    const hasSchemaData = schemaData.some((row) =>
      row.some((cell) => cell !== null && cell !== "")
    );
    const hasFieldNames = inputData[0]?.some(
      (cell) => cell !== null && cell !== ""
    );
    const hasFirstDataRow = inputData[1]?.some(
      (cell) => cell !== null && cell !== ""
    );

    if (!hasSchemaData || !hasFieldNames || !hasFirstDataRow) {
      throw new Error(
        "Incomplete data. Please fill in both schema and data sheets."
      );
    }

    const schemaFieldNames = schemaData.map((row) => row[0].toLowerCase());
    const inputFieldNames = inputData[0].map((field) => field?.toLowerCase());

    // Check for empty field names in data input
    const emptyColumnIndex = inputFieldNames.findIndex((field) => !field);
    if (emptyColumnIndex !== -1) {
      throw new Error(
        `Field Name Error:<br>Empty field name found in data input at column ${
          emptyColumnIndex + 1
        }`
      );
    }

    // Find mismatches in both directions
    const missingInSchema = inputFieldNames.filter(
      (field) => !schemaFieldNames.includes(field)
    );
    const missingInData = schemaFieldNames.filter(
      (field) => !inputFieldNames.includes(field)
    );

    if (missingInSchema.length > 0 || missingInData.length > 0) {
      const errors = [];
      if (missingInSchema.length > 0) {
        errors.push(
          `Fields in data but not in schema: ${missingInSchema.join(", ")}`
        );
      }
      if (missingInData.length > 0) {
        errors.push(
          `Fields in schema but not in data: ${missingInData.join(", ")}`
        );
      }
      throw new Error(`Field Mismatch Error:<br>${errors.join("<br>")}`);
    }

    return true;
  }

  function generateQuery(tableName, queryType, schemaData, inputData) {
    // 1. Validate schema
    validateSchema(schemaData);
    console.log("Schema validated");
    saveSchema(tableName, schemaData); // Save schema to local storage

    // 2. Match schema and data fields
    matchSchemaWithData(schemaData, inputData);
    console.log("Schema and data fields matched");

    // 3. Get field names from first row of input data
    const fieldNames = inputData[0].map((name) => name.toLowerCase());
    console.log("Field names extracted");

    // 4. Get data rows (excluding header row)
    const dataRows = inputData
      .slice(1)
      .filter((row) => row.some((cell) => cell !== null && cell !== ""));
    console.log("Data rows extracted");

    const schemaMap = new Map(
      schemaData.map((row) => [row[0].toLowerCase(), row])
    );

    // 5. Process each row of data
    const processedRows = dataRows.map((rowData, rowIndex) => {
      try {
        // Process each field in the row
        return fieldNames.map((fieldName, colIndex) => {
          const schemaRow = schemaMap.get(fieldName.toLowerCase()); // Get schema row by field name

          if (!schemaRow) {
            throw new Error(
              `Schema definition not found for field "${fieldName}"`
            );
          }

          const [, dataType, nullable] = schemaRow;
          const value = rowData[colIndex];

          // Process the value based on data type
          return {
            fieldName,
            formattedValue: processValue(
              value,
              dataType,
              nullable,
              fieldName,
              tableName
            ),
          };
        });
      } catch (error) {
        throw new Error(`Row ${rowIndex + 2}: ${error.message}`);
      }
    });

    console.log("Data processed", processedRows);

    // 6. Find primary keys for MERGE statements
    const primaryKeys = findPrimaryKeys(schemaData, tableName);
    console.log("Primary keys found:", primaryKeys);

    // 7. Generate SQL based on query type
    let query = `SET DEFINE OFF;\n\n`;

    if (queryType === "insert") {
      processedRows.forEach((processedFields) => {
        query += generateInsertStatement(tableName, processedFields);
        query += "\n\n";
      });
    } else {
      processedRows.forEach((processedFields) => {
        query += generateMergeStatement(
          tableName,
          processedFields,
          primaryKeys
        );
        query += "\n\n";
      });
    }

    // 8. Add select query to verify results
    const selectQuery = generateSelectStatement(
      tableName,
      primaryKeys,
      processedRows
    );

    if (selectQuery) {
      query += selectQuery;
    }

    return query;
  }

  function generateInsertStatement(tableName, processedFields) {
    const fields = processedFields.map((f) => formatFieldName(f.fieldName));
    const values = processedFields.map((f) => f.formattedValue);

    return `INSERT INTO ${tableName} (${fields.join(
      ", "
    )}) \nVALUES (${values.join(", ")});`;
  }

  function generateMergeStatement(tableName, processedFields, primaryKeys) {
    // Format fields for SELECT part
    const selectFields = processedFields
      .map((f) => `\n  ${f.formattedValue} AS ${formatFieldName(f.fieldName)}`)
      .join(",");

    // Format ON conditions for primary keys
    const pkConditions = primaryKeys
      .map((pk) => `tgt.${formatFieldName(pk)} = src.${formatFieldName(pk)}`)
      .join(" AND ");

    // Format UPDATE SET clause (excluding PKs and creation fields)
    const updateFields = processedFields
      .filter(
        (f) =>
          !primaryKeys.includes(f.fieldName) &&
          !["created_time", "created_by"].includes(f.fieldName)
      )
      .map(
        (f) =>
          `  tgt.${formatFieldName(f.fieldName)} = src.${formatFieldName(
            f.fieldName
          )}`
      )
      .join(",\n");

    // Format INSERT fields and values
    const insertFields = processedFields
      .map((f) => formatFieldName(f.fieldName))
      .join(", ");
    const insertValues = processedFields
      .map((f) => `src.${formatFieldName(f.fieldName)}`)
      .join(", ");

    return `MERGE INTO ${tableName} tgt\nUSING (SELECT${selectFields}\n  FROM DUAL) src\nON (${pkConditions})\nWHEN MATCHED THEN UPDATE SET\n${updateFields}\nWHEN NOT MATCHED THEN INSERT (${insertFields})\nVALUES (${insertValues});`;
  }

  function generateSelectStatement(tableName, primaryKeys, processedRows) {
    if (primaryKeys.length === 0) return null;
    if (processedRows.length === 0) return null;

    // Collect formatted values for each primary key
    const pkValueMap = new Map(
      primaryKeys.map((pk) => [pk.toLowerCase(), new Set()])
    );

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
        whereConditions.push(
          `${formatFieldName(pkName)} IN (${Array.from(values).join(", ")})`
        );
      }
    });

    // If no valid PK values found, return null
    if (whereConditions.length === 0) return null;

    return `\nSELECT * FROM ${tableName} WHERE ${whereConditions.join(
      " AND "
    )} ORDER BY created_time ASC;`;
  }

  function processValue(value, dataType, nullable, fieldName, tableName) {
    // Constants
    const AUDIT_FIELDS = {
      time: ["created_time", "updated_time"],
      by: ["created_by", "updated_by"],
    };

    // Handle audit fields
    if (AUDIT_FIELDS.time.includes(fieldName)) {
      const hasNoValue = !value;
      const hasNoTimestampCharacters = !/[-/]/.test(value);
      return hasNoValue || hasNoTimestampCharacters
        ? "SYSDATE"
        : formatTimestamp(value);
    }

    if (AUDIT_FIELDS.by.includes(fieldName)) {
      return value?.trim() ? `'${value.replace(/'/g, "''")}'` : "'SYSTEM'";
    }

    // Handle NULL values
    const isNullValue =
      value === null ||
      value === undefined ||
      value === "" ||
      value?.toLowerCase() === "null";
    if (isNullValue) {
      if (nullable?.toLowerCase() !== "yes") {
        throw new Error(
          `NULL value not allowed for non-nullable field "${fieldName}"`
        );
      }
      return "NULL";
    }

    // Handle special ID fields
    const upperDataType = dataType.toUpperCase();

    // Config ID with NUMBER type, OR field ends with _id BUT NOT rule_id
    if (
      (fieldName === "config_id" || fieldName.endsWith("_id")) &&
      upperDataType === "NUMBER" &&
      fieldName !== "rule_id"
    ) {
      return `(SELECT MAX(${fieldName})+1 FROM ${tableName})`;
    }

    // Config ID with VARCHAR type
    if (fieldName === "config_id" && upperDataType.startsWith("VARCHAR")) {
      if (value.toLowerCase() === "uuid" || !isValidUUID(value)) {
        return `'${crypto.randomUUID()}'`;
      }
      return `'${value}'`;
    }

    // System config ID
    if (fieldName === "system_config_id") {
      return `(SELECT MAX(CAST(${fieldName} AS INT))+1 FROM ${tableName})`;
    }

    // Process regular values based on data type
    const fieldDataType = parseDataType(dataType);

    switch (fieldDataType.type) {
      case "NUMBER":
        // NUMBER(1,0) / boolean number
        if (fieldDataType.precision === 1 && fieldDataType.scale === 0) {
          if (value !== "0" && value !== "1" && value !== 0 && value !== 1) {
            throw new Error(
              `Invalid boolean value "${value}" for field "${fieldName}". Only 0 or 1 are allowed.`
            );
          }
          return value;
        }

        // Convert comma to dot if present
        const normalizedValue = value.toString().replace(",", ".");
        const num = parseFloat(normalizedValue);

        if (isNaN(num)) {
          throw new Error(
            `Invalid numeric value "${value}" for field "${fieldName}"`
          );
        }

        // Validate precision and scale if specified
        if (fieldDataType.precision) {
          validateNumberPrecision(
            num,
            fieldDataType.precision,
            fieldDataType.scale,
            fieldName
          );
        }

        return normalizedValue;

      case "VARCHAR":
      case "VARCHAR2":
      case "CHAR":
        const UUID_V4_MAXLENGTH = 36;

        if (value.toLowerCase() === "uuid") {
          if (
            fieldDataType.maxLength &&
            fieldDataType.maxLength < UUID_V4_MAXLENGTH
          ) {
            throw new Error(
              `Field "${fieldName}" length (${fieldDataType.maxLength}) is too small to store UUID. Minimum required length is ${UUID_V4_MAXLENGTH}.`
            );
          }
          return `'${crypto.randomUUID()}'`;
        }

        if (fieldDataType.maxLength) {
          const length =
            fieldDataType.unit === "BYTE"
              ? new TextEncoder().encode(value).length
              : value.length;

          if (length > fieldDataType.maxLength) {
            throw new Error(
              `Value exceeds maximum length of ${fieldDataType.maxLength} ${fieldDataType.unit} for field "${fieldName}"`
            );
          }
        }
        return `'${value.replace(/'/g, "''")}'`;

      case "DATE":
      case "TIMESTAMP":
        if (!isValidDate(value)) {
          throw new Error(
            `Invalid date value "${value}" for field "${fieldName}"`
          );
        }
        return formatTimestamp(value);

      case "CLOB":
        return formatCLOB(value);

      case "BLOB":
        return formatBLOB(value);

      default:
        return `'${value.replace(/'/g, "''")}'`;
    }
  }

  function parseDataType(dataType) {
    const upperType = dataType.toUpperCase();

    // Parse NUMBER type
    const numberMatch = upperType.match(/NUMBER\((\d+)(?:,\s*(\d+))?\)/);
    if (numberMatch) {
      return {
        type: "NUMBER",
        precision: parseInt(numberMatch[1]),
        scale: numberMatch[2] ? parseInt(numberMatch[2]) : 0,
      };
    }

    // Parse VARCHAR/CHAR type
    const stringMatch = upperType.match(
      /(VARCHAR2?|CHAR)\((\d+)(?:\s+(BYTE|CHAR))?\)/
    );
    if (stringMatch) {
      return {
        type: stringMatch[1],
        maxLength: parseInt(stringMatch[2]),
        unit: stringMatch[3] || "BYTE",
      };
    }

    // Basic types
    if (upperType.startsWith("TIMESTAMP")) return { type: "TIMESTAMP" };
    if (upperType === "DATE") return { type: "DATE" };
    if (upperType === "CLOB") return { type: "CLOB" };
    if (upperType === "BLOB") return { type: "BLOB" };
    if (upperType === "NUMBER") return { type: "NUMBER" };

    return { type: upperType };
  }

  function validateNumberPrecision(num, precision, scale, fieldName) {
    const numStr = Math.abs(num).toString();
    const parts = numStr.split(".");

    const integerDigits = parts[0].length;
    const decimalDigits = parts[1]?.length || 0;

    if (integerDigits + decimalDigits > precision) {
      throw new Error(
        `Value ${num} exceeds maximum precision of ${precision} for field "${fieldName}"`
      );
    }

    if (scale !== undefined && decimalDigits > scale) {
      throw new Error(
        `Value ${num} exceeds maximum scale of ${scale} (${precision},${scale}) for field "${fieldName}"`
      );
    }

    if (scale !== undefined && integerDigits > precision - scale) {
      throw new Error(
        `Integer part of ${num} exceeds maximum allowed digits for field "${fieldName}"`
      );
    }
  }

  function formatFieldName(fieldName) {
    return isOracleReservedWord(fieldName)
      ? `"${fieldName.toLowerCase()}"`
      : fieldName;
  }

  function findPrimaryKeys(data, tableName) {
    console.log("Finding primary keys for:", tableName);

    // For config table, use field parameter_key if exist as primary key
    if (tableName.toLowerCase().endsWith("config")) {
      const parameterKeyField = data.find(
        (field) => field[0].toLowerCase() === "parameter_key"
      );
      if (parameterKeyField) return [parameterKeyField[0]];
    }

    // Look for fields with "PK" or "pk" in the Nullable field
    const pkFields = data
      .filter((field) => field[2].toLowerCase().includes("pk"))
      .map((field) => field[0]);

    if (pkFields.length > 0) return pkFields;

    // If no primary keys found, use the first field as default
    return [data[0][0].toLowerCase()];
  }

  function isValidUUID(str) {
    const uuidV4Regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidV4Regex.test(str);
  }

  function formatTimestamp(value) {
    // Handle special cases
    if (!value) return "NULL";
    const upperValue = value.toUpperCase();
    if (upperValue === "SYSDATE" || upperValue === "CURRENT_TIMESTAMP") {
      return upperValue;
    }

    try {
      // 1. Handle ISO 8601 format with timezone
      if (
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/.test(
          value
        )
      ) {
        const parsed = moment(value);
        if (parsed.isValid()) {
          const fractionalMatch = value.match(/\.(\d+)/);
          const precision = fractionalMatch
            ? Math.min(fractionalMatch[1].length, 9)
            : 0;

          if (precision > 0) {
            return `TO_TIMESTAMP_TZ('${parsed.format(
              "YYYY-MM-DD HH:mm:ss"
            )}${value.substring(
              value.indexOf("."),
              value.indexOf(".") + precision + 1
            )}${parsed.format(
              "Z"
            )}', 'YYYY-MM-DD HH24:MI:SS.FF${precision}TZH:TZM')`;
          }
          return `TO_TIMESTAMP_TZ('${parsed.format(
            "YYYY-MM-DD HH:mm:ssZ"
          )}', 'YYYY-MM-DD HH24:MI:SSTZH:TZM')`;
        }
      }

      // 2. Handle timestamps with fractional seconds
      if (value.includes(".") || value.includes(",")) {
        const [datePart, fractionalPart] = value.split(/[.,]/);
        const precision = Math.min(fractionalPart?.length || 0, 9);

        const parsed = moment(datePart);
        if (parsed.isValid()) {
          return `TO_TIMESTAMP('${parsed.format(
            "YYYY-MM-DD HH:mm:ss"
          )}.${fractionalPart.substring(
            0,
            precision
          )}', 'YYYY-MM-DD HH24:MI:SS.FF${precision}')`;
        }
      }

      // 3. Handle common formats with strict parsing
      const commonFormats = [
        "YYYY-MM-DD HH:mm:ss",
        "DD-MM-YYYY HH:mm:ss",
        "MM/DD/YYYY HH:mm:ss",
        "DD/MM/YYYY HH:mm:ss",
        "YYYY-MM-DD",
        "DD-MM-YYYY",
        "MM/DD/YYYY",
        "DD/MM/YYYY",
        "DD-MMM-YYYY",
        "DD-MMM-YY",
        "DD.MM.YYYY HH:mm:ss",
        "DD.MM.YYYY",
        "YYYY/MM/DD HH:mm:ss",
        "YYYY/MM/DD",
      ];

      for (const format of commonFormats) {
        const parsed = moment(value, format, true);
        if (parsed.isValid()) {
          return `TO_TIMESTAMP('${parsed.format(
            "YYYY-MM-DD HH:mm:ss"
          )}', 'YYYY-MM-DD HH24:MI:SS')`;
        }
      }

      // 4. Handle AM/PM format
      if (/[AaPpMm]/.test(value)) {
        const amPmFormats = [
          "MM/DD/YYYY hh:mm:ss A",
          "DD-MM-YYYY hh:mm:ss A",
          "YYYY-MM-DD hh:mm:ss A",
          "DD/MM/YYYY hh:mm:ss A",
          "MM-DD-YYYY hh:mm:ss A",
        ];

        for (const format of amPmFormats) {
          const parsed = moment(value, format, true);
          if (parsed.isValid()) {
            return `TO_TIMESTAMP('${parsed.format(
              "YYYY-MM-DD HH:mm:ss"
            )}', 'YYYY-MM-DD HH24:MI:SS')`;
          }
        }
      }

      // 5. Last resort: try flexible parsing
      const parsed = moment(value);
      if (parsed.isValid()) {
        console.warn(`Using flexible date parsing for format: ${value}`);
        return `TO_TIMESTAMP('${parsed.format(
          "YYYY-MM-DD HH:mm:ss"
        )}', 'YYYY-MM-DD HH24:MI:SS')`;
      }

      throw new Error(`Unable to parse date format: ${value}`);
    } catch (error) {
      console.error(`Error parsing timestamp: ${value}`, error);
      throw new Error(
        `Invalid timestamp format: ${value}. Please use a valid date/time format.`
      );
    }
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

  function isValidDate(value) {
    // Handle special cases
    if (!value) return false;
    if (
      value.toUpperCase() === "SYSDATE" ||
      value.toUpperCase() === "CURRENT_TIMESTAMP"
    ) {
      return true;
    }

    // Try parsing with common formats first (strict mode)
    const commonFormats = [
      "YYYY-MM-DD HH:mm:ss",
      "YYYY-MM-DD[T]HH:mm:ss.SSSZ", // ISO 8601
      "DD-MM-YYYY HH:mm:ss",
      "MM/DD/YYYY HH:mm:ss",
      "DD/MM/YYYY HH:mm:ss",
      "YYYY-MM-DD",
      "DD-MM-YYYY",
      "MM/DD/YYYY",
      "DD/MM/YYYY",
      "DD-MMM-YYYY",
      "DD-MMM-YY",
      "DD.MM.YYYY HH:mm:ss",
      "DD.MM.YYYY",
      "YYYY/MM/DD HH:mm:ss",
      "YYYY/MM/DD",
      "MM/DD/YYYY hh:mm:ss A",
      "DD-MM-YYYY hh:mm:ss A",
    ];

    // Try strict parsing with common formats
    if (commonFormats.some((format) => moment(value, format, true).isValid())) {
      return true;
    }

    // If strict parsing fails, try flexible parsing as last resort
    const parsed = moment(value);
    if (parsed.isValid()) {
      console.warn(`Date validated using flexible parsing: ${value}`);
      return true;
    }

    return false;
  }

  function isOracleReservedWord(word) {
    const reservedWords = new Set([
      "access",
      "add",
      "all",
      "alter",
      "and",
      "any",
      "as",
      "asc",
      "audit",
      "between",
      "by",
      "char",
      "check",
      "cluster",
      "column",
      "comment",
      "compress",
      "connect",
      "create",
      "current",
      "date",
      "decimal",
      "default",
      "delete",
      "desc",
      "distinct",
      "drop",
      "else",
      "exclusive",
      "exists",
      "file",
      "float",
      "for",
      "from",
      "grant",
      "group",
      "having",
      "identified",
      "immediate",
      "in",
      "increment",
      "index",
      "initial",
      "insert",
      "integer",
      "intersect",
      "into",
      "is",
      "level",
      "like",
      "lock",
      "long",
      "maxextents",
      "minus",
      "mlslabel",
      "mode",
      "modify",
      "noaudit",
      "nocompress",
      "not",
      "nowait",
      "null",
      "number",
      "of",
      "offline",
      "on",
      "online",
      "option",
      "or",
      "order",
      "pctfree",
      "prior",
      "privileges",
      "public",
      "raw",
      "rename",
      "resource",
      "revoke",
      "row",
      "rowid",
      "rownum",
      "rows",
      "select",
      "session",
      "set",
      "share",
      "size",
      "smallint",
      "start",
      "successful",
      "synonym",
      "sysdate",
      "table",
      "then",
      "to",
      "trigger",
      "uid",
      "union",
      "unique",
      "update",
      "user",
      "validate",
      "values",
      "varchar",
      "varchar2",
      "view",
      "whenever",
      "where",
      "with",
      "sequence",
      "type",
      "package",
      "body",
    ]);
    return reservedWords.has(word.toLowerCase());
  }

  function formatFieldName(fieldName) {
    return isOracleReservedWord(fieldName)
      ? `"${fieldName.toLowerCase()}"`
      : fieldName;
  }

  // Constants
  const DATE_FORMATS = {
    DATE_ONLY: {
      formats: [
        "DD/MM/YYYY",
        "DD-MM-YYYY",
        "YYYY-MM-DD",
        "DD/M/YYYY",
        "M/D/YYYY",
        "DD-MON-YY",
        "DD-MON-YYYY",
      ],
      regex:
        /^(\d{2}[-/]\d{2}[-/]\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}|\d{2}-[A-Z]{3}-\d{2}|\d{2}-[A-Z]{3}-\d{4})$/i,
      oracleFormat: "YYYY-MM-DD",
    },
    DATE_TIME: {
      formats: [
        "DD-MM-YYYY HH:mm:ss",
        "YYYY-MM-DD HH:mm:ss",
        "DD-MON-YYYY HH:mm:ss",
      ],
      regex:
        /^(\d{2}-\d{2}-\d{4}|\d{4}-\d{2}-\d{2}|\d{2}-[A-Z]{3}-\d{4})\s\d{2}:\d{2}:\d{2}$/i,
      oracleFormat: "DD-MM-YYYY HH24:MI:SS",
    },
    ISO_TIMESTAMP: {
      formats: ["YYYY-MM-DD HH:mm:ss.SSS"],
      regex: /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}\.\d{3}$/,
      oracleFormat: "YYYY-MM-DD HH24:MI:SS.FF3",
    },
    TIMESTAMP: {
      formats: ["DD-MM-YYYY HH.mm.ss,SSSSSSSSS"],
      regex: /^\d{2}-\d{2}-\d{4}\s\d{2}\.\d{2}\.\d{2},\d{1,9}$/,
      oracleFormat: "DD-MM-YYYY HH24:MI:SS.FF9",
    },
    TIMESTAMP_AM_PM: {
      formats: ["M/D/YYYY h:mm:ss.SSSSSS A"],
      regex:
        /^\d{1,2}\/\d{1,2}\/\d{4}\s\d{1,2}:\d{2}:\d{2}(\.\d{1,6})?\s[AP]M$/,
      oracleFormat: "MM/DD/YYYY HH24:MI:SS.FF6",
    },
  };

  const MAIN_HTML_PAGE = `
    <div class="tool-container quick-query-tool-container">
      <div class="quick-query-content">
        <div class="content-a">
          <div class="quick-query-left-panel">
            <div class="button-group">
              <select id="queryTypeSelect">
                <option value="merge">MERGE INTO</option>
                <option value="insert">INSERT INTO</option>
              </select>
              <input type="text" id="tableNameInput" placeholder="schema_name.table_name" value="schema_name.table_name">
              </div>
              <div class="button-group quick-query-left-controls">
                <button id="showSavedSchemas">Manage Saved Schemas</button>
                <button id="addNewSchemaRow">Add row</button>
                <button id="removeLastSchemaRow">Remove last row</button>
                <button id="clearAll">Clear</button>
                <button id="generateQuery">Generate Query</button>
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
            <div id="warningMessages"></div>
            <div id="errorMessages"></div>
            <div id="queryEditor" class="quick-query-content-area"></div>
          </div>
        </div>
        <div class="content-b">
          <div class="button-group">
            <h3>Data Input</h3>
            <p>Note: First row of data must be field names.</p>
            <div class="button-group simulate-buttons">
              <button id="addFieldNames">Add field names from schema</button>
              <button id="addDataRow">Add Row</button>
              <button id="removeDataRow">Remove Last Row</button>
            </div>
          </div>
          <div id="spreadsheet-data"></div>
        </div>
      </div>
    </div>

    <div id="schemaOverlay" class="schema-overlay hidden">
      <div class="schema-modal">
        <div class="schema-modal-header">
          <h3>Saved Schemas</h3>
          <div class="schema-modal-actions">
            <button id="clearAllSchemas" class="action-button">Clear All</button>
            <button id="exportSchemas" class="action-button">Export</button>
            <button id="importSchemas" class="action-button">Import</button>
            <button id="closeSchemaOverlay" class="overlay-close-button">&times;</button>
          </div>
          <input type="file" id="schemaFileInput" accept=".json" style="display: none;">
        </div>
        <div class="schema-modal-content">
          <div id="savedSchemasList"></div>
        </div>
      </div>
    </div>
  `;

  const ERROR_HTML_PAGE = `
    <div class="tool-container quick-query-tool-container">
      <div class="quick-query-error-state">
        <div class="error-message"></div>
        <button class="retry-button">Retry Loading</button>
      </div>
    </div>
  `;

  const showErrorState = (errorMessage) => {
    container.innerHTML = ERROR_HTML_PAGE;
    const errorDiv = container.querySelector(".error-message");
    const retryButton = container.querySelector(".retry-button");

    errorDiv.innerHTML = `<b>Failed to load Quick Query Resources:</b><br>${errorMessage}.<br>We use CDN links to load the required tools. Please check your network connection and try again.`;

    // Add retry functionality
    retryButton.addEventListener("click", async () => {
      retryButton.disabled = true;
      retryButton.textContent = "Retrying...";
      try {
        await initQuickQuery(container, updateHeaderTitle);
      } catch (error) {
        retryButton.disabled = false;
        retryButton.textContent = "Retry Loading";
      }
    });
  };

  const EVENT_HANDLERS = {
    // Button click handlers
    generateQuery: {
      event: "click",
      handler: handleGenerateQuery,
    },
    copySQL: {
      event: "click",
      handler: (event) => copyToClipboard(editor.getValue(), event.target),
    },
    clearAll: {
      event: "click",
      handler: handleClearAll,
    },
    downloadSQL: {
      event: "click",
      handler: handleDownloadSql,
    },
    toggleGuide: {
      event: "click",
      handler: handleToggleGuide,
    },
    toggleWordWrap: {
      event: "click",
      handler: handleToggleWordWrap,
    },

    // Simulation handlers
    simulationFillSchemaButton: {
      event: "click",
      handler: handleSimulationFillSchema,
    },
    simulationFillDataButton: {
      event: "click",
      handler: handleSimulationFillData,
    },
    simulationGenerateQueryButton: {
      event: "click",
      handler: handleSimulationGenerateQuery,
    },

    // Data manipulation handlers
    addFieldNames: {
      event: "click",
      handler: handleAddFieldNames,
    },
    addDataRow: {
      event: "click",
      handler: handleAddDataRow,
    },
    removeDataRow: {
      event: "click",
      handler: handleRemoveDataRow,
    },
    addNewSchemaRow: {
      event: "click",
      handler: handleAddNewSchemaRow,
    },
    removeLastSchemaRow: {
      event: "click",
      handler: handleRemoveLastSchemaRow,
    },

    // Select handlers
    queryTypeSelect: {
      event: "change",
      handler: handleGenerateQuery,
    },
  };

  function setupEventListeners() {
    Object.entries(EVENT_HANDLERS).forEach(([id, config]) => {
      const element = document.getElementById(id);
      if (!element) {
        console.warn(`Element with id '${id}' not found`);
        return;
      }

      // Handle cases where an element has multiple event handlers
      if (Array.isArray(config)) {
        config.forEach(({ event, handler }) => {
          element.addEventListener(event, handler);
        });
      } else {
        // Single event handler case
        const { event, handler } = config;
        element.addEventListener(event, handler);
      }
    });
  }

  // Initiate page tools
  let editor;
  let schemaTable;
  let dataTable;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => resolve(true);
      script.onerror = (error) =>
        reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  }

  function loadStyle(href) {
    return new Promise((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.onload = () => resolve(true);
      link.onerror = (error) =>
        reject(new Error(`Failed to load stylesheet: ${href}`));
      document.head.appendChild(link);
    });
  }

  async function loadHandsontable() {
    return retryOperation(
      async () => {
        const [scriptLoaded, styleLoaded] = await Promise.all([
          loadScript(
            "https://cdn.jsdelivr.net/npm/handsontable/dist/handsontable.full.min.js"
          ),
          loadStyle(
            "https://cdn.jsdelivr.net/npm/handsontable/dist/handsontable.full.min.css"
          ),
        ]);
        return { scriptLoaded, styleLoaded };
      },
      {
        name: "Handsontable loading",
        retries: 3,
        delay: 1000,
      }
    );
  }

  // Start the initialization process
  return new Promise((resolve, reject) => {
    try {
      // Set up initial HTML
      container.innerHTML = MAIN_HTML_PAGE;
      clearError();

      // Single initialization flow with retry logic
      retryOperation(
        () =>
          new Promise((resolveOp, rejectOp) => {
            loadHandsontable()
              .then(() => {
                initializeSchemaTable();
                initializeEditor();
                setupEventListeners();
                setupTableNameSearch(parent);

                // Try to load most recent schema from local storage
                const allTables = getAllTables();
                if (allTables.length > 0) {
                  const mostRecent = allTables[0];
                  const schema = loadSchema(mostRecent.fullName);
                  if (schema) {
                    document.getElementById("tableNameInput").value =
                      mostRecent.fullName;
                    schemaTable.loadData(schema);
                    updateDataSpreadsheet();
                  }
                }
                createSchemaOverlay();

                resolveOp();
              })
              .catch(rejectOp);
          }),
        {
          name: "Quick Query initialization",
          retries: 3,
          delay: 1000,
          onFailedAttempt: (error, attempt, maxRetries) => {
            console.warn(
              `Initialization attempt ${attempt}/${maxRetries} failed:`,
              error
            );
            showError(
              `Loading tools required... (Attempt ${attempt}/${maxRetries})`
            );
          },
        }
      )
        .then(resolve)
        .catch((error) => {
          console.error("Failed to initialize Quick Query:", error);
          showErrorState(error.message || "Unknown error occurred");
          reject(error);
        });
    } catch (error) {
      showErrorState(error.message || "Unknown error occurred");
      reject(error);
    }
  });
}
