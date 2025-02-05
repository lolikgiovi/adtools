import { copyToClipboard } from "../../utils/buttons.js";
import { quickQueryMainHtmlPage } from "./quickquery.template.js";
import { SchemaStorageService } from "./services/SchemaStorageService.js";
import { QueryGenerationService } from "./services/QueryGenerationService.js";
import { SchemaValidationService, isDbeaverSchema } from "./services/SchemaValidationService.js";
import { DependencyLoader } from "../../utils/dependencyLoader.js";
import { sampleSchema1, sampleData1 } from "./quickquery.constants.js";
import { initialSchemaTableSpecification, initialDataTableSpecification } from "./quickquery.constants.js";

export class QuickQueryUI {
  constructor(container, updateHeaderTitle) {
    this.container = container;
    this.updateHeaderTitle = updateHeaderTitle;
    this.editor = null;
    this.schemaTable = null;
    this.dataTable = null;
    this.elements = {};
    this.schemaStorageService = new SchemaStorageService();
    this.schemaValidationService = new SchemaValidationService();
    this.queryGenerationService = new QueryGenerationService();

    // Initialize search state
    this.searchState = {
      selectedIndex: -1,
      visibleItems: [],
    };
  }

  async init() {
    try {
      this.container.innerHTML = quickQueryMainHtmlPage;
      this.bindElements();
      this.clearError();
      await DependencyLoader.loadDependency("handsontable");
      await DependencyLoader.loadDependency("codemirror");
      await this.initializeComponents();
      this.setupEventListeners();
      this.setupTableNameSearch();
      this.loadMostRecentSchema();
      this.createSchemaOverlay();
    } catch (error) {
      console.error("Failed to initialize Quick Query:", error);
      if (this.elements.errorMessages) {
        console.log(error.message);
      } else {
        console.error("Error elements not bound yet:", error);
        this.container.innerHTML = `<div class="error-message">Failed to initialize: ${error.message || "Unknown error"}</div>`;
      }
      throw error;
    }
  }

  async initializeComponents() {
    try {
      this.schemaTable = new Handsontable(this.elements.schemaContainer, initialSchemaTableSpecification);
      this.dataTable = new Handsontable(this.elements.dataContainer, initialDataTableSpecification);
      this.initializeEditor();
    } catch (error) {
      throw new Error(`Failed to initialize components: ${error.message}`);
    }
  }

  bindElements() {
    this.elements = {
      // Input elements
      tableNameInput: document.getElementById("tableNameInput"),
      queryTypeSelect: document.getElementById("queryTypeSelect"),
      schemaFileInput: document.getElementById("schemaFileInput"),

      // Schema editor elements
      schemaContainer: document.getElementById("spreadsheet-schema"),
      dataContainer: document.getElementById("spreadsheet-data"),

      // Message and display elements
      errorMessages: document.getElementById("errorMessages"),
      warningMessages: document.getElementById("warningMessages"),
      guide: document.getElementById("guide"),

      // Schema overlay elements
      schemaOverlay: document.getElementById("schemaOverlay"),
      savedSchemasList: document.getElementById("savedSchemasList"),

      // Buttons
      toggleGuideButton: document.getElementById("toggleGuide"),
      guideContent: document.getElementById("guide"),
      toggleWordWrapButton: document.getElementById("toggleWordWrap"),
      showSavedSchemasButton: document.getElementById("showSavedSchemas"),
      closeSchemaOverlayButton: document.getElementById("closeSchemaOverlay"),
      exportSchemasButton: document.getElementById("exportSchemas"),
      clearAllSchemasButton: document.getElementById("clearAllSchemas"),
      importSchemasButton: document.getElementById("importSchemas"),

      // Container elements
      tableSearchContainer: null,
      dropdownContainer: null,
    };
  }

