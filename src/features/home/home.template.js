export function homeTemplate({ mostUsedTools, recentTools, allTools, globalStats, latestReleaseNotes }) {
  return `
        <div class="home-container">
          <div class="release-notes">
            <div class="release-notes-header">
              <h2>Release Notes</h2>
              <button class="release-notes-button">View Past Release Notes</button>
            </div>
            <div class="release-notes-latest-content">${renderMarkdownContent(latestReleaseNotes)}</div>
          </div>
    
          <div class="tools-grid">
            <section class="tools-section">
              <h2>Most Used Tools</h2>
              <div class="tools-cards">
                ${renderToolCards(mostUsedTools)}
              </div>
            </section>
    
            <section class="tools-section">
              <h2>Recently Used</h2>
              <div class="tools-cards">
                ${renderToolCards(recentTools)}
              </div>
            </section>
          </div>

          <section class="stats-overview">
            <div class="stats-card">
              <h3>Total Uses</h3>
              <div class="stat-value">${globalStats.totalUses}</div>
            </div>
            <div class="stats-card">
              <h3>Total Visits</h3>
              <div class="stat-value">${globalStats.totalVisits}</div>
            </div>
          </section>
    
          <section class="all-tools-section">
            <h2>All Tools</h2>
            <div class="all-tools-grid">
              ${renderAllTools(allTools)}
            </div>
          </section>
        </div>
      `;
}

function renderToolCards(tools) {
  if (!tools.length) {
    return '<p class="no-tools">No tools used yet</p>';
  }

  return tools
    .map(
      (tool) => `
        <div class="tool-card" data-tool="${tool.name}">
          <div class="tool-info">
            <h3>${tool.config.title}</h3>
            <p>${tool.config.description}</p>
          </div>
          <div class="tool-stats">
            <span class="stat">
              <strong>${tool.stats.totalUses}</strong> uses
            </span>
            ${
              tool.stats.lastUse
                ? `
              <span class="stat">
                Last used: ${formatDate(tool.stats.lastUse)}
              </span>
            `
                : ""
            }
          </div>
        </div>
      `
    )
    .join("");
}

function renderAllTools(tools) {
  return tools
    .filter((tool) => tool.name !== "home") // Filter out the home tool
    .map(
      (tool) => `
        <div class="tool-card compact" data-tool="${tool.name}">
          <div class="tool-info">
            <h3>${tool.config.title}</h3>
            <p>${tool.config.description}</p>
          </div>
          <div class="tool-stats">
            <span class="stat">
              <strong>${tool.stats.totalUses}</strong> uses
            </span>
          </div>
        </div>
      `
    )
    .join("");
}

function formatDate(dateString) {
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

function renderMarkdownContent(markdown) {
  if (!markdown) {
    return '<p class="no-release-notes">No release notes available</p>';
  }

  try {
    return `
      <div class="tool-card">
        <div class="markdown-content">
          ${marked.parse(String(markdown))}
        </div>
      </div>
    `;
  } catch (error) {
    console.error("Error parsing markdown:", error);
    return '<p class="no-release-notes">Error loading release notes</p>';
  }
}
