export const htmlTemplate = `
    <div class="tool-container html-preview-formatter-container">
      <div class="editor-preview-container">
        <div class="html-preview-formatter-content">
          <div class="html-preview-formatter-controls button-group">
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
        <div class="preview-container button-group">
          <div class="iphone-simulator">
            <iframe id="htmlPreview"></iframe>
          </div>
        </div>
      </div>
    </div>
  `;