  setupEventListeners() {
    const EVENT_HANDLERS = {
      // Query generation and manipulation
      generateQuery: {
        event: "click",
        handler: () => this.handleGenerateQuery(),
      },
      copySQL: {
        event: "click",
        handler: (event) => copyToClipboard(this.editor.getValue(), event.target),
      },
      clearAll: {
        event: "click",
        handler: () => this.handleClearAll(),
      },
      downloadSQL: {
        event: "click",
        handler: () => this.handleDownloadSql(),
      },
      toggleWordWrap: {
        event: "click",
        handler: () => this.handleToggleWordWrap(),
      },

      // Guide and simulation handlers
      toggleGuide: {
        event: "click",
        handler: () => this.handleToggleGuide(),
      },
      simulationFillSchemaButton: {
        event: "click",
        handler: () => this.handleSimulationFillSchema(),
      },
      simulationFillDataButton: {
        event: "click",
        handler: () => this.handleSimulationFillData(),
      },
      simulationGenerateQueryButton: {
        event: "click",
        handler: () => this.handleSimulationGenerateQuery(),
      },

      // Data manipulation handlers
      addFieldNames: {
        event: "click",
        handler: () => this.handleAddFieldNames(),
      },
      addDataRow: {
        event: "click",
        handler: () => this.handleAddDataRow(),
      },
      removeDataRow: {
        event: "click",
        handler: () => this.handleRemoveDataRow(),
      },
      addNewSchemaRow: {
        event: "click",
        handler: () => this.handleAddNewSchemaRow(),
      },
      removeLastSchemaRow: {
        event: "click",
        handler: () => this.handleRemoveLastSchemaRow(),
      },

      // Schema overlay handlers
      showSavedSchemas: {
        event: "click",
        handler: () => {
          this.elements.schemaOverlay.classList.remove("hidden");
          this.updateSavedSchemasList();
        },
      },
      closeSchemaOverlay: {
        event: "click",
        handler: () => {
          this.elements.schemaOverlay.classList.add("hidden");
        },
      },
      exportSchemas: {
        event: "click",
        handler: () => {
          const allTables = this.schemaStorageService.getAllTables();
          if (allTables.length === 0) {
            this.showError("No schemas to export");
            return;
          }
          this.exportSchemas();
        },
      },
      clearAllSchemas: {
        event: "click",
        handler: () => {
          const allTables = this.schemaStorageService.getAllTables();
          if (allTables.length === 0) {
            this.showError("No schemas to clear");
            return;
          }
          if (confirm("Are you sure you want to clear all saved schemas? This cannot be undone.")) {
            this.handleClearAllSchemas();
          }
        },
      },

      // Query type selection
      queryTypeSelect: {
        event: "change",
        handler: () => this.handleGenerateQuery(),
      },
    };

    Object.entries(EVENT_HANDLERS).forEach(([id, config]) => {
      const element = document.getElementById(id);
      if (!element) {
        console.warn(`Element with id '${id}' not found`);
        return;
      }

      if (Array.isArray(config)) {
        config.forEach(({ event, handler }) => {
          element.addEventListener(event, handler);
        });
      } else {
        const { event, handler } = config;
        element.addEventListener(event, handler);
      }
    });
  }

  initializeEditor() {
    this.editor = CodeMirror(document.getElementById("queryEditor"), {
      mode: "text/x-sql",
      theme: "material",
      lineNumbers: true,
      readOnly: false,
      viewportMargin: Infinity,
      lineWrapping: false,
    });

    setTimeout(() => this.editor.refresh(), 0);
  }

  updateDataSpreadsheet() {
    const schemaData = this.schemaTable.getData().filter((row) => row[0]);
    const columnCount = schemaData.length;
    const currentData = this.dataTable.getData();

    const columnHeaders = Array.from({ length: columnCount }, (_, i) => String.fromCharCode(65 + i));

    this.dataTable.updateSettings({
      colHeaders: columnHeaders,
      columns: Array(columnCount).fill({ type: "text" }),
      minCols: columnCount,
    });

    if (currentData.length < 2) {
      const newData = [Array(columnCount).fill(null), Array(columnCount).fill(null)];
      this.dataTable.loadData(newData);
    } else {
      const newData = currentData.map((row) => {
        return row.slice(0, columnCount).concat(Array(Math.max(0, columnCount - row.length)).fill(null));
      });
      this.dataTable.loadData(newData);
    }
  }

  // Error handling methods
  showError(message) {
    if (this.elements.errorMessages) {
      this.elements.errorMessages.innerHTML = message;
      this.elements.errorMessages.style.display = "block";
    }
  }

