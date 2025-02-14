import { TOOLS_CONFIG } from "./config.js";

export class UIManager {
  constructor(app) {
    this.app = app;
  }

  setupNavigation() {
    const nav = document.getElementById("main-nav");
    if (!nav) throw new Error("Navigation container not found");

    // Sort tools by order
    const sortedTools = Object.entries(TOOLS_CONFIG).sort(([, a], [, b]) => a.order - b.order);

    // Create and append buttons
    sortedTools.forEach(([toolName, toolInfo]) => {
      const button = this.createNavigationButton(toolName, toolInfo);
      nav.appendChild(button);
    });
  }

  createNavigationButton(toolName, toolInfo) {
    const button = document.createElement("button");
    button.textContent = toolInfo.title;
    button.id = `nav-${toolName}`;
    button.title = toolInfo.description;
    button.className = "nav-button";
    button.addEventListener("click", () => this.app.router.navigateToTool(toolName));
    return button;
  }

  updateActiveButton(toolName) {
    document.querySelectorAll("#main-nav .nav-button").forEach((button) => button.classList.remove("active"));

    const activeButton = document.getElementById(`nav-${toolName}`);
    if (activeButton) {
      activeButton.classList.add("active");
    }
  }

  showLoadingState() {
    const contentDiv = document.getElementById("content");
    contentDiv.innerHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
      </div>
    `;
  }

  showError(message) {
    const contentDiv = document.getElementById("content");
    contentDiv.innerHTML = `
      <div class="error-container">
        <div class="error-message">
          <h3>Error</h3>
          <p>${message}</p>
          <button class="error-button" onclick="window.location.reload()">Reload Page</button>
        </div>
      </div>
    `;
  }

  clearContent() {
    const contentDiv = document.getElementById("content");
    contentDiv.innerHTML = "";
    return contentDiv;
  }
}
