export const imageTemplate = `
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