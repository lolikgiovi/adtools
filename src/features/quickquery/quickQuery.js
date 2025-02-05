import { copyToClipboard } from "../../utils/buttons.js";
import { quickQueryErrorHtmlPage, quickQueryMainHtmlPage } from "./quickquery.template.js";
import { SchemaStorageService } from "./services/SchemaStorageService.js";
import { SchemaValidationService, isDbeaverSchema } from "./services/SchemaValidationService.js";
import { QueryGenerationService } from "./services/QueryGenerationService.js";
import { DependencyLoader } from "../../utils/dependencyLoader.js";
import { sampleSchema1, sampleData1 } from "./quickquery.constants.js";

function retryOperation(operation, options = {}) {
  const { retries = 3, delay = 1000, backoff = 2, name = "Operation", onFailedAttempt = null } = options;

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
            console.warn(`${name} failed, attempt ${attempt + 1}/${retries}. Retrying in ${waitTime}ms...`);

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

function setupTableNameSearch(parent) {
  const schemaStorageService = new SchemaStorageService();
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
    const schema = schemaStorageService.loadSchema(fullName);
    if (schema) {
      parent.schemaTable.loadData(schema);
      // parent.dataTable.loadData([[], []]);
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
    if (dropdownContainer.style.display === "none" && event.key === "ArrowDown") {
      // If dropdown is hidden and down arrow is pressed, show recent items
      const results = schemaStorageService.searchSavedSchemas("").slice(0, 7); // Get 7 most recent
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
      const results = schemaStorageService.searchSavedSchemas("").slice(0, 7); // Get 7 most recent
      showDropdown(results);
      return;
    }

    const parts = input.split(".");

    // Validate each part
    if (parts.length > 1) {
      const [schema, table] = parts;
      const isValidSchema = schemaStorageService.validateOracleName(schema, "schema");
      const isValidTable = table ? schemaStorageService.validateOracleName(table, "table") : true;

      if (!isValidSchema || !isValidTable) {
        tableNameInput.style.borderColor = "red";
        dropdownContainer.style.display = "none";
        return;
      }
    } else {
      const isValidSchema = schemaStorageService.validateOracleName(parts[0], "schema");
      if (!isValidSchema) {
        tableNameInput.style.borderColor = "red";
        dropdownContainer.style.display = "none";
        return;
      }
    }

    const results = schemaStorageService.searchSavedSchemas(input);
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
  const schemaStorageService = new SchemaStorageService();
  const schemaValidationService = new SchemaValidationService();
  const queryGenerationService = new QueryGenerationService();
  const dependencyLoader = new DependencyLoader();
  const parent = {
    schemaTable: null,
    dataTable: null,
    updateDataSpreadsheet: null,
    handleAddFieldNames: null,
    clearError: null,
  };

  loadQuickQueryDependencies();
  async function loadQuickQueryDependencies() {
    dependencyLoader.loadDependency("handsontable");
    dependencyLoader.loadDependency("codemirror");
  }

  // Business Logics
  function initializeSchemaTable() {
    const schemaContainer = document.getElementById("spreadsheet-schema");
    const data = [["", "", "", ""]];
    schemaTable = new Handsontable(schemaContainer, {
      data: data,
      colHeaders: ["Field Name", "Data Type", "Nullable/PK", "Default", "Field Order", "Comments"],
      columns: [
        {
          // Field Name
          renderer: function (instance, td, row, col, prop, value, cellProperties) {
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
            callback(["Yes", "No", "PK", "yes", "no", "pk", "Yes", "No", "Pk", "Y", "N", "y", "n"].includes(value));
          },
          renderer: function (instance, td, row, col, prop, value, cellProperties) {
            Handsontable.renderers.DropdownRenderer.apply(this, arguments);
            td.style.textAlign = "center";
          },
        },
        {}, // Default
        {
          // Field Order
          type: "numeric",
          validator: function (value, callback) {
            callback(value === null || value === "" || !isNaN(parseFloat(value)));
          },
          renderer: function (instance, td, row, col, prop, value, cellProperties) {
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
          cellProperties.renderer = function (instance, td, row, col, prop, value, cellProperties) {
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
    const currentData = dataTable.getData();

    // Generate alphabetical field headers
    const columnHeaders = Array.from({ length: columnCount }, (_, i) => String.fromCharCode(65 + i));

    dataTable.updateSettings({
      colHeaders: columnHeaders,
      columns: Array(columnCount).fill({ type: "text" }),
      minCols: columnCount,
    });

    // If there's no data or less than two rows, create two empty rows
    if (currentData.length < 2) {
      const newData = [Array(columnCount).fill(null), Array(columnCount).fill(null)];
      dataTable.loadData(newData);
    } else {
      // Ensure existing data has the correct number of columns
      const newData = currentData.map((row) => {
        return row.slice(0, columnCount).concat(Array(Math.max(0, columnCount - row.length)).fill(null));
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
    console.log("Toggle Guide pressed");

    if (guideContent.classList.contains("hidden")) {
      guideContent.classList.remove("hidden");
      toggleButton.textContent = "Hide";
    } else {
      guideContent.classList.add("hidden");
      toggleButton.textContent = "Tutorial & Simulation";
    }
  }

  function handleSimulationFillSchema() {
    document.getElementById("tableNameInput").value = "schema_name.table_name";
    schemaTable.loadData(sampleSchema1);
  }

  function handleSimulationFillData() {
    dataTable.loadData(sampleData1);
    updateDataSpreadsheet();
  }

  function handleSimulationGenerateQuery() {
    handleGenerateQuery();
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
    const sanitizedTableName = tableName.replace(/[^a-z0-9_.]/gi, "_").toUpperCase();
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
        colHeaders: ["Field Name", "Data Type", "Nullable/PK", "Default", "Field Order", "Comments"],
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
        throw new Error("Table name format should be 'schema_name.table_name'.");
      }

      // Handle DBeaver schema format
      if (isDbeaverSchema(schemaData)) {
        adjustDbeaverSchema(schemaData);
        throw new Error("Schema data adjusted from DBeaver to SQL Developer format. Please refill the data sheet.");
      }

      schemaValidationService.validateSchema(schemaData);
      schemaValidationService.matchSchemaWithData(schemaData, inputData);

      // Save schema to local storage
      schemaStorageService.saveSchema(tableName, schemaData);

      // Generate the query
      const query = queryGenerationService.generateQuery(tableName, queryType, schemaData, inputData);

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
      const allTables = schemaStorageService.getAllTables();
      if (allTables.length === 0) {
        showError("No schemas to export");
        return;
      }
      exportSchemas();
    });

    // Clear All button
    clearAllButton.addEventListener("click", () => {
      const allTables = schemaStorageService.getAllTables();
      if (allTables.length === 0) {
        showError("No schemas to clear");
        return;
      }

      if (confirm("Are you sure you want to clear all saved schemas? This cannot be undone.")) {
        handleClearAllSchemas();
      }
    });

    // Set up import functionality
    setupSchemaImport();
  }

  function updateSavedSchemasList() {
    const schemasList = document.getElementById("savedSchemasList");
    const allTables = schemaStorageService.getAllTables();

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
        loadBtn.addEventListener("click", () => handleLoadSchema(table.fullName));

        // Delete button
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", () => handleDeleteSchema(table.fullName));

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
    const schema = schemaStorageService.loadSchema(fullName);
    if (schema) {
      document.getElementById("tableNameInput").value = fullName;
      schemaTable.loadData(schema);
      // dataTable.loadData([[], []]);
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
      const deleted = schemaStorageService.deleteSchema(fullName);
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

  function handleClearAllSchemas() {
    const schemaCleared = schemaStorageService.clearAllSchemas();
    if (schemaCleared) {
      showSuccess("All saved schemas have been cleared");
    } else {
      showError("Failed to clear all saved schemas");
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
            if (schemaStorageService.saveSchema(fullTableName, schema)) {
              importCount++;
            }
          });
        });

        // Update UI
        updateSavedSchemasList();
        showSuccess(`Successfully imported ${importCount} table schemas`);
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
    const allTables = schemaStorageService.getAllTables();
    const exportData = {};

    // Group by schema and table
    allTables.forEach((table) => {
      const schema = schemaStorageService.loadSchema(table.fullName);
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

  // Constants
  const showErrorState = (errorMessage) => {
    container.innerHTML = quickQueryErrorHtmlPage;
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
      script.onerror = (error) => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  }

  function loadStyle(href) {
    return new Promise((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.onload = () => resolve(true);
      link.onerror = (error) => reject(new Error(`Failed to load stylesheet: ${href}`));
      document.head.appendChild(link);
    });
  }

  async function loadHandsontable() {
    return retryOperation(
      async () => {
        const [scriptLoaded, styleLoaded] = await Promise.all([
          loadScript("https://cdn.jsdelivr.net/npm/handsontable/dist/handsontable.full.min.js"),
          loadStyle("https://cdn.jsdelivr.net/npm/handsontable/dist/handsontable.full.min.css"),
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
      container.innerHTML = quickQueryMainHtmlPage;
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
                const allTables = schemaStorageService.getAllTables();
                if (allTables.length > 0) {
                  const mostRecent = allTables[0];
                  const schema = schemaStorageService.loadSchema(mostRecent.fullName);
                  if (schema) {
                    document.getElementById("tableNameInput").value = mostRecent.fullName;
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
            console.warn(`Initialization attempt ${attempt}/${maxRetries} failed:`, error);
            showError(`Loading tools required... (Attempt ${attempt}/${maxRetries})`);
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
