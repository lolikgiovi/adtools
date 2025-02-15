import { copyToClipboard } from "../../utils/buttons.js";
import { uuidTemplate } from "./uuid.template.js";
import { UuidService } from "./uuid.service.js";

export class UuidUI {
  constructor(container) {
    this.container = container;
    this.uuidService = new UuidService();
    this.initializeUi();
    this.bindElements();
    this.setupEventListeners();
    this.setupInitialState();
    this.generateSingleUUID();
  }

  initializeUi() {
    this.container.innerHTML = uuidTemplate;
  }

  bindElements() {
    this.elements = {
      uuidOutputSingle: document.getElementById("uuidOutputSingle"),
      uuidOutputMultiple: document.getElementById("uuidOutputMultiple"),
      generateSingleBtn: document.getElementById("generateSingle"),
      generateMultipleBtn: document.getElementById("generateMultiple"),
      copySingleBtn: document.getElementById("copySingle"),
      copyMultipleBtn: document.getElementById("copyMultiple"),
      uuidCountInput: document.getElementById("uuidCount"),
      clearButton: document.getElementById("clearButton"),
    };
  }

  setupEventListeners() {
    this.elements.generateSingleBtn.addEventListener("click", () => this.generateSingleUUID());
    this.elements.generateMultipleBtn.addEventListener("click", () => this.generateMultipleUUIDs());
    this.elements.copySingleBtn.addEventListener("click", () =>
      copyToClipboard(this.elements.uuidOutputSingle.textContent, this.elements.copySingleBtn)
    );

    this.elements.copyMultipleBtn.addEventListener("click", () =>
      copyToClipboard(this.elements.uuidOutputMultiple.textContent, this.elements.copyMultipleBtn)
    );

    this.elements.uuidCountInput.addEventListener("input", () => this.handleCountInput());

    this.elements.uuidCountInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        this.generateMultipleUUIDs();
      }
    });

    this.elements.clearButton.addEventListener("click", () => this.handleClear());
  }

  setupInitialState() {
    this.elements.uuidOutputSingle.textContent = "";
    this.elements.uuidOutputMultiple.textContent = "";
    this.elements.uuidCountInput.value = "";
    this.elements.copyMultipleBtn.disabled = true;
  }

  generateSingleUUID() {
    this.elements.uuidOutputSingle.textContent = this.uuidService.generateSingleUuid();
  }

  generateMultipleUUIDs() {
    const count = parseInt(this.elements.uuidCountInput.value);
    try {
      const uuids = this.uuidService.generateMultipleUuids(count);
      this.elements.uuidOutputMultiple.textContent = uuids;
      this.elements.copyMultipleBtn.disabled = false;
      copyToClipboard(this.elements.uuidOutputMultiple.textContent, this.elements.copyMultipleBtn);
    } catch (error) {
      alert(error.message);
      this.elements.uuidCountInput.value = "";
      this.handleClear();
    }
  }

  handleCountInput() {
    if (this.elements.uuidCountInput.value.trim() === "") {
      this.elements.copyMultipleBtn.disabled = true;
    } else {
      this.elements.copyMultipleBtn.disabled = false;
    }
  }

  handleClear() {
    this.elements.uuidCountInput.value = "";
    this.elements.uuidOutputMultiple.textContent = "";
    this.elements.copyMultipleBtn.disabled = true;
  }
}
