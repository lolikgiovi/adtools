import { copyToClipboard } from "../../utils/buttons.js";
import { createCodeMirrorInstance } from "../../utils/codeMirror.js";
import { parseVelocityTemplate } from "../../utils/vtlParser.js";
import { htmlTemplate } from "./html.template.js";
import { HtmlService } from "./html.service.js";

export class HtmlUI {
  constructor(container) {
    this.container = container;
    this.htmlService = new HtmlService();
    this.editor = null;
    this.initializeUi();
    this.initializeEditor();
    this.bindElements();
    this.setupEventListeners();
  }

  initializeUi() {
    this.container.innerHTML = htmlTemplate;
  }

  bindElements() {
    this.elements = {
      copyButton: document.getElementById("copyButton"),
      pasteButton: document.getElementById("pasteButton"),
      toggleWrapButton: document.getElementById("toggleWrapButton"),
      toggleHighlightButton: document.getElementById("toggleHighlightButton"),
      baseUrlSelect: document.getElementById("baseUrl"),
      dynamicFieldsContainer: document.getElementById("dynamicFields"),
      htmlPreview: document.getElementById("htmlPreview")
    };

    // Set initial button states
    this.elements.toggleWrapButton.textContent = "Disable Word Wrap";
    this.elements.toggleHighlightButton.textContent = "Disable Syntax Highlight";
  }

  initializeEditor() {
    this.editor = CodeMirror(
      document.querySelector(".html-content-area"),
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
  }

  setupEventListeners() {
    this.editor.on("change", () => {
      this.detectDynamicFields();
      this.updatePreview();
    });

    document.getElementById("formatButton").addEventListener("click", () => this.formatHTML());
    document.getElementById("minifyButton").addEventListener("click", () => this.minifyHTML());
    document.getElementById("copyButton").addEventListener("click", () => 
      copyToClipboard(this.editor.getValue(), this.elements.copyButton)
    );
    document.getElementById("pasteButton").addEventListener("click", () => this.handlePaste());
    document.getElementById("clearButton").addEventListener("click", () => this.editor.setValue(""));
    document.getElementById("loadImagesButton")?.addEventListener("click", () => this.loadImages());
    this.elements.toggleWrapButton.addEventListener("click", () => this.toggleWordWrap());
    this.elements.toggleHighlightButton.addEventListener("click", () => this.toggleSyntaxHighlight());
    this.elements.baseUrlSelect?.addEventListener("change", () => this.updatePreview());
    this.elements.dynamicFieldsContainer.addEventListener("input", () => this.updatePreview());
  }

  toggleWordWrap() {
    const isWrapped = this.editor.getOption("lineWrapping");
    this.editor.setOption("lineWrapping", !isWrapped);
    this.elements.toggleWrapButton.textContent = isWrapped
      ? "Enable Word Wrap"
      : "Disable Word Wrap";
  }

  toggleSyntaxHighlight() {
    const isHighlightEnabled = this.editor.getOption("mode") === "htmlmixed";
    this.editor.setOption("mode", isHighlightEnabled ? null : "htmlmixed");
    this.elements.toggleHighlightButton.textContent = isHighlightEnabled
      ? "Enable Syntax Highlight"
      : "Disable Syntax Highlight";
  }

  formatHTML() {
    const formatted = this.htmlService.formatHTML(this.editor.getValue());
    this.editor.setValue(formatted);
  }

  minifyHTML() {
    const minified = this.htmlService.minifyHTML(this.editor.getValue());
    this.editor.setValue(minified);
  }

  updatePreview() {
    const content = this.editor.getValue();
    const dynamicFields = Array.from(document.querySelectorAll("#dynamicFields input"));
    const replacedContent = this.htmlService.replaceVariables(
      content,
      this.elements.baseUrlSelect?.value || "",
      dynamicFields
    );
    const parsedContent = parseVelocityTemplate(replacedContent);
    const previewDocument = this.elements.htmlPreview.contentDocument;
    
    previewDocument.open();
    previewDocument.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <base href="${this.elements.baseUrlSelect?.value || ''}/" target="_blank">
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

  detectDynamicFields() {
    const content = this.editor.getValue();
    const fields = this.htmlService.detectDynamicFields(content);

    this.elements.dynamicFieldsContainer.innerHTML = "";
    fields.forEach((field) => {
      const input = document.createElement("input");
      input.type = "text";
      input.name = field;
      input.placeholder = field;
      input.value = field;
      this.elements.dynamicFieldsContainer.appendChild(input);
    });
  }

  loadImages() {
    const iframeDoc = this.elements.htmlPreview.contentDocument || 
                      this.elements.htmlPreview.contentWindow.document;
    this.htmlService.reloadImages(iframeDoc);
  }

  async handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      this.editor.setValue(text);
    } catch (err) {
      console.error("Failed to read clipboard contents: ", err);
    }
  }
}