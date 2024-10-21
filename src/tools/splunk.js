import { copyToClipboard, pasteFromClipboard } from "../utils/buttons.js";

export function initSplunkTemplate(container, updateHeaderTitle) {
  // updateHeaderTitle("Splunk Template");
  const html = `
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
  container.innerHTML = html;

  // Elements Selections
  const formatButton = document.getElementById("formatButton");
  const minifyButton = document.getElementById("minifyButton");
  const copyButton = document.getElementById("copyButton");
  const pasteButton = document.getElementById("pasteButton");
  const clearButton = document.getElementById("clearButton");
  const toggleHighlightButton = document.getElementById(
    "toggleHighlightButton"
  );
  const removeSpacesButton = document.getElementById("removeSpacesButton");
  const scriptDependencies = [
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/codemirror.min.js",
  ];

  let editor;
  let highlightingEnabled = true;

  // Define Splunk mode
  function defineSplunkMode() {
    CodeMirror.defineMode("splunk", () => ({
      token: function (stream, state) {
        if (stream.match(/^[^=|]+=/)) {
          state.fieldName = stream.string.slice(stream.start, stream.pos - 1);
          state.expectValue = true;
          return "key";
        }
        if (state.expectValue) {
          if (stream.match(/^\s+/)) {
            state.hasSpaceAfterEquals = true;
            return "error"; // Space after '=' is an error
          }
          if (stream.match(/^\$!{date\.convertDate\(/)) {
            state.inVTLFormat = true;
            return "vtl-format";
          }
          if (stream.match(/^\$!{context\.[^}]+}/)) {
            return "context";
          }
          if (state.inVTLFormat) {
            if (stream.match(/^\$!{context\.[^}]+}/)) {
              return "vtl-value";
            }
            if (stream.match(/^'[^']+'/)) {
              return "vtl-parameter";
            }
            if (stream.match(/^\)/)) {
              state.inVTLFormat = false;
              return "vtl-format";
            }
          }
          if (stream.match(/^\$!{[^}]+}/)) {
            return state.hasSpaceAfterEquals ? "variable-error" : "context";
          }
          if (stream.match(/'[^']+'/)) {
            return "string"; // For date format strings
          }
          if (stream.match(/^[^|]+/)) {
            return "hardcoded";
          }
        }
        if (stream.match(/\|/)) {
          state.expectValue = false;
          state.hasSpaceAfterEquals = false;
          state.inVTLFormat = false;
          return "delimiter";
        }
        stream.next();
        return null;
      },
      startState: function () {
        return {
          expectValue: false,
          hasSpaceAfterEquals: false,
          fieldName: "",
          inVTLFormat: false,
        };
      },
    }));
  }

  // Initialize CodeMirror
  function initializeEditor() {
    defineSplunkMode();

    editor = CodeMirror(document.getElementById("splunkEditor"), {
      mode: "splunk",
      lineNumbers: true,
      theme: "default",
      lineWrapping: true,
      styleSelectedText: true,
      value: `eventType=[EVENT_NAME]|
description=|
channelCode=EVE|
channelName=EVE|
cifNo= $!{context.cifNo}|
mobilePhone= $!{context.mobilePhone}|
amount=$!{context.amount}|
transactionDate=$!{date.convertDate($!{context.transactionDate},'yyyy-MM-dd HH:mm:ss')}`,
    });
    console.log("Editor initialized");
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

  // Helper functions
  function formatText(text, shouldMinify) {
    if (shouldMinify) {
      return text.replace(/\s*\n\s*/g, "");
    } else {
      return text
        .split("|")
        .map((part) => part.trim())
        .join("|\n");
    }
  }

  function removeSpacesAfterEquals(text) {
    return text.replace(/\s*=\s*/g, "=");
  }

  function toggleHighlighting() {
    highlightingEnabled = !highlightingEnabled;
    if (highlightingEnabled) {
      defineSplunkMode();
      editor.setOption("mode", "splunk");
    } else {
      editor.setOption("mode", null);
    }
    toggleHighlightButton.textContent = highlightingEnabled
      ? "Disable Highlight"
      : "Enable Highlight";
  }

  // Attach event listeners
  formatButton.addEventListener("click", () => {
    const formattedText = formatText(editor.getValue(), false);
    editor.setValue(formattedText);
  });

  minifyButton.addEventListener("click", () => {
    const minifiedText = formatText(editor.getValue(), true);
    editor.setValue(minifiedText);
  });

  copyButton.addEventListener("click", () => {
    copyToClipboard(editor.getValue(), copyButton);
  });

  pasteButton.addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      editor.setValue(text);
    } catch (err) {
      console.error("Failed to read clipboard contents: ", err);
    }
  });

  clearButton.addEventListener("click", () => {
    editor.setValue("");
  });

  toggleHighlightButton.addEventListener("click", toggleHighlighting);

  removeSpacesButton.addEventListener("click", () => {
    const currentText = editor.getValue();
    const textWithoutSpaces = removeSpacesAfterEquals(currentText);
    editor.setValue(textWithoutSpaces);
  });
}
