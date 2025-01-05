import { copyToClipboard, pasteFromClipboard } from "../utils/buttons.js";
import {
  initCodeMirror,
  createCodeMirrorInstance,
} from "../utils/codeMirror.js";
// import { getDomains } from "../config/domains.js";
import { parseVelocityTemplate } from "../utils/vtlParser.js";

export async function initHtmlTemplate(container, updateHeaderTitle) {
  await initCodeMirror();

  // Try to load js-beautify from CDN, fall back to local if it fails
  try {
    await loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.14.0/beautify-html.min.js"
    );
  } catch (error) {
    console.warn(
      "Failed to load js-beautify from CDN, falling back to local version"
    );
    await loadScript("public/js/beautify-html.min.js");
  }

  // updateHeaderTitle("Inbox/Email HTML Template");

  // HTML structure
  container.innerHTML = `
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
          <textarea id="html-editor"></textarea>
          <div class="dynamic-fields-container">
            <h3 id="sectionText">Dynamic Fields</h3 id="sectionText">
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

  // Element selections
  const editor = createCodeMirrorInstance(
    document.getElementById("html-editor"),
    {
      mode: "htmlmixed",
      lineWrapping: true,
      lineNumbers: true,
      theme: "default",
      autoCloseTags: true,
      autoCloseBrackets: true,
      matchBrackets: true,
      indentUnit: 2,
      tabSize: 2,
      indentWithTabs: false,
      extraKeys: { "Ctrl-Space": "autocomplete" },
    }
  );

  const copyButton = document.getElementById("copyButton");
  const pasteButton = document.getElementById("pasteButton");
  const toggleWrapButton = document.getElementById("toggleWrapButton");
  const toggleHighlightButton = document.getElementById(
    "toggleHighlightButton"
  );
  const baseUrlSelect = document.getElementById("baseUrl");
  const dynamicFieldsContainer = document.getElementById("dynamicFields");

  // Set initial button states
  toggleWrapButton.textContent = "Disable Word Wrap";
  toggleHighlightButton.textContent = "Disable Syntax Highlight";

  // // Populate baseUrl select
  // const domains = getDomains();
  // for (const [key, value] of Object.entries(domains)) {
  //   const option = document.createElement("option");
  //   option.value = value;
  //   option.textContent = key;
  //   baseUrlSelect.appendChild(option);
  // }

  // Core functionalities
  function toggleWordWrap() {
    const isWrapped = editor.getOption("lineWrapping");
    editor.setOption("lineWrapping", !isWrapped);
    toggleWrapButton.textContent = isWrapped
      ? "Enable Word Wrap"
      : "Disable Word Wrap";
  }

  function toggleSyntaxHighlight() {
    const isHighlightEnabled = editor.getOption("mode") === "htmlmixed";
    editor.setOption("mode", isHighlightEnabled ? null : "htmlmixed");
    toggleHighlightButton.textContent = isHighlightEnabled
      ? "Enable Syntax Highlight"
      : "Disable Syntax Highlight";
  }

  function formatHTML() {
    if (typeof html_beautify === "undefined") {
      console.error(
        "html_beautify is not available. Falling back to basic formatting."
      );
      basicFormatHTML();
      return;
    }
    const unformatted = editor.getValue();
    const formatted = html_beautify(unformatted, {
      indent_size: 2,
      wrap_line_length: 0,
      preserve_newlines: true,
      max_preserve_newlines: 1,
      end_with_newline: false,
      extra_liners: [],
    });
    editor.setValue(formatted);
  }

  function basicFormatHTML() {
    const unformatted = editor.getValue();
    const formatted = unformatted
      .replace(/>\s+</g, ">\n<")
      .replace(/(<[^/].*?>)/g, "\n$1")
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map(
        (line) => "  ".repeat(line.match(/^\s*/)[0].length / 2) + line.trim()
      )
      .join("\n");
    editor.setValue(formatted);
  }

  function minifyHTML() {
    const minified = editor
      .getValue()
      .replace(/\s+/g, " ")
      .replace(/> </g, "><");
    editor.setValue(minified);
  }

  function updatePreview() {
    const content = editor.getValue();
    const replacedContent = replaceVariables(content);
    const parsedContent = parseVelocityTemplate(replacedContent);
    const previewDocument =
      document.getElementById("htmlPreview").contentDocument;
    previewDocument.open();
    previewDocument.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <base href="${baseUrlSelect.value}/" target="_blank">
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <style>
            body { 
              margin: 0;
              padding: 0;
              width: 100%;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
              overflow-x: hidden;
            }
            img {
              max-width: 100%;
              height: auto;
            }
            table {
              width: 100% !important;
              height: auto !important;
            }
            td {
              word-break: break-word;
            }
          </style>
        </head>
        <body>
          ${parsedContent}
        </body>
      </html>
    `);
    previewDocument.close();
  }

  function replaceVariables(content) {
    let replaced = content.replace(/\${baseUrl}/g, baseUrlSelect.value);
    document.querySelectorAll("#dynamicFields input").forEach((input) => {
      const regex = new RegExp(`\\$\\{${input.name}\\}`, "g");
      replaced = replaced.replace(regex, input.value);
    });
    return replaced;
  }

  function detectDynamicFields() {
    const content = editor.getValue();
    const fieldRegex = /\$\{([^}]+)\}/g;
    const fields = new Set();
    let match;
    while ((match = fieldRegex.exec(content)) !== null) {
      if (match[1] !== "baseUrl") {
        fields.add(match[1]);
      }
    }

    dynamicFieldsContainer.innerHTML = "";
    fields.forEach((field) => {
      const input = document.createElement("input");
      input.type = "text";
      input.name = field;
      input.placeholder = field;
      input.value = field;
      dynamicFieldsContainer.appendChild(input);
    });
  }

  function loadImages() {
    const iframe = document.getElementById("htmlPreview");
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    const images = iframeDoc.getElementsByTagName("img");
    for (let img of images) {
      const currentSrc = img.src;
      img.src = "about:blank";
      img.src = currentSrc;
    }
  }

  // Event listeners
  editor.on("change", () => {
    detectDynamicFields();
    updatePreview();
  });

  document.getElementById("formatButton").addEventListener("click", formatHTML);
  document.getElementById("minifyButton").addEventListener("click", minifyHTML);
  document
    .getElementById("copyButton")
    .addEventListener("click", () =>
      copyToClipboard(editor.getValue(), copyButton)
    );
  document.getElementById("pasteButton").addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      editor.setValue(text);
    } catch (err) {
      console.error("Failed to read clipboard contents: ", err);
    }
  });
  document
    .getElementById("clearButton")
    .addEventListener("click", () => editor.setValue(""));
  document
    .getElementById("loadImagesButton")
    .addEventListener("click", loadImages);
  toggleWrapButton.addEventListener("click", toggleWordWrap);
  toggleHighlightButton.addEventListener("click", toggleSyntaxHighlight);
  baseUrlSelect.addEventListener("change", updatePreview);
  dynamicFieldsContainer.addEventListener("input", updatePreview);

  // Initial update
  updatePreview();
}

// Modify the loadScript function to throw an error if loading fails
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}
