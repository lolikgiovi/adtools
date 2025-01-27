import { SplunkUI } from "./splunk.ui.js";

export function initSplunkTemplate(container) {
  return new SplunkUI(container);
}