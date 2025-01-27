import { copyToClipboard, pasteFromClipboard } from "../../utils/buttons.js";
import { screenshotTemplate } from "./screenshot.template.js";
import { ScreenshotService } from "./screenshot.service.js";

export class ScreenshotUI {
    constructor(container) {
        this.container = container;
        this.screenshotService = new ScreenshotService();
        this.initializeUi();
        this.bindElements();
        this.setupEventListeners();
        this.adjustTextareaHeight(this.elements.inputList);
    }

    initializeUi() {
        this.container.innerHTML = screenshotTemplate;
    }

    bindElements() {
        this.elements = {
            inputList: document.getElementById("inputList"),
            generateButton: document.getElementById("generateButton"),
            clearButton: document.getElementById("clearButton"),
            pasteButton: document.getElementById("pasteButton")
        };
    }

    setupEventListeners() {
        this.elements.generateButton.addEventListener("click", () => this.generateDocument());
        this.elements.clearButton.addEventListener("click", () => this.handleClear());
        this.elements.pasteButton.addEventListener("click", () => this.handlePaste());
        this.elements.inputList.addEventListener("input", () => this.adjustTextareaHeight(this.elements.inputList));
    }

    adjustTextareaHeight(textarea) {
        textarea.style.height = "auto";
        textarea.style.height = textarea.scrollHeight + "px";
    }

    async generateDocument() {
        try {
            const blob = await this.screenshotService.generateDocument(this.elements.inputList.value);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `deploy_config_${this.screenshotService.getFormattedDate()}.docx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error generating document:", error);
            alert(error.message);
        }
    }

    handleClear() {
        this.elements.inputList.value = "";
        this.adjustTextareaHeight(this.elements.inputList);
    }

    async handlePaste() {
        await pasteFromClipboard(this.elements.inputList);
        this.adjustTextareaHeight(this.elements.inputList);
    }
}