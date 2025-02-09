// App.js
import { AppState } from "./core/state.js";
import { Router } from "./core/router.js";
import { UIManager } from "./core/uiManager.js";
import { ResourceLoader } from "./core/resourceLoader.js";
import { Analytics } from "./core/analytics.js";
import { TOOLS_CONFIG } from "./core/config.js";

class App {
  constructor() {
    // Initialize core services
    this.state = new AppState();
    this.router = new Router(this);
    this.ui = new UIManager(this);
    this.resources = new ResourceLoader(this.state);
    this.analytics = new Analytics();

    // Bind methods
    this.loadTool = this.loadTool.bind(this);
    this.handleError = this.handleError.bind(this);

    // Setup error handling
    this.setupErrorHandling();
  }

  async init() {
    try {
      this.state.setState({ isLoading: true });
      // Setup UI
      this.ui.setupNavigation();

      // Initialize routing
      await this.router.initializeRouting();

      this.state.setState({ isLoading: false });
    } catch (error) {
      this.handleError("Initialization failed", error);
    }
  }

  async loadTool(toolName) {
    if (!TOOLS_CONFIG[toolName]) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    try {
      this.state.setState({ isLoading: true, error: null });
      this.ui.showLoadingState();

      // Load CSS first
      await this.resources.loadToolCSS(toolName);

      // Load and initialize tool
      const initFunction = await this.resources.loadToolModule(toolName);
      const contentDiv = this.ui.clearContent();
      await initFunction(contentDiv);

      // Update state and UI
      this.state.setState({
        currentTool: toolName,
        isLoading: false,
      });
      this.ui.updateActiveButton(toolName);

      // Track usage
      this.analytics.scheduleTracking(toolName);
    } catch (error) {
      this.handleError(`Failed to load tool ${toolName}`, error);
    }
  }

  setupErrorHandling() {
    window.onerror = (msg, src, line, col, error) => {
      this.handleError("An unexpected error occurred", error);
    };

    window.onunhandledrejection = (event) => {
      this.handleError("An unexpected error occurred", event.reason);
    };
  }

  handleError(context, error) {
    const errorMessage = `${context}: ${error.message}`;
    console.error(errorMessage, error);

    this.state.setState({
      error: errorMessage,
      isLoading: false,
    });

    this.ui.showError(errorMessage);
  }
}

export default App;