  showSuccess(message) {
    if (this.elements.warningMessages) {
      this.elements.warningMessages.innerHTML = message;
      this.elements.warningMessages.style.display = "block";
      this.elements.warningMessages.style.color = "green";
    }
  }

  showSuccess(message) {
    const successMessagesDiv = document.createElement("div");
    successMessagesDiv.className = "success-message";
    successMessagesDiv.textContent = message;
    this.container.appendChild(successMessagesDiv);

    setTimeout(() => {
      successMessagesDiv.remove();
    }, 3000);
  }

  clearError() {
    if (this.elements.errorMessages && this.elements.warningMessages) {
      this.elements.errorMessages.textContent = "";
      this.elements.warningMessages.textContent = "";
      this.elements.errorMessages.style.display = "none";
      this.elements.warningMessages.style.display = "none";
    }
  }

  // Event Handlers
  handleGenerateQuery() {
    try {
      const tableName = this.elements.tableNameInput.value.trim();
      const queryType = this.elements.queryTypeSelect.value;

      const schemaData = this.schemaTable.getData().filter((row) => row[0]);
      const inputData = this.dataTable.getData();

      if (!tableName) {
        throw new Error("Please fill in schema_name.table_name.");
      }

      if (!tableName.includes(".")) {
        throw new Error("Table name format should be 'schema_name.table_name'.");
      }

      if (isDbeaverSchema(schemaData)) {
        this.adjustDbeaverSchema(schemaData);
        throw new Error("Schema data adjusted from DBeaver to SQL Developer format. Please refill the data sheet.");
      }

      this.schemaValidationService.validateSchema(schemaData);
      this.schemaValidationService.matchSchemaWithData(schemaData, inputData);

      this.schemaStorageService.saveSchema(tableName, schemaData);

      const query = this.queryGenerationService.generateQuery(tableName, queryType, schemaData, inputData);

      this.editor.setValue(query);
      this.clearError();
    } catch (error) {
      this.showError(error.message);
      this.editor.setValue("");
    }
  }

  handleClearAll() {
    this.elements.tableNameInput.value = "";

    if (this.schemaTable) {
      this.schemaTable.updateSettings({
        data: [["", "", "", ""]],
        colHeaders: ["Field Name", "Data Type", "Nullable/PK", "Default", "Field Order", "Comments"],
      });
    }

    if (this.dataTable) {
      this.dataTable.updateSettings({
        data: [[], []],
        colHeaders: true,
        minCols: 1,
      });
    }

    if (this.editor) {
      this.editor.setValue("");
    }

    this.clearError();
    this.elements.queryTypeSelect.value = "merge";
  }

