export const splunkTemplate = `
    <div class="tool-container splunk-container">
      <div class="splunk-controls button-group">
        <button id="formatButton">Format</button>
        <button id="minifyButton">Minify</button>
        <button id="copyButton">Copy</button>
        <button id="pasteButton">Paste</button>
        <button id="clearButton">Clear</button>
        <button id="toggleHighlightButton">Highlight</button>
        <button id="removeSpacesButton">Remove Spaces After =</button>
      </div>
      <div class="splunk-content">
        <div id="splunkEditor" class="splunk-content-area"></div>
      </div>
    </div>
  `;