// analytics.js
import { APP_CONFIG } from "./config.js";

export class Analytics {
  constructor() {
    this.pendingTracking = null;
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
    try {
      // You can implement your analytics tracking here
      console.log(`Feature used: ${toolName}`);

      // Example implementation with Google Analytics
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
}
