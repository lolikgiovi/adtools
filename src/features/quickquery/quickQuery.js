import { copyToClipboard } from "../../utils/buttons.js";
import { getQuickQueryMainHtmlPage, getQuickQueryTutorialHtmlPage } from "./constants/Templates.js";
import { LocalStorageService } from "./services/LocalStorageService.js";
import { QueryGenerationService } from "./services/QueryGenerationService.js";
import { SchemaValidationService, isDbeaverSchema } from "./services/SchemaValidationService.js";
import { DependencyLoader } from "../../utils/dependencyLoader.js";
import { sampleSchema1, sampleData1 } from "./constants/Constants.js";
import { initialSchemaTableSpecification, initialDataTableSpecification } from "./constants/Constants.js";
import { AttachmentProcessorService } from "./services/AttachmentProcessorService.js";

export class QuickQueryUI {
  constructor(container, updateHeaderTitle) {
    this.container = container;
    this.updateHeaderTitle = updateHeaderTitle;
    this.editor = null;
    this.schemaTable = null;
    this.dataTable = null;
    this.elements = {};
    this.localStorageService = new LocalStorageService();
    this.schemaValidationService = new SchemaValidationService();
    this.queryGenerationService = new QueryGenerationService();
    this.attachmentProcessorService = new AttachmentProcessorService();
    this.isGuideActive = false;
    this.isAttachmentActive = false;

    // Initialize search state
    this.searchState = {
      selectedIndex: -1,
      visibleItems: [],
    };
  }

