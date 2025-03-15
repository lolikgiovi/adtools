export const queryInTemplate = `
    <div class="tool-container">
      <h3 id="sectionText">Values</h3>
      <textarea id="inputValues" placeholder="Enter values of the field, one per line"></textarea>
      <div class="button-group">
        <div class="input-group">
          <label for="schemaName">Schema Name</label>
          <input type="text" id="schemaName" placeholder="Schema Name" value="">
        </div>
        <div class="input-group">
          <label for="tableName">Table Name</label>
          <input type="text" id="tableName" placeholder="Table Name" value="">
        </div>
        <div class="input-group">
          <label for="fieldName">Field Name</label>
          <input type="text" id="fieldName" placeholder="Field Name" value="">
        </div>
      </div>
      <div class="button-group">
        <button id="generateButton">Generate</button>
        <button id="clearButton">Clear</button>
        <button id="pasteButton">Paste</button>
      </div>
    </div>
    <div class="tool-container">
      <h3 id="sectionText">Generated Query</h3>
      <div id="outputQueryEditor" class="queryin-content-area"></div>
      <div class="button-group">
        <button id="copyButton">Copy</button>
        <button id="clearResultButton">Clear</button>
      </div>
    </div>
`;
