import { pasteFromClipboard } from "../../utils/buttons.js";
import { createImagePreview } from "../../utils/imagePreview.js";
import { imageTemplate } from "./image.template.js";
import { ImageService } from "./image.service.js";

export class ImageUI {
  constructor(container) {
    this.container = container;
    this.imageService = new ImageService();
    this.selectedFiles = [];
    this.initializeUi();
    this.bindElements();
    this.setupEventListeners();
  }

  initializeUi() {
    this.container.innerHTML = imageTemplate;
  }

  bindElements() {
    this.elements = {
      imageInput: document.getElementById("imageInput"),
      imagePreview: document.getElementById("imagePreview"),
      clearResultButton: document.getElementById("clearResultButton"),
      clearInputButton: document.getElementById("clearInputButton"),
      downloadAllBase64Button: document.getElementById("downloadAllBase64Button"),
      base64Input: document.getElementById("base64Input"),
      base64FileInput: document.getElementById("base64FileInput"),
      convertedImagePreview: document.getElementById("convertedImagePreview"),
      downloadAllImagesButton: document.getElementById("downloadAllImagesButton"),
      pasteButton: document.getElementById("pasteButton"),
      convertToImageButton: document.getElementById("convertToImage")
    };
  }

  setupEventListeners() {
    this.elements.imageInput.addEventListener("change", (e) => this.handleImageSelection(e));
    this.elements.clearInputButton.addEventListener("click", () => this.clearInput());
    this.elements.base64FileInput.addEventListener("change", (e) => this.handleBase64FileSelection(e));
    this.elements.convertToImageButton.addEventListener("click", () => this.convertToImage());
    this.elements.clearResultButton.addEventListener("click", () => this.clearResult());
    this.elements.pasteButton.addEventListener("click", () => pasteFromClipboard(this.elements.base64Input));
    this.elements.downloadAllBase64Button.addEventListener("click", () => this.downloadAllBase64());
    this.elements.downloadAllImagesButton.addEventListener("click", () => this.downloadAllImages());
  }

  async handleImageSelection(event) {
    this.selectedFiles = Array.from(event.target.files);
    await this.updateImagePreview();
    this.showHideDownloadAllButtons();
  }

  async updateImagePreview() {
    const { imagePreview, clearInputButton } = this.elements;
    imagePreview.innerHTML = "";
    imagePreview.style.display = "none";
    for (const file of this.selectedFiles) {
      const previewElement = await createImagePreview(file);
      imagePreview.appendChild(previewElement);
      imagePreview.style.display = "flex";
    }
    clearInputButton.style.display = imagePreview.childElementCount > 0 ? "inline-block" : "none";
  }

  async handleBase64FileSelection(event) {
    const base64Files = Array.from(event.target.files);
    this.elements.convertedImagePreview.innerHTML = "";
    for (const file of base64Files) {
      const base64Content = await this.imageService.readFileAsText(file);
      await this.displayConvertedImage(base64Content, file.name);
    }
  }

  async convertToImage() {
    const base64String = this.elements.base64Input.value.trim();
    if (base64String) {
      const base64WithPrefix = base64String.startsWith("data:image")
        ? base64String
        : `data:image/png;base64,${base64String}`;
      await this.displayConvertedImage(base64WithPrefix, "Pasted Image");
    }
  }

  clearResult() {
    const { base64FileInput, base64Input, convertedImagePreview, clearResultButton } = this.elements;
    base64FileInput.value = "";
    base64Input.value = "";
    convertedImagePreview.innerHTML = "";
    convertedImagePreview.style.display = "none";
    clearResultButton.style.display = "none";
  }

  async displayConvertedImage(base64String, fileName) {
    const { convertedImagePreview, clearResultButton } = this.elements;
    try {
      const file = await this.imageService.convertBase64ToImage(base64String, fileName);
      const previewElement = await createImagePreview(file, true);
      convertedImagePreview.appendChild(previewElement);
      clearResultButton.style.display = convertedImagePreview.childElementCount > 0 ? "inline-block" : "none";
      convertedImagePreview.style.display = "flex";
      this.showHideDownloadAllButtons();
    } catch (error) {
      console.error("Invalid base64 string for", fileName);
    }
  }

  clearInput() {
    const { imageInput, imagePreview, clearInputButton, downloadAllBase64Button } = this.elements;
    imageInput.value = "";
    imagePreview.innerHTML = "";
    clearInputButton.style.display = "none";
    imagePreview.style.display = "none";
    downloadAllBase64Button.style.display = "none";
  }

  showHideDownloadAllButtons() {
    const { downloadAllBase64Button, downloadAllImagesButton, imagePreview, convertedImagePreview } = this.elements;
    downloadAllBase64Button.style.display = imagePreview.childElementCount > 1 ? "inline-block" : "none";
    downloadAllImagesButton.style.display = convertedImagePreview.childElementCount > 1 ? "inline-block" : "none";
  }

  async downloadAllBase64() {
    const images = this.elements.imagePreview.querySelectorAll("div img");
    const blob = await this.imageService.createZipFromBase64(images);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "image_to_base64.zip";
    link.click();
  }

  async downloadAllImages() {
    const images = this.elements.convertedImagePreview.querySelectorAll("div img");
    const blob = await this.imageService.createZipFromImages(images);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "base64_to_image.zip";
    link.click();
  }
}