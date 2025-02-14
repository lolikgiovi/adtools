import { TOOLS_CONFIG } from "../../core/config.js";
import { homeTemplate } from "./home.template.js";
import { Analytics } from "../../core/analytics.js";

export class HomeUI {
  constructor(container) {
    this.container = container;
    this.analytics = new Analytics();
    this.init();
  }

  async init() {
    this.render();
    this.setupEventListeners();
  }

  render() {
    const mostUsedTools = this.analytics.getMostUsedFeatures(4).filter((tool) => tool.name !== "home");
    const recentTools = this.analytics.getRecentlyUsedFeatures(4).filter((tool) => tool.name !== "home");
    const globalStats = this.analytics.getGlobalStats();

    // Filter recent tools to exclude those already in most used
    const mostUsedIds = new Set(mostUsedTools.map((t) => t.name));
    const filteredRecentTools = recentTools.filter((tool) => !mostUsedIds.has(tool.name));

    this.container.innerHTML = homeTemplate({
      mostUsedTools: this.enrichToolsData(mostUsedTools),
      recentTools: this.enrichToolsData(filteredRecentTools),
      allTools: this.getAllToolsSorted(),
      globalStats,
    });
  }

  enrichToolsData(tools) {
    return tools.map((tool) => ({
      ...tool,
      config: TOOLS_CONFIG[tool.name],
      stats: this.analytics.getFeatureStats(tool.name),
    }));
  }

  getAllToolsSorted() {
    return Object.entries(TOOLS_CONFIG)
      .map(([name, config]) => ({
        name,
        config,
        stats: this.analytics.getFeatureStats(name) || { totalUses: 0 },
      }))
      .sort((a, b) => a.config.order - b.config.order);
  }

  formatDate(dateString) {
    if (!dateString) return "Never";

    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

    return date.toLocaleDateString();
  }

  setupEventListeners() {
    this.container.addEventListener("click", (e) => {
      const toolCard = e.target.closest("[data-tool]");
      if (toolCard) {
        const toolName = toolCard.dataset.tool;
        window.dispatchEvent(
          new CustomEvent("navigate", {
            detail: { tool: toolName },
          })
        );
      }
    });
  }
}
