export const MAIN_TEMPLATE = `<div class="tool-container quick-query-tool-container">
    <div class="quick-query-content">
        <div class="content-a">
            <div class="quick-query-left-panel">
                <div class="button-group">
                    <select id="queryTypeSelect">
                        <option value="merge">MERGE INTO</option>
                        <option value="insert">INSERT INTO</option>
                    </select>
                    <input type="text" id="tableNameInput" placeholder="schema_name.table_name"
                        value="schema_name.table_name">
                </div>
                <div class="button-group quick-query-left-controls">
                    <button id="showSavedSchemas">Manage Saved Schemas</button>
                    <button id="addNewSchemaRow">Add row</button>
                    <button id="removeLastSchemaRow">Remove last row</button>
                    <button id="clearAll">Clear All</button>
                    <button id="generateQuery">Generate Query</button>
                </div>

                <div id="spreadsheet-schema"></div>

                <div id="attachments-container" class="attachment-container-hide">
                    <p>Drag and drop attachments here or click to select. Supports: txt, jpg, png ,
                        html, pdf and json</p>
                    <input type="file" id="attachmentsInput" accept=".txt, .jpg, .jpeg, .png , .html, .pdf, .json"
                        multiple style="display: none;" />
                </div>
                <div id="files-container"></div>

                <div id="guideContainer">
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
                <div class="simulate-buttons">
                    <button id="addFieldNames">Add field names from schema</button>
                    <button id="addDataRow">Add Row</button>
                    <button id="removeDataRow">Remove Last Row</button>
                    <button id="clearData">Clear Data</button>
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

<div id="fileViewerOverlay" class="file-viewer-overlay hidden">
    <div class="file-viewer-modal">
        <div class="file-viewer-header">
            <h3 id="fileViewerTitle">File Name</h3>
            <button id="closeFileViewer" class="overlay-close-button">&times;</button>
        </div>

        <div class="file-viewer-tabs">
            <button class="tab-button active" data-tab="original">Original</button>
            <button class="tab-button" data-tab="processed">Processed</button>
        </div>

        <div class="file-viewer-content">
            <div id="originalContent" class="tab-content active">
                <!-- Content will be dynamically inserted -->
            </div>
            <div id="processedContent" class="tab-content">
                <!-- Content will be dynamically inserted -->
            </div>
        </div>

        <div class="file-viewer-metadata">
            <div id="fileMetadata">
                <div class="metadata-grid">
                    <div id="fileType">File Type: -</div>
                    <div id="fileSize">Size: -</div>
                    <div id="base64Size" class="hidden">Base64 Size: -</div>
                    <div id="dimensions" class="hidden">Dimensions: -</div>
                    <div id="lineCount" class="hidden">Lines: -</div>
                    <div id="charCount" class="hidden">Characters: -</div>
                </div>
            </div>
        </div>
    </div>
</div>`;

export const GUIDE_TEMPLATE = `<button id="toggleGuide" class="toggle-guide">Tutorial & Simulation</button>
<div id="guide" class="guide-content hidden">
    <h4>Quick Guide:</h4>
    <ul>
        <li>Copy and paste your database schema.</li>
        <li>Use "PK" in the Nullable field to indicate Primary Keys. If no "PK" is stated, default
            PK would be field[0].</li>
        <li>You can have multiple primary keys.</li>
        <li>Fill in the Data Input with your values.</li>
        <li>Click buttons below to simulate the query generation.</li>
    </ul>
    <div class="button-group simulate-buttons">
        <button id="simulationFillSchemaButton" class="simulate-button">1. Fill Schema</button>
        <p>&rarr;</p>
        <button id="simulationFillDataButton" class="simulate-button">2. Fill Data</button>
        <p>&rarr;</p>
        <button id="simulationGenerateQueryButton" class="simulate-button">3. Generate
            Query</button>
    </div>
</div>`;

export const FILE_BUTTON_TEMPLATE = (file) => `
  <div class="file-info">
    <button class="copy-filename" title="Copy filename">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
    </button>
    <span class="file-name">${file.name}</span>
  </div>
  <div class="file-actions">
    <span class="file-size">${(file.size / 1024).toFixed(2)} KB</span>
    <button class="delete-file" title="Delete file">×</button>
  </div>
`;
