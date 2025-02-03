// Import tool initializers
import { initCodeMirror } from "./utils/codeMirror.js";
import { initUuidGenerator } from "./features/uuid/uuid.js";
import { initQueryInGenerator } from "./features/queryin/queryin.js";
import { initImageConverter } from "./features/image/image.js";
import { initSplunkTemplate } from "./features/splunk/splunk.js";
import { initHtmlTemplate } from "./features/html/html.js";
import { initScreenshotTemplate } from "./features/screenshot/screenshot.js";
import { initQuerify } from "./features/querify/querify.js";
import { initQuickQuery } from "./features/quickquery/quickQuery.js";
import { trackFeatureUsage } from "./utils/analytics.js";

class App {
  constructor() {
    this.tools = {
      uuid: {
        init: initUuidGenerator,
        title: "UUIDv4",
      },
      queryin: {
        init: initQueryInGenerator,
        title: "Query IN",
      },
      image: {
        init: initImageConverter,
        title: "Image-Base64",
      },
      splunk: {
        init: initSplunkTemplate,
        title: "Splunk Template",
      },
      html: {
        init: initHtmlTemplate,
        title: "HTML Template",
      },
      screenshot: {
        init: initScreenshotTemplate,
        title: "Deploy Docs",
      },
      querify: {
        init: initQuerify,
        title: "Querify",
      },
      quickQuery: {
        init: initQuickQuery,
        title: "Quick Query",
      },
    };
    this.currentTool = null;
    this.codeMirror = null;
  }

  async init() {
    try {
      this.codeMirror = await initCodeMirror();
      this.setupNavigation();

      // Get initial route from current path
      const path = window.location.pathname;
      const initialTool = path.startsWith("/tools/") ? path.split("/").pop() : Object.keys(this.tools)[7]; // Your default tool

      // Check if the tool exists
      if (this.tools[initialTool]) {
        this.loadTool(initialTool);
      } else {
        // Redirect to default tool if invalid URL
        this.loadTool(Object.keys(this.tools)[7]);
      }
    } catch (error) {
      console.error("Failed to initialize CodeMirror:", error);
    }
  }

  // Set Up the navigation buttons for each tool
  setupNavigation() {
    const nav = document.getElementById("main-nav");
    Object.entries(this.tools).forEach(([toolName, toolInfo]) => {
      const button = document.createElement("button");
      button.textContent = toolInfo.title; // Use the custom title
      button.id = `nav-${toolName}`; // Add an id to each button
      button.addEventListener("click", () => this.loadTool(toolName));
      nav.appendChild(button);
    });
  }

  loadTool(toolName) {
    const contentDiv = document.getElementById("content");
    contentDiv.innerHTML = "";
    if (this.tools[toolName]) {
      loadToolCSS(toolName);
      this.currentTool = toolName;
      this.tools[toolName].init(contentDiv);

      // Use hash for local development, path for production
      if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
        history.pushState(null, null, `#${toolName}`);
      } else {
        history.pushState(null, null, `/tools/${toolName}`);
      }

      this.updateActiveButton(toolName);
      setTimeout(() => {
        trackFeatureUsage(toolName);
      }, 1000);
    }
  }

  updateActiveButton(toolName) {
    // Remove 'active' class from all buttons
    document.querySelectorAll("#main-nav button").forEach((button) => {
      button.classList.remove("active");
    });
    // Add 'active' class to the selected tool's button
    const activeButton = document.getElementById(`nav-${toolName}`);
    if (activeButton) {
      activeButton.classList.add("active");
    }
  }
}

function loadToolCSS(toolName) {
  if (document.querySelector(`link[href$="${toolName}.css"]`)) return; // Break if CSS Already loaded

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `/src/styles/tools/${toolName}.css`;
  document.head.appendChild(link);
}

export default App;
