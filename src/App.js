// Import tool initializers
import { initCodeMirror } from "./utils/codeMirror.js";
import { initUuidGenerator } from "./tools/uuid.js";
import { initQueryInGenerator } from "./tools/queryin.js";
import { initImageConverter } from "./tools/image.js";
import { initSplunkTemplate } from "./tools/splunk.js";
import { initHtmlTemplate } from "./tools/htmlTemplate.js";
import { initScreenshotTemplate } from "./tools/screenshotTemplate.js";
import { initQuerify } from "./tools/querify.js";
import { initQuickQuery } from "./tools/quickQuery.js";
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
      this.loadTool(Object.keys(this.tools)[7]);
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
    contentDiv.innerHTML = ""; // Clear previous content each time changing the tool
    if (this.tools[toolName]) {
      loadToolCSS(toolName);
      this.currentTool = toolName; //initialize the app
      this.tools[toolName].init(contentDiv);
      history.pushState(null, null, `#${toolName}`); //update url #hash
      this.updateActiveButton(toolName); // Update active button

      // Add a small delay before tracking
      setTimeout(() => {
        trackFeatureUsage(toolName);
      }, 1000); // 1000 milliseconds = 1 second delay
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
