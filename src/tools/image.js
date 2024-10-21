import { copyToClipboard, pasteFromClipboard } from "../utils/buttons.js";
import { createImagePreview } from "../utils/imagePreview.js";

export function initImageConverter(container, updateHeaderTitle) {
  container.innerHTML = `
    <div class="tool-container">
      <h3 id="sectionText">Image to Base64</h3>
      <input type="file" class="fileInput" id="imageInput" accept="image/*" multiple>
      <div id="imagePreview" class="image-preview"></div>
      <div class="button-group">
        <button id="clearInputButton" style="display:none;">Clear</button>
        <button id="downloadAllBase64Button" style="display:none;">Download All Base64</button>
      </div>
    </div>

    <div class="tool-container">
      <h3 id="sectionText">Base64 to Image</h3>
      <textarea id="base64Input" placeholder="Paste base64 string here"></textarea>
      <div class="button-group">
        <input type="file" class="fileInput" id="base64FileInput" accept=".txt" multiple>
        <button id="pasteButton">Paste</button>
        <button id="convertToImage">Convert to Image</button>
        <button id="clearResultButton" style="display:none;">Clear</button>
        <button id="downloadAllImagesButton" style="display:none;">Download All Images</button>
      </div>
      <div id="convertedImagePreview" class="image-preview"></div>
    </div>
  `;

  // Load JSZip from CDN
  const script = document.createElement("script");
  script.src =
    "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js";
  document.head.appendChild(script);

  // Element Selections
  const imageInput = document.getElementById("imageInput");
  const imagePreview = document.getElementById("imagePreview");
  const clearResultButton = document.getElementById("clearResultButton");
  const clearInputButton = document.getElementById("clearInputButton");
  const downloadAllBase64Button = document.getElementById(
    "downloadAllBase64Button"
  );
  const base64Input = document.getElementById("base64Input");
  const base64FileInput = document.getElementById("base64FileInput");
  const convertedImagePreview = document.getElementById(
    "convertedImagePreview"
  );
  const downloadAllImagesButton = document.getElementById(
    "downloadAllImagesButton"
  );

  const pasteButton = document.getElementById("pasteButton");
  const convertToImageButton = document.getElementById("convertToImage");

  let selectedFiles = [];

  // Event Listeners
  imageInput.addEventListener("change", handleImageSelection);
  clearInputButton.addEventListener("click", clearInput);
  base64FileInput.addEventListener("change", handleBase64FileSelection);
  convertToImageButton.addEventListener("click", convertToImage);
  clearResultButton.addEventListener("click", clearResult);
  pasteButton.addEventListener("click", () => pasteFromClipboard(base64Input));
  pasteButton.addEventListener("click", () => pasteFromClipboard(base64Input));
  downloadAllBase64Button.addEventListener("click", downloadAllBase64);
  downloadAllImagesButton.addEventListener("click", downloadAllImages);

  // Core Functionalities
  async function handleImageSelection(event) {
    selectedFiles = Array.from(event.target.files);
    await updateImagePreview();
    showHideDownloadAllButtons();
  }

  async function updateImagePreview() {
    imagePreview.innerHTML = "";
    imagePreview.style.display = "none";
    for (const file of selectedFiles) {
      const previewElement = await createImagePreview(file);
      imagePreview.appendChild(previewElement);
      imagePreview.style.display = "flex";
    }
    clearInputButton.style.display =
      imagePreview.childElementCount > 0 ? "inline-block" : "none";
  }

  async function handleBase64FileSelection(event) {
    const base64Files = Array.from(event.target.files);
    convertedImagePreview.innerHTML = "";
    for (const file of base64Files) {
      const base64Content = await readFileAsText(file);
      await displayConvertedImage(base64Content, file.name);
    }
  }

  async function convertToImage() {
    const base64String = base64Input.value.trim();
    if (base64String) {
      // Check if the string already has a valid prefix
      const base64WithPrefix = base64String.startsWith("data:image")
        ? base64String
        : `data:image/png;base64,${base64String}`; // Default to PNG if no prefix
      await displayConvertedImage(base64WithPrefix, "Pasted Image");
    }
  }

  function clearResult() {
    base64FileInput.value = "";
    base64Input.value = "";
    convertedImagePreview.innerHTML = "";
    convertedImagePreview.style.display = "none";
    clearResultButton.style.display = "none";
  }

  async function displayConvertedImage(base64String, fileName) {
    // The check for "data:image" is now redundant, but we'll keep it for safety
    if (base64String.startsWith("data:image")) {
      const blob = await fetch(base64String).then((res) => res.blob());
      const file = new File([blob], fileName, { type: blob.type });
      const previewElement = await createImagePreview(file, true);
      convertedImagePreview.appendChild(previewElement);
      clearResultButton.style.display =
        convertedImagePreview.childElementCount > 0 ? "inline-block" : "none";
      convertedImagePreview.style.display = "flex";
    } else {
      console.error("Invalid base64 string for", fileName);
    }
    showHideDownloadAllButtons();
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  function clearInput() {
    imageInput.value = "";
    imagePreview.innerHTML = "";
    clearInputButton.style.display = "none";
    imagePreview.style.display = "none";
    downloadAllBase64Button.style.display = "none";
  }

  function showHideDownloadAllButtons() {
    const downloadAllBase64Button = document.getElementById(
      "downloadAllBase64Button"
    );
    const downloadAllImagesButton = document.getElementById(
      "downloadAllImagesButton"
    );

    downloadAllBase64Button.style.display =
      imagePreview.childElementCount > 1 ? "inline-block" : "none";
    downloadAllImagesButton.style.display =
      convertedImagePreview.childElementCount > 1 ? "inline-block" : "none";
  }

  async function downloadAllBase64() {
    const zip = new JSZip();
    const imagePreviewDivs = imagePreview.querySelectorAll("div");

    for (let i = 0; i < imagePreviewDivs.length; i++) {
      const img = imagePreviewDivs[i].querySelector("img");
      try {
        // Fetch the image data as a Blob
        const response = await fetch(img.src);
        const blob = await response.blob();

        // Convert the Blob to base64 with correct prefix
        const base64WithPrefix = await imageToBase64(blob);
        zip.file(`image_${i + 1}.txt`, base64WithPrefix);
      } catch (error) {
        console.error(`Error processing image ${i + 1}:`, error);
      }
    }

    zip.generateAsync({ type: "blob" }).then(function (blob) {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "image_to_base64.zip";
      link.click();
    });
  }

  async function downloadAllImages() {
    const zip = new JSZip();
    const convertedImagePreviewDivs =
      convertedImagePreview.querySelectorAll("div");

    for (let i = 0; i < convertedImagePreviewDivs.length; i++) {
      const img = convertedImagePreviewDivs[i].querySelector("img");
      const response = await fetch(img.src);
      const blob = await response.blob();
      zip.file(`image_${i + 1}.png`, blob);
    }

    zip.generateAsync({ type: "blob" }).then(function (blob) {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "base64_to_image.zip";
      link.click();
    });
  }

  function imageToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        // Get the MIME type from the blob
        const mimeType = blob.type || "image/png"; // Default to PNG if type is not available
        // Ensure the dataUrl starts with the correct prefix
        if (!dataUrl.startsWith(`data:${mimeType};base64,`)) {
          const base64Data = dataUrl.split(",")[1];
          resolve(`data:${mimeType};base64,${base64Data}`);
        } else {
          resolve(dataUrl);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
