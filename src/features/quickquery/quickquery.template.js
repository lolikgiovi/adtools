export const quickQueryMainHtmlPage = `
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

export const quickQueryErrorHtmlPage = `
<div class="tool-container quick-query-tool-container">
  <div class="quick-query-error-state">
    <div class="error-message"></div>
    <button class="retry-button">Retry Loading</button>
  </div>
</div>
`;

export const quickQueryTutorialHtmlPage = `
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
`;