  handleDownloadSql() {
    const sql = this.editor.getValue();
    if (!sql) {
      this.showError("No SQL to download. Please generate a query first.");
      return;
    }

    let tableName = this.elements.tableNameInput.value.trim();
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

  handleToggleWordWrap() {
    const wordWrapButton = document.getElementById("toggleWordWrap");
    const currentState = this.editor.getOption("lineWrapping");
    const newState = !currentState;

    this.editor.setOption("lineWrapping", newState);
    wordWrapButton.textContent = `Word Wrap: ${newState ? "On" : "Off"}`;
    this.editor.refresh();
  }

  handleToggleGuide() {
    if (this.elements.guideContent.classList.contains("hidden")) {
      this.elements.guideContent.classList.remove("hidden");
      this.elements.toggleGuideButton.textContent = "Hide";
    } else {
      this.elements.guideContent.classList.add("hidden");
      this.elements.toggleGuideButton.textContent = "Tutorial & Simulation";
    }
  }

  handleSimulationFillSchema() {
    this.elements.tableNameInput.value = "schema_name.table_name";
    this.schemaTable.loadData(sampleSchema1);
  }

  handleSimulationFillData() {
    this.dataTable.loadData(sampleData1);
    this.updateDataSpreadsheet();
  }

  handleSimulationGenerateQuery() {
    this.handleGenerateQuery();
    this.handleToggleGuide();
  }

  handleAddFieldNames() {
    const schemaData = this.schemaTable.getData().filter((row) => row[0]);
    const fieldNames = schemaData.map((row) => row[0]);
    const currentData = this.dataTable.getData();

    if (currentData.length > 0) {
      currentData[0] = fieldNames;
    } else {
      currentData.push(fieldNames);
    }

    if (currentData.length < 2) {
      currentData.push(Array(fieldNames.length).fill(null));
    }

    this.dataTable.loadData(currentData);
  }

  handleAddDataRow() {
    const currentData = this.dataTable.getData();
    const schemaData = this.schemaTable.getData().filter((row) => row[0]);
    const columnCount = schemaData.length;
    const newRow = Array(columnCount).fill(null);
    const newData = [...currentData, newRow];
    this.dataTable.loadData(newData);
  }

  handleRemoveDataRow() {
    const currentData = this.dataTable.getData();
    const newData = currentData.slice(0, -1);
    this.dataTable.loadData(newData);
  }

  handleAddNewSchemaRow() {
    const currentData = this.schemaTable.getData();
    const newRow = Array(6).fill(null);
    const newData = [...currentData, newRow];
    this.schemaTable.loadData(newData);
  }

  handleRemoveLastSchemaRow() {
    const currentData = this.schemaTable.getData();
    const newData = currentData.slice(0, -1);
    this.schemaTable.loadData(newData);
  }

  handleClearAllSchemas() {
    const schemaCleared = this.schemaStorageService.clearAllSchemas();
    if (schemaCleared) {
      this.showSuccess("All saved schemas have been cleared");
    } else {
      this.showError("Failed to clear all saved schemas");
    }
  }

  // Schema management methods
  updateSavedSchemasList() {
    const allTables = this.schemaStorageService.getAllTables();

    if (allTables.length === 0) {
      this.elements.savedSchemasList.innerHTML = '<div class="no-schemas">No saved schemas</div>';
      return;
    }

    const groupedTables = allTables.reduce((groups, table) => {
      if (!groups[table.schemaName]) {
        groups[table.schemaName] = [];
      }
      groups[table.schemaName].push(table);
      return groups;
    }, {});

    this.elements.savedSchemasList.innerHTML = "";

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

        const loadBtn = document.createElement("button");
        loadBtn.textContent = "Load";
        loadBtn.addEventListener("click", () => this.handleLoadSchema(table.fullName));

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", () => this.handleDeleteSchema(table.fullName));

        actionsDiv.appendChild(loadBtn);
        actionsDiv.appendChild(deleteBtn);

        itemDiv.appendChild(infoDiv);
        itemDiv.appendChild(actionsDiv);
        groupDiv.appendChild(itemDiv);
      });

