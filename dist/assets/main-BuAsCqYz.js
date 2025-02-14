import{T as i}from"./core-CjBKUKra.js";function c({mostUsedTools:o,recentTools:t,allTools:s,globalStats:e}){return`
      <div class="home-container">
        <section class="stats-overview">
          <div class="stats-card">
            <h3>Total Uses</h3>
            <div class="stat-value">${e.totalUses}</div>
          </div>
          <div class="stats-card">
            <h3>Active Features</h3>
            <div class="stat-value">${e.totalFeatures}</div>
          </div>
          <div class="stats-card">
            <h3>Total Visits</h3>
            <div class="stat-value">${e.totalVisits}</div>
          </div>
        </section>
  
        <div class="tools-grid">
          <section class="tools-section">
            <h2>Most Used Tools</h2>
            <div class="tools-cards">
              ${r(o)}
            </div>
          </section>
  
          <section class="tools-section">
            <h2>Recently Used</h2>
            <div class="tools-cards">
              ${r(t)}
            </div>
          </section>
        </div>
  
        <section class="all-tools-section">
          <h2>All Tools</h2>
          <div class="all-tools-grid">
            ${d(s)}
          </div>
        </section>
      </div>
    `}function r(o){return o.length?o.map(t=>`
      <div class="tool-card" data-tool="${t.name}">
        <div class="tool-info">
          <h3>${t.config.title}</h3>
          <p>${t.config.description}</p>
        </div>
        <div class="tool-stats">
          <span class="stat">
            <strong>${t.stats.totalUses}</strong> uses
          </span>
          ${t.stats.lastUse?`
            <span class="stat">
              Last used: ${h(t.stats.lastUse)}
            </span>
          `:""}
        </div>
      </div>
    `).join(""):'<p class="no-tools">No tools used yet</p>'}function d(o){return o.filter(t=>t.name!=="home").map(t=>`
      <div class="tool-card compact" data-tool="${t.name}">
        <div class="tool-info">
          <h3>${t.config.title}</h3>
          <p>${t.config.description}</p>
        </div>
        <div class="tool-stats">
          <span class="stat">
            <strong>${t.stats.totalUses}</strong> uses
          </span>
        </div>
      </div>
    `).join("")}function h(o){if(!o)return"Never";const t=new Date(o),e=new Date-t;return e<6e4?"Just now":e<36e5?`${Math.floor(e/6e4)}m ago`:e<864e5?`${Math.floor(e/36e5)}h ago`:e<6048e5?`${Math.floor(e/864e5)}d ago`:t.toLocaleDateString()}class v{constructor(t,s){this.container=t,this.analytics=s}async init(){this.render(),this.setupEventListeners()}render(){const t=this.analytics.getMostUsedFeatures(4).filter(n=>n.name!=="home"),s=this.analytics.getRecentlyUsedFeatures(4).filter(n=>n.name!=="home"),e=this.analytics.getGlobalStats(),a=new Set(t.map(n=>n.name)),l=s.filter(n=>!a.has(n.name));this.container.innerHTML=c({mostUsedTools:this.enrichToolsData(t),recentTools:this.enrichToolsData(l),allTools:this.getAllToolsSorted(),globalStats:e})}enrichToolsData(t){return t.map(s=>({...s,config:i[s.name],stats:this.analytics.getFeatureStats(s.name)}))}getAllToolsSorted(){return Object.entries(i).map(([t,s])=>({name:t,config:s,stats:this.analytics.getFeatureStats(t)||{totalUses:0}})).sort((t,s)=>t.config.order-s.config.order)}formatDate(t){if(!t)return"Never";const s=new Date(t),a=new Date-s;return a<6e4?"Just now":a<36e5?`${Math.floor(a/6e4)}m ago`:a<864e5?`${Math.floor(a/36e5)}h ago`:a<6048e5?`${Math.floor(a/864e5)}d ago`:s.toLocaleDateString()}setupEventListeners(){this.container.addEventListener("click",t=>{const s=t.target.closest("[data-tool]");if(s){const e=s.dataset.tool;window.dispatchEvent(new CustomEvent("navigate",{detail:{tool:e}}))}})}}function u(o){console.log("App state:",window.app);const{analytics:t}=window.app;if(!t)throw new Error("Analytics service not found");return new v(o,t).init()}export{u as initHome};
//# sourceMappingURL=main-BuAsCqYz.js.map
