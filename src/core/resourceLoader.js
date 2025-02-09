import { TOOLS_CONFIG, APP_CONFIG } from "./config.js";

export class ResourceLoader {
  constructor(appState) {
    this.state = appState;
  }

  async loadToolCSS(toolName) {
    if (this.state.loadedCssFiles.has(toolName)) return;

    const cssPath = `${APP_CONFIG.BASE_CSS_PATH}/${toolName}.css`;

    return new Promise((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = cssPath;

      link.onload = () => {
        this.state.loadedCssFiles.add(toolName);
        resolve();
      };

      link.onerror = () => reject(new Error(`Failed to load CSS for ${toolName}`));

      document.head.appendChild(link);
    });
  }

  async loadToolModule(toolName) {
    try {
      const module = await import(`../features/${toolName}/${toolName}.js`);
      if (typeof module[TOOLS_CONFIG[toolName].init] !== "function") {
        throw new Error(`Invalid module: missing initialization function`);
      }
      return module[TOOLS_CONFIG[toolName].init];
    } catch (error) {
      throw new Error(`Failed to load module for ${toolName}: ${error.message}`);
    }
  }
}
