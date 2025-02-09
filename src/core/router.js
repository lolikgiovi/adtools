import { APP_CONFIG, TOOLS_CONFIG } from "./config.js";

export class Router {
  constructor(app) {
    this.app = app;
  }

  async initializeRouting() {
    // Handle initial route
    const initialTool = this.getInitialTool();
    await this.navigateToTool(initialTool);

    // Setup history listener
    window.addEventListener("popstate", async () => {
      const currentTool = this.getToolFromUrl();
      await this.app.loadTool(currentTool || APP_CONFIG.DEFAULT_TOOL);
    });
  }

  getInitialTool() {
    const pathTool = this.getToolFromUrl();
    return pathTool && TOOLS_CONFIG[pathTool] ? pathTool : APP_CONFIG.DEFAULT_TOOL;
  }

  getToolFromUrl() {
    if (APP_CONFIG.IS_DEVELOPMENT) {
      const hash = window.location.hash;
      return hash ? hash.slice(1) : null;
    }

    const path = window.location.pathname;
    return path.startsWith(APP_CONFIG.TOOLS_BASE_PATH + "/") ? path.split("/").pop() : null;
  }

  async navigateToTool(toolName) {
    if (!TOOLS_CONFIG[toolName]) {
      toolName = APP_CONFIG.DEFAULT_TOOL;
    }

    const url = APP_CONFIG.IS_DEVELOPMENT ? `#${toolName}` : `${APP_CONFIG.TOOLS_BASE_PATH}/${toolName}`;

    history.pushState({ tool: toolName }, "", url);
    await this.app.loadTool(toolName);
  }
}