  async init() {
    try {
      this.container.innerHTML = await getQuickQueryMainHtmlPage();
      if (this.isGuideActive) {
        document.getElementById("guideContainer").innerHTML = await getQuickQueryTutorialHtmlPage();
      }
      this.bindElements();
      this.clearError();
      await DependencyLoader.loadDependency("handsontable");
      await DependencyLoader.loadDependency("codemirror");
      await this.initializeComponents();
      this.setupEventListeners();
      this.setupTableNameSearch();
      this.loadMostRecentSchema();
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
      this.initializeSpreadsheets();
      this.initializeEditor();
      this.elements.filesContainer.classList.add("hidden");
      this.elements.attachmentsContainer.classList.remove("hidden");
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

      // Attachments components
      attachmentsContainer: document.getElementById("attachments-container"),
      attachmentsInput: document.getElementById("attachmentsInput"),
      filesContainer: document.getElementById("files-container"),

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
    const eventMap = {
      // Input elements
      tableNameInput: {
        input: (e) => this.handleSearchInput(e),
        keydown: (e) => this.handleSearchKeyDown(e),
      },
      queryTypeSelect: {
        change: () => this.handleGenerateQuery(),
      },
      schemaFileInput: {
        change: (e) => this.handleSchemaFileInput(e),
      },
      // Query related buttons
      generateQuery: {
        click: () => this.handleGenerateQuery(),
      },
      copySQL: {
        click: (e) => copyToClipboard(this.editor.getValue(), e.target),
      },
      clearAll: {
        click: () => this.handleClearAll(),
      },
      downloadSQL: {
        click: () => this.handleDownloadSql(),
      },
      toggleWordWrapButton: {
        click: () => this.handleToggleWordWrap(),
      },

      // Attachments related
      attachmentsContainer: {
        click: () => this.elements.attachmentsInput.click(),
        dragOver: (e) => this.handleDragOver(e),
        dragLeave: (e) => this.handleDragLeave(e),
        drop: (e) => this.handleDrop(e),
      },
      attachmentsInput: {
        change: (e) => this.handleAttachmentsInput(e),
      },

      // Guide related buttons
      toggleGuideButton: {
        click: () => this.handleToggleGuide(),
      },
      simulationFillSchemaButton: {
        click: () => this.handleSimulationFillSchema(),
      },
      simulationFillDataButton: {
        click: () => this.handleSimulationFillData(),
      },
      simulationGenerateQueryButton: {
        click: () => this.handleSimulationGenerateQuery(),
      },

      // Data related buttons
      addFieldNames: {
        click: () => this.handleAddFieldNames(),
      },
      addDataRow: {
        click: () => this.handleAddDataRow(),
      },
      removeDataRow: {
        click: () => this.handleRemoveDataRow(),
      },
      clearData: {
        click: () => this.handleClearData(),
      },

      // Schema related buttons
      addNewSchemaRow: {
        click: () => this.handleAddNewSchemaRow(),
      },
      removeLastSchemaRow: {
        click: () => this.handleRemoveLastSchemaRow(),
      },
      showSavedSchemasButton: {
        click: () => {
          this.elements.schemaOverlay.classList.remove("hidden");
          this.updateSavedSchemasList();
        },
      },
      closeSchemaOverlayButton: {
        click: () => this.elements.schemaOverlay.classList.add("hidden"),
      },
      exportSchemasButton: {
        click: () => this.handleExportSchemas(),
      },
      clearAllSchemasButton: {
        click: () => this.handleClearAllSchemas(),
      },
      importSchemasButton: {
        click: () => this.elements.schemaFileInput.click(),
      },
    };

    // Bind all event handlers
    Object.entries(eventMap).forEach(([elementId, events]) => {
      const element = this.elements[elementId] || document.getElementById(elementId);
      if (element) {
        Object.entries(events).forEach(([event, handler]) => {
          element.addEventListener(event, handler);
        });
      } else {
        console.warn(`Element '${elementId}' not found`);
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

  initializeSpreadsheets() {
    const schemaTableConfig = {
      ...initialSchemaTableSpecification,
      afterChange: (changes) => {
        if (changes) {
          this.updateDataSpreadsheet();
          this.handleAddFieldNames();
        }
      },
      afterGetColHeader: function (col, TH) {
        const header = TH.querySelector(".colHeader");
        if (header) {
          header.style.fontWeight = "bold";
        }
      },
    };
    this.schemaTable = new Handsontable(this.elements.schemaContainer, schemaTableConfig);

    const dataTableConfig = {
      ...initialDataTableSpecification,
      afterChange: (changes, source) => {
        if (!changes || source === "loadData") return; // Skip if no changes or if change is from loading data

        const tableName = this.elements.tableNameInput.value.trim();
        if (!tableName) return; // Skip if no table name

        // Only save if there are actual changes
        if (changes.length > 0) {
          const currentData = this.dataTable.getData();
          this.localStorageService.updateTableData(tableName, currentData);
        }
      },
    };

    this.dataTable = new Handsontable(this.elements.dataContainer, dataTableConfig);
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
      this.elements.errorMessages.innerHTML = message;
      this.elements.errorMessages.style.display = "block";
      this.elements.errorMessages.style.color = "green";
    }
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

      this.localStorageService.saveSchema(tableName, schemaData, inputData);

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

  handleClearData() {
    const schemaData = this.schemaTable.getData().filter((row) => row[0]);
    const fieldNames = schemaData.map((row) => row[0]);
    const newData = [fieldNames, Array(fieldNames.length).fill(null)];

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
    const allTables = this.localStorageService.getAllTables();
    if (allTables.length === 0) {
      this.showError("No schemas to clear");
      return;
    }

    if (!confirm("Are you sure you want to clear all saved schemas? This cannot be undone.")) {
      return;
    }

    const schemaCleared = this.localStorageService.clearAllSchemas();
    if (schemaCleared) {
      this.showSuccess("All saved schemas have been cleared");
      this.elements.schemaOverlay.classList.add("hidden");
    } else {
      this.showError("Failed to clear all saved schemas");
    }
  }

  // Schema management methods
  updateSavedSchemasList() {
    const allTables = this.localStorageService.getAllTables();

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
    const result = this.localStorageService.loadSchema(fullName, true);
    if (result) {
      this.elements.tableNameInput.value = fullName;
      this.schemaTable.loadData(result.schema);
      this.updateDataSpreadsheet();

      // Load cached data if available
      if (result.data) {
        this.dataTable.loadData(result.data);
      } else {
        this.handleAddFieldNames();
        this.handleClearData();
      }

      this.elements.schemaOverlay.classList.add("hidden");
      this.clearError();
    } else {
      this.showError(`Failed to load schema for ${fullName}`);
    }
  }

  handleDeleteSchema(fullName) {
    if (confirm(`Delete schema for ${fullName}?`)) {
      const deleted = this.localStorageService.deleteSchema(fullName);
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

  handleExportSchemas() {
    const allTables = this.localStorageService.getAllTables();
    if (allTables.length === 0) {
      this.showError("No schemas to export");
      return;
    }

    const exportData = {};
    allTables.forEach((table) => {
      const schema = this.localStorageService.loadSchema(table.fullName);
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
      const results = this.localStorageService.searchSavedSchemas("").slice(0, 7);
      this.showSearchDropdown(results);
      return;
    }

    const parts = input.split(".");
    if (
      !this.localStorageService.validateOracleName(parts[0], "schema") ||
      !this.localStorageService.validateOracleName(parts[1], "table")
    ) {
      return;
    }

    const results = this.localStorageService.searchSavedSchemas(input);
    this.showSearchDropdown(results);
  }

  handleSearchKeyDown(event) {
    if (this.elements.dropdownContainer.style.display === "none" && event.key === "ArrowDown") {
      const results = this.localStorageService.searchSavedSchemas("").slice(0, 7);
      this.showSearchDropdown(results);
      this.searchState.selectedIndex = -1;
      return;
    }

    if (this.elements.dropdownContainer.style.display === "block") {
      this.handleDropdownNavigation(event);
    }
  }

  showSearchDropdown(results) {
    const dropdownContainer = this.elements.dropdownContainer;
    dropdownContainer.innerHTML = "";
    this.searchState.visibleItems = [];
    this.searchState.selectedIndex = -1;

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
        this.searchState.visibleItems.push(item);

        item.addEventListener("click", () => this.selectSearchResult(table.fullName));

        schemaGroup.appendChild(item);
      });

      dropdownContainer.appendChild(schemaGroup);
    });

    dropdownContainer.style.display = "block";
  }

  selectSearchResult(fullName) {
    this.elements.tableNameInput.value = fullName;
    this.elements.dropdownContainer.style.display = "none";
    this.handleLoadSchema(fullName);

    // Reset selection
    this.searchState.selectedIndex = -1;
    this.elements.tableNameInput.focus();
  }

  handleDropdownNavigation(event) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        this.searchState.selectedIndex = Math.min(this.searchState.selectedIndex + 1, this.searchState.visibleItems.length - 1);
        this.updateSearchSelection();
        break;

      case "ArrowUp":
        event.preventDefault();
        this.searchState.selectedIndex = Math.max(this.searchState.selectedIndex - 1, -1);
        this.updateSearchSelection();
        break;

      case "Enter":
        event.preventDefault();
        if (this.searchState.selectedIndex >= 0 && this.searchState.selectedIndex < this.searchState.visibleItems.length) {
          this.selectSearchResult(this.searchState.visibleItems[this.searchState.selectedIndex].dataset.fullName);
        }
        break;

      case "Escape":
        this.elements.dropdownContainer.style.display = "none";
        this.searchState.selectedIndex = -1;
        break;
    }
  }

  updateSearchSelection() {
    this.searchState.visibleItems.forEach((item, index) => {
      if (index === this.searchState.selectedIndex) {
        item.classList.add("selected");
        item.scrollIntoView({ block: "nearest" });
      } else {
        item.classList.remove("selected");
      }
    });
  }

  loadMostRecentSchema() {
    const allTables = this.localStorageService.getAllTables();
    if (allTables.length > 0) {
      const mostRecent = allTables[0];
      this.handleLoadSchema(mostRecent.fullName);
    }
  }

  async handleSchemaFileInput(event) {
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
          if (this.localStorageService.saveSchema(fullTableName, schema)) {
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

  adjustDbeaverSchema(schemaData) {
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
    if (this.schemaTable && typeof this.schemaTable.loadData === "function") {
      try {
        // Clear existing data and load new data
        this.schemaTable.loadData(adjustedSchemaData);
        this.updateDataSpreadsheet();
      } catch (error) {
        console.error("Error updating schema table:", error);
      }
    }
  }

  async handleAttachmentsInput(e) {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      try {
        const processedFiles = await this.attachmentProcessorService.processAttachments(files);
        console.log("Processed files:", processedFiles);

        // Clear existing file buttons
        this.elements.filesContainer.innerHTML = "";

        // Create file buttons for each processed file
        processedFiles.forEach((file, index) => {
          const fileButton = document.createElement("button");
          fileButton.className = "file-button";
          fileButton.innerHTML = `
            <span class="file-name">${file.name}</span>
            <div class="file-actions">
              <span class="file-size">${(file.size / 1024).toFixed(2)} KB</span>
              <button class="delete-file" title="Delete file">×</button>
            </div>
          `;

          // Add click handler for the delete button
          const deleteBtn = fileButton.querySelector(".delete-file");
          deleteBtn.addEventListener("click", (e) => {
            e.stopPropagation(); // Prevent file button click
            processedFiles.splice(index, 1);
            fileButton.remove();

            // If no files left, show the upload container again
            if (processedFiles.length === 0) {
              this.elements.filesContainer.classList.add("hidden");
              this.elements.attachmentsContainer.classList.remove("hidden");
            }
          });

          fileButton.addEventListener("click", () => {
            console.log("File details:", file);
          });

          this.elements.filesContainer.appendChild(fileButton);
        });

        // Hide attachments container and show files container
        this.elements.attachmentsContainer.classList.add("hidden");
        this.elements.filesContainer.classList.remove("hidden");

        this.clearError();
      } catch (error) {
        this.showError(`Error processing attachments: ${error.message}`);
      }
    }
  }

  handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    this.attachmentsContainer.classList.add("drag-over");
  }

  handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    this.attachmentsContainer.classList.remove("drag-over");
  }

  handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    this.attachmentsContainer.classList.remove("drag-over");
  }
}

// Export the main initialization function
export async function initQuickQuery(container) {
  const quickQueryUI = new QuickQueryUI(container);
  await quickQueryUI.init();
  return quickQueryUI;
}
