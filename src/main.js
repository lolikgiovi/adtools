// main.js
import App from "./App.js";
import { DependencyLoader } from "./utils/dependencyLoader.js";
import { MobileNavigation } from "./utils/mobileNavigations.js";
import { TouchHandler } from "./utils/touchHandler.js";
import { ReloadManager } from "./utils/reloadManager.js";

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Load dependencies
    await DependencyLoader.loadAll();

    // Initialize main app
    const app = new App();
    await app.init();

    // Initialize mobile features and utilities
    new MobileNavigation();
    new TouchHandler();
    new ReloadManager().checkReload();
  } catch (error) {
    console.error("Failed to initialize app:", error);
    showErrorMessage();
  }
});

function showErrorMessage() {
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.innerHTML = `
    <h2>Failed to initialize application</h2>
    <p>Please refresh the page or contact me if the problem persists.</p>
    <button onclick="window.location.reload()">Refresh Page</button>
  `;
  document.body.appendChild(errorDiv);
}
