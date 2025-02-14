export const htmlTemplate = `
    <div class="tool-container html-preview-formatter-container">
      <div class="editor-preview-container">
        <div class="html-preview-formatter-content">
          <div class="html-preview-formatter-controls button-group">
            <button id="openFileButton">Open File</button>
            <button id="formatButton">Format</button>
            <button id="minifyButton">Minify</button>
            <button id="copyButton">Copy</button>
            <button id="pasteButton">Paste</button>
            <button id="clearButton">Clear</button>
            <button id="toggleWrapButton">Word Wrap</button>
            <button id="toggleHighlightButton">Syntax Highlight</button>
          </div>
          <div id="html-editor" class="html-content-area"></div>
          <div class="dynamic-fields-container">
            <h3 id="sectionText">Dynamic Fields</h3>
            <div id="dynamicFields"></div>
          </div>
        </div>
        <div class="preview-container">
          <div class="preview-controls button-group">
            <select id="baseUrlSelect">
              <option value="">Select Base URL</option>
            </select>
            <button id="manageBaseUrls">URLs</button>
            <button id="loadImagesButton">Reload</button>
          </div>
          <div class="iphone-simulator">
            <iframe id="htmlPreview"></iframe>
          </div>
        </div>
      </div>
    </div>

  <div id="urlManagementOverlay" class="overlay hidden">
    <div class="overlay-content">
      <h2>Manage Base URLs</h2>
        <div class="url-input-group">
          <input type="text" id="newBaseUrlName" placeholder="Enter name">
          <input type="text" id="newBaseUrl" placeholder="Enter URL">
          <button id="addBaseUrl">Add</button>
        </div>
      <div id="baseUrlsList"></div>
      <div class="overlay-actions">
        <button id="clearAllUrls">Clear All</button>
        <button id="closeUrlManagement">Close</button>
      </div>
    </div>
  </div>
  `;
