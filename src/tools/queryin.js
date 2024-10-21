import { copyToClipboard, pasteFromClipboard } from "../utils/buttons.js";

export function initQueryInGenerator(container, updateHeaderTitle) {
  // updateHeaderTitle("Query IN Generator");
  const html = `
    <div class="tool-container">
      <h3 id="sectionText">Values</h3>
      <textarea id="inputValues" placeholder="Enter values of the field, one per line">notification_template_id_1
notification_template_id_2
notification_template_id_3
notification_template_id_4</textarea>
      <div class="button-group">
        <div class="input-group">
          <label for="schemaName">Schema Name</label>
          <input type="text" id="schemaName" placeholder="Schema Name" value="notification">
        </div>
        <div class="input-group">
          <label for="tableName">Table Name</label>
          <input type="text" id="tableName" placeholder="Table Name" value="notification_template">
        </div>
        <div class="input-group">
          <label for="fieldName">Field Name</label>
          <input type="text" id="fieldName" placeholder="Field Name" value="notification_template_id">
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
  container.innerHTML = html;

  let outputQueryEditor;

  // Element Selections
  const inputValues = document.getElementById("inputValues");
  const generateButton = document.getElementById("generateButton");
  const clearButton = document.getElementById("clearButton");
  const pasteButton = document.getElementById("pasteButton");
  const copyButton = document.getElementById("copyButton");
  const clearResultButton = document.getElementById("clearResultButton");
  const schemaName = document.getElementById("schemaName");
  const tableName = document.getElementById("tableName");
  const fieldName = document.getElementById("fieldName");

  const scriptDependencies = [
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/codemirror.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/mode/sql/sql.min.js",
  ];

  // Initialize CodeMirror instance for output
  function initializeEditor() {
    outputQueryEditor = CodeMirror(
      document.getElementById("outputQueryEditor"),
      {
        mode: "sql",
        lineNumbers: true,
        readOnly: true,
      }
    );
    // Call updateCodeMirror after editor initialization
    updateCodeMirror();
  }

  // Load CodeMirror script
  loadScriptInOrder(scriptDependencies);

  function loadScriptInOrder(scripts, index = 0) {
    if (index < scripts.length) {
      const script = document.createElement("script");
      script.src = scripts[index];
      script.onload = () => loadScriptInOrder(scripts, index + 1);
      document.head.appendChild(script);
    } else {
      initializeEditor();
    }
  }

  // Core Functionalities
  function generateQuery() {
    const values = inputValues.value
      .split("\n")
      .filter((value) => value.trim() !== "")
      .map((value) => `    '${value.trim()}'`)
      .join(",\n");

    const query = `SELECT *
FROM ${schemaName.value}.${tableName.value}
WHERE ${fieldName.value} IN (
${values});`;

    return query;
  }

  function updateCodeMirror() {
    const query = generateQuery();
    outputQueryEditor.setValue(query);
    outputQueryEditor.refresh();
  }

  // Event Listeners
  generateButton.addEventListener("click", updateCodeMirror);

  clearButton.addEventListener("click", () => {
    inputValues.value = "";
    fieldName.value = "";
    tableName.value = "";
    schemaName.value = "";
    updateCodeMirror();
  });

  clearResultButton.addEventListener("click", () => {
    outputQueryEditor.setValue("");
  });

  pasteButton.addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      inputValues.value = text;
      updateCodeMirror();
    } catch (err) {
      console.error("Failed to read clipboard contents: ", err);
    }
  });

  copyButton.addEventListener("click", () => {
    copyToClipboard(outputQueryEditor.getValue(), copyButton);
  });

  // Real time updates event listener
  [inputValues, schemaName, tableName, fieldName].forEach((element) => {
    element.addEventListener("input", updateCodeMirror);
  });

  function adjustInputWidth() {
    const inputs = document.querySelectorAll('.input-group input[type="text"]');
    inputs.forEach((input) => {
      input.addEventListener("input", function () {
        this.style.width = "auto"; // Temporarily shrink to content
        this.style.width = this.scrollWidth + 5 + "px"; // Set to scrollWidth + padding
      });
      // Trigger the event on page load
      input.dispatchEvent(new Event("input"));
    });
  }

  // Call the function when the DOM is fully loaded
  adjustInputWidth();
}
