import { copyToClipboard } from "../../utils/buttons.js";
import { htmlTemplate } from "./html.template.js";
import { HtmlService } from "./html.service.js";
import { DependencyLoader } from "../../utils/dependencyLoader.js";
import { BaseUrlService } from "./html.baseurlservice.js";

export class HtmlUI {
  constructor(container) {
    this.container = container;
    this.htmlService = new HtmlService();
    this.baseUrlService = new BaseUrlService();
    this.editor = null;
    this.initializeUi();
    this.initializeEditor();
    this.bindElements();
    this.setupEventListeners();
    this.updateBaseUrlSelect();
  }

  initializeUi() {
    DependencyLoader.load("beautifier");
    this.container.innerHTML = htmlTemplate;
  }

  initializeEditor() {
    this.editor = CodeMirror(document.querySelector(".html-content-area"), {
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
    });
  }

  bindElements() {
    this.elements = {
      openFileButton: document.getElementById("openFileButton"),
      copyButton: document.getElementById("copyButton"),
      pasteButton: document.getElementById("pasteButton"),
      toggleWrapButton: document.getElementById("toggleWrapButton"),
      toggleHighlightButton: document.getElementById("toggleHighlightButton"),
      baseUrlSelect: document.getElementById("baseUrl"),
      dynamicFieldsContainer: document.getElementById("dynamicFields"),
      htmlPreview: document.getElementById("htmlPreview"),
      formatButton: document.getElementById("formatButton"),
      minifyButton: document.getElementById("minifyButton"),
      clearButton: document.getElementById("clearButton"),
      loadImagesButton: document.getElementById("loadImagesButton"),

      baseUrlSelect: document.getElementById("baseUrlSelect"),
      manageBaseUrls: document.getElementById("manageBaseUrls"),
      urlManagementOverlay: document.getElementById("urlManagementOverlay"),
      newBaseUrlName: document.getElementById("newBaseUrlName"),
      newBaseUrl: document.getElementById("newBaseUrl"),
      addBaseUrl: document.getElementById("addBaseUrl"),
      baseUrlsList: document.getElementById("baseUrlsList"),
      clearAllUrls: document.getElementById("clearAllUrls"),
      closeUrlManagement: document.getElementById("closeUrlManagement"),
      dynamicFieldsContainer: document.getElementById("dynamicFields"),
      htmlPreview: document.getElementById("htmlPreview"),
      formatButton: document.getElementById("formatButton"),
      minifyButton: document.getElementById("minifyButton"),
      clearButton: document.getElementById("clearButton"),
      loadImagesButton: document.getElementById("loadImagesButton"),
    };

    // Set initial button states
    this.elements.toggleWrapButton.textContent = "Disable Word Wrap";
    this.elements.toggleHighlightButton.textContent = "Disable Syntax Highlight";
  }

