export const querifyTemplate = `
<div class="tool-container querify-tool-container">
  <div class="querify-left-panel">
    <div id="dragDropArea" class="querify-drag-drop-area wide">
      <p>Drag and drop files here or click to select</p>
      <input type="file" id="querifyInputFiles" accept=".xlsx, .xls, .txt, .jpg, .jpeg, .png " multiple style="display: none;" />
    </div>
    <div class="querify-file-list">
      <div id="excelFiles"></div>
      <div id="textFiles"></div>
      <div id="imageFiles"></div>
    </div>
  </div>
  <div class="querify-right-panel">
    <div class="button-group querify-button-group">
      <select id="queryType">
        <option value="merge-classic">MERGE INTO (Querify Classic)</option>
        <option value="merge">MERGE INTO (Compact)</option>
        <option value="insert">INSERT INTO</option>
      </select>
      <button id="generateAll" title="Generate queries for all files">Generate All</button>
      <button id="copySQL">Copy</button>
      <button id="downloadSQL">Download</button>
      <button id="downloadAll">Download All</button>
      <button id="toggleWrap">Word Wrap</button>
      <button id="splitSQL" title="Split query into 90 kilobytes chunks for Jenkins execution" disabled>Split</button>
    </div>
    <div id="errorMessages"></div>
    <div id="queryEditor" class="querify-content-area"></div>
    <div id="imagePreviewContainer" class="querify-content-area" style="display: none;">
      <img id="imagePreview" style="max-width: 100%; max-height: 300px;">
      <div id="imageInfo"></div>
    </div>
    <div id="textPreviewContainer" class="querify-content-area" style="display: none;">
      <pre id="textPreview"></pre>
    </div>
    <div id="progressBar" class="querify-progress-bar" style="display: none;">
      <div class="progress"></div>
    </div>
  </div>
  <button id="aboutQuerify" class="about-button">?</button>
</div>
`;
