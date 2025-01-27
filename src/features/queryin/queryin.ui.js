import { copyToClipboard } from "../../utils/buttons.js";
import { queryInTemplate } from "./queryin.template.js";
import { QueryInService } from "./queryin.service.js";
import { DependencyLoader } from "../../utils/dependencyLoader.js";

export class QueryInUI {
    constructor(container) {
        this.container = container;
        this.queryInService = new QueryInService();
        this.outputQueryEditor = null;
        this.initializeUi();
        this.bindElements();
        this.setupEventListeners();
        this.loadDependencies();
    }

    initializeUi() {
        this.container.innerHTML = queryInTemplate;
    }

    async loadDependencies() {
        await DependencyLoader.loadDependency('codemirror');
        this.initializeEditor();
    }

    bindElements() {
        this.elements = {
            inputValues: document.getElementById("inputValues"),
            generateButton: document.getElementById("generateButton"),
            clearButton: document.getElementById("clearButton"),
            pasteButton: document.getElementById("pasteButton"),
            copyButton: document.getElementById("copyButton"),
            clearResultButton: document.getElementById("clearResultButton"),
            schemaName: document.getElementById("schemaName"),
            tableName: document.getElementById("tableName"),
            fieldName: document.getElementById("fieldName")
        };
    }

    setupEventListeners() {
        this.elements.generateButton.addEventListener("click", () => this.updateCodeMirror());
        this.elements.clearButton.addEventListener("click", () => this.handleClear());
        this.elements.clearResultButton.addEventListener("click", () => this.handleClearResult());
        this.elements.pasteButton.addEventListener("click", () => this.handlePaste());
        this.elements.copyButton.addEventListener("click", () => this.handleCopy());

        [this.elements.inputValues, this.elements.schemaName, 
         this.elements.tableName, this.elements.fieldName].forEach(element => {
            element.addEventListener("input", () => this.updateCodeMirror());
        });

        this.adjustInputWidth();
    }

    initializeEditor() {
        this.outputQueryEditor = CodeMirror(
            document.getElementById("outputQueryEditor"),
            {
                mode: "sql",
                lineNumbers: true,
                readOnly: true,
            }
        );
        this.updateCodeMirror();
    }

    updateCodeMirror() {
        if (!this.outputQueryEditor) return;
        const query = this.queryInService.generateQuery(
            this.elements.inputValues.value,
            this.elements.schemaName.value,
            this.elements.tableName.value,
            this.elements.fieldName.value
        );
        this.outputQueryEditor.setValue(query);
        this.outputQueryEditor.refresh();
    }

    handleClear() {
        this.elements.inputValues.value = "";
        this.elements.fieldName.value = "";
        this.elements.tableName.value = "";
        this.elements.schemaName.value = "";
        this.updateCodeMirror();
    }

    handleClearResult() {
        this.outputQueryEditor.setValue("");
    }

    async handlePaste() {
        try {
            const text = await navigator.clipboard.readText();
            this.elements.inputValues.value = text;
            this.updateCodeMirror();
        } catch (err) {
            console.error("Failed to read clipboard contents: ", err);
        }
    }

    handleCopy() {
        copyToClipboard(this.outputQueryEditor.getValue(), this.elements.copyButton);
    }

    adjustInputWidth() {
        const inputs = document.querySelectorAll('.input-group input[type="text"]');
        inputs.forEach(input => {
            input.addEventListener("input", function() {
                this.style.width = "auto";
                this.style.width = this.scrollWidth + 5 + "px";
            });
            input.dispatchEvent(new Event("input"));
        });
    }
}