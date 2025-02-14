// src/core/analytics.js
import { APP_CONFIG } from "./config.js";

const STORAGE_KEY = "adtools_analytics";

export class Analytics {
  constructor() {
    this.pendingTracking = null;
    this.cache = this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored
        ? JSON.parse(stored)
        : {
            features: {},
            firstVisit: new Date().toISOString(),
            totalVisits: 1,
            lastVisit: new Date().toISOString(),
          };
    } catch (error) {
      console.error("Error loading analytics from storage:", error);
      return {
        features: {},
        firstVisit: new Date().toISOString(),
        totalVisits: 1,
        lastVisit: new Date().toISOString(),
      };
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.cache));
    } catch (error) {
      console.error("Error saving analytics to storage:", error);
    }
  }

  scheduleTracking(toolName) {
    // Clear any pending tracking
    if (this.pendingTracking) {
      clearTimeout(this.pendingTracking);
    }

    // Schedule new tracking
    this.pendingTracking = setTimeout(() => {
      this.trackFeatureUsage(toolName);
      this.pendingTracking = null;
    }, APP_CONFIG.ANALYTICS_DELAY);
  }

  trackFeatureUsage(toolName) {
    if (toolName === "home") return;
    try {
      const timestamp = new Date().toISOString();

      // Initialize feature tracking if it doesn't exist
      if (!this.cache.features[toolName]) {
        this.cache.features[toolName] = {
          totalUses: 0,
          firstUse: timestamp,
          lastUse: null,
          usageHistory: [],
        };
      }

      // Update feature statistics
      const feature = this.cache.features[toolName];
      feature.totalUses++;
      feature.lastUse = timestamp;

      // Add to usage history, keeping last 10 uses
      feature.usageHistory.unshift(timestamp);
      if (feature.usageHistory.length > 10) {
        feature.usageHistory.pop();
      }

      // Update general statistics
      this.cache.totalVisits++;
      this.cache.lastVisit = timestamp;

      // Save to localStorage
      this.saveToStorage();

      // Log to console in development mode
      if (APP_CONFIG.IS_DEVELOPMENT) {
        console.log("Feature usage tracked:", {
          feature: toolName,
          totalUses: feature.totalUses,
          timestamp,
        });
      }

      // If Google Analytics is available, track there too
      if (typeof gtag === "function") {
        gtag("event", "feature_use", {
          feature_name: toolName,
          event_category: "engagement",
        });
      }
    } catch (error) {
      console.error("Analytics error:", error);
      // Don't throw - analytics errors shouldn't break the app
    }
  }

  // Analytics retrieval methods
  getMostUsedFeatures(limit = 4) {
    return Object.entries(this.cache.features)
      .map(([name, data]) => ({
        name,
        uses: data.totalUses,
        lastUse: data.lastUse,
      }))
      .sort((a, b) => b.uses - a.uses)
      .slice(0, limit);
  }

  getRecentlyUsedFeatures(limit = 4) {
    return Object.entries(this.cache.features)
      .map(([name, data]) => ({
        name,
        uses: data.totalUses,
        lastUse: data.lastUse,
      }))
      .sort((a, b) => new Date(b.lastUse) - new Date(a.lastUse))
      .slice(0, limit);
  }

  getFeatureStats(toolName) {
    return this.cache.features[toolName] || null;
  }

  getGlobalStats() {
    const totalUses = Object.values(this.cache.features).reduce((sum, feature) => sum + feature.totalUses, 0);

    return {
      totalFeatures: Object.keys(this.cache.features).length,
      totalUses,
      firstVisit: this.cache.firstVisit,
      lastVisit: this.cache.lastVisit,
      totalVisits: this.cache.totalVisits,
    };
  }

  clearAnalytics() {
    localStorage.removeItem(STORAGE_KEY);
    this.cache = this.loadFromStorage();
  }
}
