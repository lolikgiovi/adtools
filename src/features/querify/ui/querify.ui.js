import { querifyTemplate } from "./querify.template.js";
import { initFileManager } from "./querify.filemanager.js";
import { initControlPanel } from "./querify.controlpanel.js";
import { initQueryEditor } from "./querify.queryeditor.js";
import { QuerifyService } from "../services/querify.service.js";

export function initQuerifyUi(container) {
  const scriptDependencies = [
    "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/moment.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/codemirror.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/mode/sql/sql.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js",
    "https://cdn.jsdelivr.net/npm/marked/marked.min.js",
  ];

  let isInit = false;
  const querifyService = new QuerifyService();
  container.innerHTML = querifyTemplate;
  init();
  const components = {
    fileManager: null,
    controlPanel: null,
    queryEditor: null,
  };

  // Load dependencies and initialize
  async function init() {
    if (isInit) return;

    try {
      await loadDependencies();

      container.innerHTML = querifyTemplate;
      components.fileManager = initFileManager(querifyService);
      components.controlPanel = initControlPanel(querifyService);
      components.queryEditor = initQueryEditor(querifyService);

      await Promise.all([components.fileManager.init(), components.controlPanel.init(), components.queryEditor.init()]);

      querifyService.setComponents(components);
      setupAboutButton();

      isInit = true;
      console.log("Querify initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Querify:", error);
      querifyService.showError("Failed to initialize Querify. Please refresh the page.");
    }
  }

  async function loadDependencies() {
    for (const url of scriptDependencies) {
      await loadScript(url);
    }
  }

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = url;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function setupAboutButton() {
    const aboutButton = document.getElementById("aboutQuerify");
    if (aboutButton) {
      aboutButton.addEventListener("click", showAboutPopup);
    }
  }

  function showAboutPopup() {
    const popup = document.createElement("div");
    popup.className = "about-popup";

    const closeButton = document.createElement("span");
    closeButton.className = "about-popup-close";
    closeButton.innerHTML = "&times;";
    closeButton.onclick = closeAboutPopup;

    const content = document.createElement("div");
    content.className = "about-popup-content markdown-body";

    // Load the MD file
    fetch("src/styles/about-querify.md")
      .then((response) => response.text())
      .then((text) => {
        content.innerHTML = marked.parse(text);
        popup.appendChild(closeButton);
        popup.appendChild(content);

        const overlay = document.createElement("div");
        overlay.className = "about-popup-overlay";
        overlay.onclick = closeAboutPopup;

        document.body.appendChild(overlay);
        document.body.appendChild(popup);

        overlay.style.display = "block";
        popup.style.display = "block";
      })
      .catch((error) => {
        console.error("Error loading the about-querify.md file:", error);
        content.innerHTML = "<p>Error loading content. Please try again later.</p>";
        popup.appendChild(closeButton);
        popup.appendChild(content);

        const overlay = document.createElement("div");
        overlay.className = "about-popup-overlay";
        overlay.onclick = closeAboutPopup;

        document.body.appendChild(overlay);
        document.body.appendChild(popup);

        overlay.style.display = "block";
        popup.style.display = "block";
      });
  }

  function closeAboutPopup() {
    const popup = document.querySelector(".about-popup");
    const overlay = document.querySelector(".about-popup-overlay");

    if (popup) popup.remove();
    if (overlay) overlay.remove();
  }

  // Return public interface
  return {
    refresh: () => {
      isInit = false;
      init();
    },
  };
}
