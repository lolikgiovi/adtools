// src/utils/imageConversion.js

/**
 * Converts an image file to a Base64 string.
 * @param {File} file - The image file to convert.
 * @returns {Promise<string>} A promise that resolves with the Base64 string.
 */
export function imageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Converts a Base64 string to an image file.
 * @param {string} base64String - The Base64 string to convert.
 * @param {string} filename - The desired filename for the output file.
 * @returns {File} The converted image file.
 */
export function base64ToImage(base64String, filename) {
  const arr = base64String.split(",");
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

/**
 * Creates an object URL for an image file.
 * @param {File} file - The image file.
 * @returns {string} The object URL for the image.
 */
export function createImageUrl(file) {
  return URL.createObjectURL(file);
}

/**
 * Revokes an object URL to free up memory.
 * @param {string} url - The object URL to revoke.
 */
export function revokeImageUrl(url) {
  URL.revokeObjectURL(url);
}
