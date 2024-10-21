export function trackFeatureUsage(featureName) {
  // fetch("https://your-worker-url.workers.dev/track", {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json",
  //   },
  //   body: JSON.stringify({
  //     feature: featureName,
  //     timestamp: new Date().toISOString(),
  //   }),
  // }).catch((error) => console.error("Error tracking feature usage:", error));
  console.log("Feature usage tracked:", featureName);
}
