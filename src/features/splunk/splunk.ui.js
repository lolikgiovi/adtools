import { copyToClipboard } from "../../utils/buttons.js";
import { DependencyLoader } from "../../utils/dependencyLoader.js";
import { splunkTemplate } from "./splunk.template.js";
import { SplunkService } from "./splunk.service.js";

export class SplunkUI {
  constructor(container) {
    this.container = container;
    this.splunkService = new SplunkService();
    this.editor = null;
    this.highlightingEnabled = true;
    this.initializeUi();
    this.bindElements();
    this.loadDependencies();
  }

  initializeUi() {
    this.container.innerHTML = splunkTemplate;
  }

  bindElements() {
    this.elements = {
      formatButton: document.getElementById("formatButton"),
      minifyButton: document.getElementById("minifyButton"),
      copyButton: document.getElementById("copyButton"),
      pasteButton: document.getElementById("pasteButton"),
      clearButton: document.getElementById("clearButton"),
      toggleHighlightButton: document.getElementById("toggleHighlightButton"),
      removeSpacesButton: document.getElementById("removeSpacesButton"),
    };

    // Set initial button states
    this.elements.toggleHighlightButton.textContent = "Disable Highlight";
  }

  async loadDependencies() {
    await DependencyLoader.load("codemirror");
    this.initializeEditor();
    this.setupEventListeners();
  }

  initializeEditor() {
    this.splunkService.defineSplunkMode(CodeMirror);

    const savedContent = this.loadSavedContent();

    this.editor = CodeMirror(document.getElementById("splunkEditor"), {
      mode: "splunk",
      lineNumbers: true,
      theme: "default",
      lineWrapping: true,
      styleSelectedText: true,
      value:
        savedContent ||
        `eventType=[EVENT_NAME]|
description=|
channelCode=EVE|
channelName=EVE|
cifNo= $!{context.cifNo}|
mobilePhone= $!{context.mobilePhone}|
amount=$!{context.amount}|
transactionDate=$!{date.convertDate($!{context.transactionDate},'yyyy-MM-dd HH:mm:ss')}`,
    });

    // Save content when editor changes
    this.editor.on("change", () => {
      this.saveContent();
    });
  }

  setupEventListeners() {
    const { formatButton, minifyButton, copyButton, pasteButton, clearButton, toggleHighlightButton, removeSpacesButton } = this.elements;

    formatButton.addEventListener("click", () => {
      const formattedText = this.splunkService.formatText(this.editor.getValue(), false);
      this.editor.setValue(formattedText);
    });

    minifyButton.addEventListener("click", () => {
      const minifiedText = this.splunkService.formatText(this.editor.getValue(), true);
      this.editor.setValue(minifiedText);
    });

    copyButton.addEventListener("click", () => copyToClipboard(this.editor.getValue(), copyButton));

    pasteButton.addEventListener("click", () => this.handlePaste());
    clearButton.addEventListener("click", () => this.editor.setValue(""));
    toggleHighlightButton.addEventListener("click", () => this.toggleHighlighting());

    removeSpacesButton.addEventListener("click", () => {
      const currentText = this.editor.getValue();
      const textWithoutSpaces = this.splunkService.removeSpacesAfterEquals(currentText);
      this.editor.setValue(textWithoutSpaces);
    });
  }

  toggleHighlighting() {
    this.highlightingEnabled = !this.highlightingEnabled;
    if (this.highlightingEnabled) {
      this.splunkService.defineSplunkMode(CodeMirror);
      this.editor.setOption("mode", "splunk");
    } else {
      this.editor.setOption("mode", null);
    }
    this.elements.toggleHighlightButton.textContent = this.highlightingEnabled ? "Disable Highlight" : "Enable Highlight";
  }

  async handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      this.editor.setValue(text);
    } catch (err) {
      console.error("Failed to read clipboard contents: ", err);
    }
  }

  saveContent() {
    try {
      const content = this.editor.getValue();
      localStorage.setItem("splunk_last_value", content);
    } catch (error) {
      console.error("Error saving editor content:", error);
    }
  }

  loadSavedContent() {
    try {
      return localStorage.getItem("splunk_last_value");
    } catch (error) {
      console.error("Error loading saved content:", error);
      return null;
    }
  }
}
