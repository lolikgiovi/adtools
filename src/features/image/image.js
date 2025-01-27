import { ImageUI } from "./image.ui.js";

export async function initImageConverter(container) {
  return new ImageUI(container);
}
