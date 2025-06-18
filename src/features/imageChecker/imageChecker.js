import { ImageCheckerUI } from "./imageChecker.ui.js";

export async function initImageChecker(container) {
  return new ImageCheckerUI(container);
}