import { copyToClipboard } from "../utils/buttons.js";

export function initUuidGenerator(container, updateHeaderTitle) {
  // updateHeaderTitle("UUID Generator");

  const html = `
        <div class="tool-container">
            <div id="uuidSingle" class="uuid-section">
                <h3 id="sectionText">Single UUID</h3>
                <p id="uuidOutputSingle" class="uuidText"></p>
                <div class="button-group">
                    <button id="generateSingle">Generate</button>
                    <button id="copySingle">Copy</button>
                </div>
            </div>
        </div>

        <div class="tool-container">
            <div id="uuidMultiple" class="uuid-section">
                <h3 id="sectionText">Multiple UUIDs</h3>
                <div class="button-group">
                    <input type="number" id="uuidCount" min="1" max="1000" placeholder="How many?">
                    <button id="generateMultiple">Generate</button>
                    <button id="copyMultiple">Copy</button>
                    <button id="clearButton">Clear</button>
                </div>
                <pre id="uuidOutputMultiple" class="uuidText"></pre>
            </div>
        </div>
    `;

  container.innerHTML = html; //inject this feature to the main content

  // Element Selections of the UUID Generator
  const uuidOutputSingle = document.getElementById("uuidOutputSingle");
  const uuidOutputMultiple = document.getElementById("uuidOutputMultiple");
  const generateSingleBtn = document.getElementById("generateSingle");
  const generateMultipleBtn = document.getElementById("generateMultiple");
  const copySingleBtn = document.getElementById("copySingle");
  const copyMultipleBtn = document.getElementById("copyMultiple");
  const uuidCountInput = document.getElementById("uuidCount");
  const clearButton = document.getElementById("clearButton");

  // Core Functionalities
  function generateSingleUUID() {
    uuidOutputSingle.textContent = crypto.randomUUID();
  }

  function generateMultipleUUIDs() {
    const count = parseInt(uuidCountInput.value);
    if (count >= 1 && count <= 2000) {
      const uuids = Array.from({ length: count }, () =>
        crypto.randomUUID()
      ).join("\n");
      uuidOutputMultiple.textContent = uuids;
      copyMultipleBtn.disabled = false;
    } else {
      alert("Please enter a number between 1 and 2000");
    }
  }

  // Event Listeners
  generateSingleBtn.addEventListener("click", generateSingleUUID);
  generateMultipleBtn.addEventListener("click", generateMultipleUUIDs);

  copySingleBtn.addEventListener("click", () =>
    copyToClipboard(uuidOutputSingle.textContent, copySingleBtn)
  );
  copyMultipleBtn.addEventListener("click", () =>
    copyToClipboard(uuidOutputMultiple.textContent, copyMultipleBtn)
  );

  uuidCountInput.addEventListener("input", () => {
    uuidOutputMultiple.textContent = "";
    copyMultipleBtn.disabled = true;
  });

  clearButton.addEventListener("click", () => {
    uuidCountInput.value = "";
    uuidOutputMultiple.textContent = "";
    copyMultipleBtn.disabled = true;
  });

  // Initialization
  generateSingleUUID();
  copyMultipleBtn.disabled = true;
}