  setupEventListeners() {
    this.editor.on("change", () => {
      this.detectDynamicFields();
      this.updatePreview();
    });

    // Add file input handler
    this.elements.openFileButton.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".html,.xml,.txt";
      input.onchange = (e) => this.handleFileSelect(e);
      input.click();
    });

    this.elements.formatButton.addEventListener("click", () => this.formatHTML());
    this.elements.minifyButton.addEventListener("click", () => this.minifyHTML());
    this.elements.copyButton.addEventListener("click", () => copyToClipboard(this.editor.getValue(), this.elements.copyButton));
    this.elements.pasteButton.addEventListener("click", () => this.handlePaste());
    this.elements.clearButton.addEventListener("click", () => this.editor.setValue(""));
    this.elements.loadImagesButton?.addEventListener("click", () => this.loadImages());
    this.elements.toggleWrapButton.addEventListener("click", () => this.toggleWordWrap());
    this.elements.toggleHighlightButton.addEventListener("click", () => this.toggleSyntaxHighlight());
    this.elements.baseUrlSelect?.addEventListener("change", () => this.updatePreview());
    this.elements.dynamicFieldsContainer.addEventListener("input", () => this.updatePreview());

    this.elements.manageBaseUrls.addEventListener("click", () => this.showUrlManagement());
    this.elements.addBaseUrl.addEventListener("click", () => this.handleAddBaseUrl());
    this.elements.clearAllUrls.addEventListener("click", () => this.handleClearAllUrls());
    this.elements.closeUrlManagement.addEventListener("click", () => this.hideUrlManagement());
    this.elements.newBaseUrl.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.handleAddBaseUrl();
    });
  }

  toggleWordWrap() {
    const isWrapped = this.editor.getOption("lineWrapping");
    this.editor.setOption("lineWrapping", !isWrapped);
    this.elements.toggleWrapButton.textContent = isWrapped ? "Enable Word Wrap" : "Disable Word Wrap";
  }

  toggleSyntaxHighlight() {
    const isHighlightEnabled = this.editor.getOption("mode") === "htmlmixed";
    this.editor.setOption("mode", isHighlightEnabled ? null : "htmlmixed");
    this.elements.toggleHighlightButton.textContent = isHighlightEnabled ? "Enable Syntax Highlight" : "Disable Syntax Highlight";
  }

  formatHTML() {
    const formatted = this.htmlService.formatHTML(this.editor.getValue());
    this.editor.setValue(formatted);
  }

  minifyHTML() {
    const minified = this.htmlService.minifyHTML(this.editor.getValue());
    this.editor.setValue(minified);
  }

  handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.editor.setValue(e.target.result);
    };
    reader.onerror = (e) => {
      console.error("Error reading file:", e);
      alert("Failed to read file");
    };
    reader.readAsText(file);
  }

  async updatePreview() {
    const content = this.editor.getValue();
    const dynamicFields = Array.from(document.querySelectorAll("#dynamicFields input"));
    const velocityContext = {};
    dynamicFields.forEach((input) => {
      if (input.value && input.value.trim() !== "") {
        // field with null values are not included in velocityContext
        const value = input.value.trim().toLowerCase();
        // Convert "true"/"false" strings to boolean values
        if (value === "true" || value === "false") {
          velocityContext[input.name] = value === "true";
        } else {
          velocityContext[input.name] = input.value;
        }
      }
    });
    console.log(velocityContext);

    // Parse Velocity template with the context using VelocityJS
    let velocityParsed = content;
    try {
      if (window.Velocity) {
        velocityParsed = window.Velocity.render(content, velocityContext);
      } else {
        console.warn("VelocityJS not loaded yet");
      }
    } catch (error) {
      console.error("Velocity parsing error:", error);
      velocityParsed = content;
    }

    // Then handle baseUrl replacement
    const replacedContent = this.htmlService.replaceVariables(velocityParsed, this.elements.baseUrlSelect?.value || "", dynamicFields);

    const previewDocument = this.elements.htmlPreview.contentDocument;

    previewDocument.open();
    previewDocument.write(`
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        body {
          width: 100%;
          margin: 0;
          padding: 0;
          word-wrap: break-word;
          overflow-x: hidden;
          -webkit-text-size-adjust: 100%;
        }
        * {
          max-width: 100vw;
          box-sizing: border-box;
        }
        img, video, iframe, table {
          max-width: 100%;
          height: auto;
        }
        table {
          width: 100% !important;
          table-layout: fixed;
        }
        td {
          word-break: break-word;
        }
      </style>
      ${replacedContent}
    `);
    previewDocument.close();
  }

  detectDynamicFields() {
    const content = this.editor.getValue();
    const fields = this.htmlService.detectDynamicFields(content);

    const container = this.elements.dynamicFieldsContainer.closest(".dynamic-fields-container");

    this.elements.dynamicFieldsContainer.innerHTML = "";

    if (fields.length > 0) {
      container.style.display = "block";
      this.elements.dynamicFieldsContainer.style.display = "block";

      const table = document.createElement("table");
      table.className = "dynamic-fields-table";

      fields.forEach((field) => {
        const row = document.createElement("tr");

        // Field name cell
        const nameCell = document.createElement("td");
        nameCell.textContent = field;
        nameCell.className = "field-name";

        // Field value cell
        const valueCell = document.createElement("td");
        const input = document.createElement("input");
        input.type = "text";
        input.name = field;
        input.value = field;
        input.className = "field-value";
        valueCell.appendChild(input);

        row.appendChild(nameCell);
        row.appendChild(valueCell);
        table.appendChild(row);
      });

      this.elements.dynamicFieldsContainer.appendChild(table);
    } else {
      this.elements.dynamicFieldsContainer.style.display = "none";
    }
  }

  loadImages() {
    const iframeDoc = this.elements.htmlPreview.contentDocument || this.elements.htmlPreview.contentWindow.document;
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

  // URL Management Methods
  showUrlManagement() {
    this.elements.urlManagementOverlay.classList.remove("hidden");
    this.updateBaseUrlsList();
  }

  hideUrlManagement() {
    this.elements.urlManagementOverlay.classList.add("hidden");
  }

  updateBaseUrlsList() {
    const urls = this.baseUrlService.getAllUrls();
    this.elements.baseUrlsList.innerHTML = "";

    urls.forEach((item) => {
      const div = document.createElement("div");
      div.className = "url-item";

      const nameSpan = document.createElement("span");
      nameSpan.textContent = item.name;
      nameSpan.className = "url-name";

      const urlSpan = document.createElement("span");
      urlSpan.textContent = item.url;
      urlSpan.className = "url-value";

      const deleteButton = document.createElement("button");
      deleteButton.textContent = "❌";
      deleteButton.onclick = () => {
        this.baseUrlService.removeUrl(item.name);
        this.updateBaseUrlsList();
        this.updateBaseUrlSelect();
      };

      div.appendChild(nameSpan);
      div.appendChild(urlSpan);
      div.appendChild(deleteButton);
      this.elements.baseUrlsList.appendChild(div);
    });
  }

  updateBaseUrlSelect() {
    const urls = this.baseUrlService.getAllUrls();
    const select = this.elements.baseUrlSelect;
    const currentValue = select.value;

    while (select.options.length > 1) {
      select.remove(1);
    }

    urls.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.url;
      option.textContent = item.name;
      select.appendChild(option);
    });

    if (urls.some((item) => item.url === currentValue)) {
      select.value = currentValue;
    }
  }

  handleAddBaseUrl() {
    const name = this.elements.newBaseUrlName.value.trim();
    const url = this.elements.newBaseUrl.value.trim();
    if (name && url) {
      this.baseUrlService.addUrl(name, url);
      this.elements.newBaseUrlName.value = "";
      this.elements.newBaseUrl.value = "";
      this.updateBaseUrlsList();
      this.updateBaseUrlSelect();
    }
  }

  handleClearAllUrls() {
    if (confirm("Are you sure you want to clear all base URLs?")) {
      this.baseUrlService.clearUrls();
      this.updateBaseUrlsList();
      this.updateBaseUrlSelect();
    }
  }
}