      this.elements.savedSchemasList.appendChild(groupDiv);
    });
  }

  handleLoadSchema(fullName) {
    const schema = this.schemaStorageService.loadSchema(fullName);
    if (schema) {
      this.elements.tableNameInput.value = fullName;
      this.schemaTable.loadData(schema);
      this.updateDataSpreadsheet();
      this.handleAddFieldNames();
      this.elements.schemaOverlay.classList.add("hidden");
      this.clearError();
    } else {
      this.showError(`Failed to load schema for ${fullName}`);
    }
  }

  handleDeleteSchema(fullName) {
    if (confirm(`Delete schema for ${fullName}?`)) {
      const deleted = this.schemaStorageService.deleteSchema(fullName);
      if (deleted) {
        this.updateSavedSchemasList();

        const currentTable = this.elements.tableNameInput.value;
        if (currentTable === fullName) {
          this.handleClearAll();
        }
      } else {
        this.showError(`Failed to delete schema for ${fullName}`);
      }
    }
  }

  exportSchemas() {
    const allTables = this.schemaStorageService.getAllTables();
    const exportData = {};

    allTables.forEach((table) => {
      const schema = this.schemaStorageService.loadSchema(table.fullName);
      if (schema) {
        if (!exportData[table.schemaName]) {
          exportData[table.schemaName] = {};
        }
        exportData[table.schemaName][table.tableName] = schema;
      }
    });

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

  setupTableNameSearch() {
    const tableNameInput = this.elements.tableNameInput;

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

    // Store containers in elements
    this.elements.tableSearchContainer = container;
    this.elements.dropdownContainer = dropdownContainer;

    this.setupSearchEventListeners(container, dropdownContainer, tableNameInput);
  }

  setupSearchEventListeners(container, dropdownContainer, tableNameInput) {
    // Event Listeners
    tableNameInput.addEventListener("input", (e) => this.handleSearchInput(e));
    tableNameInput.addEventListener("keydown", (e) => this.handleSearchKeyDown(e));

    // Close dropdown when clicking outside
    document.addEventListener("click", (event) => {
      if (!container.contains(event.target)) {
        dropdownContainer.style.display = "none";
        this.searchState.selectedIndex = -1;
      }
    });
  }

  handleSearchInput(event) {
    const input = event.target.value.trim();
    this.elements.tableNameInput.style.borderColor = "";

    if (!input) {
      const results = this.schemaStorageService.searchSavedSchemas("").slice(0, 7);
      this.showSearchDropdown(results);
      return;
    }

    const parts = input.split(".");
    if (!this.validateSearchInput(parts)) {
      return;
    }

    const results = this.schemaStorageService.searchSavedSchemas(input);
    this.showSearchDropdown(results);
  }

  handleSearchKeyDown(event) {
    if (this.elements.dropdownContainer.style.display === "none" && event.key === "ArrowDown") {
      const results = this.schemaStorageService.searchSavedSchemas("").slice(0, 7);
      this.showSearchDropdown(results);
      this.searchState.selectedIndex = -1;
      return;
    }

    if (this.elements.dropdownContainer.style.display === "block") {
      this.handleDropdownNavigation(event);
    }
  }

  loadMostRecentSchema() {
    const allTables = this.schemaStorageService.getAllTables();
    if (allTables.length > 0) {
      const mostRecent = allTables[0];
      const schema = this.schemaStorageService.loadSchema(mostRecent.fullName);
      if (schema) {
        this.elements.tableNameInput.value = mostRecent.fullName;
        this.schemaTable.loadData(schema);
        this.updateDataSpreadsheet();
      }
    }
  }

  setupSchemaImport() {
    this.elements.importSchemasButton.addEventListener("click", () => {
      this.elements.schemaFileInput.click();
    });

    this.elements.schemaFileInput.addEventListener("change", async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const jsonData = JSON.parse(text);

        if (!this.isValidSchemaFormat(jsonData)) {
          throw new Error("Invalid schema format");
        }

        let importCount = 0;

        Object.entries(jsonData).forEach(([schemaName, tables]) => {
          Object.entries(tables).forEach(([tableName, schema]) => {
            const fullTableName = `${schemaName}.${tableName}`;
            if (this.schemaStorageService.saveSchema(fullTableName, schema)) {
              importCount++;
            }
          });
        });

        this.updateSavedSchemasList();
        this.showSuccess(`Successfully imported ${importCount} table schemas`);
        setTimeout(() => this.clearError(), 3000);
      } catch (error) {
        this.showError(`Failed to import schemas: ${error.message}`);
      } finally {
        event.target.value = ""; // Reset file input
      }
    });
  }

  isValidSchemaFormat(data) {
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

  createSchemaOverlay() {
    this.elements.showSavedSchemasButton.addEventListener("click", () => {
      this.elements.schemaOverlay.classList.remove("hidden");
      this.updateSavedSchemasList();
    });

    this.elements.closeSchemaOverlayButton.addEventListener("click", () => {
      this.elements.schemaOverlay.classList.add("hidden");
    });

    this.elements.schemaOverlay.addEventListener("click", (e) => {
      if (e.target === this.elements.schemaOverlay) {
        this.elements.schemaOverlay.classList.add("hidden");
      }
    });

    this.elements.exportSchemasButton.addEventListener("click", () => {
      const allTables = this.schemaStorageService.getAllTables();
      if (allTables.length === 0) {
        this.showError("No schemas to export");
        return;
      }
      this.exportSchemas();
    });

    this.elements.clearAllSchemasButton.addEventListener("click", () => {
      const allTables = this.schemaStorageService.getAllTables();
      if (allTables.length === 0) {
        this.showError("No schemas to clear");
        return;
      }
      if (confirm("Are you sure you want to clear all saved schemas? This cannot be undone.")) {
        this.handleClearAllSchemas();
      }
    });

    this.setupSchemaImport();
  }
}

// Export the main initialization function
export async function initQuickQuery(container) {
  const quickQueryUI = new QuickQueryUI(container);
  await quickQueryUI.init();
  return quickQueryUI;
}
