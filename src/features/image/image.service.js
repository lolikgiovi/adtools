export class ImageService {
  async imageToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        const mimeType = blob.type || "image/png";
        if (!dataUrl.startsWith(`data:${mimeType};base64,`)) {
          const base64Data = dataUrl.split(",")[1];
          resolve(`data:${mimeType};base64,${base64Data}`);
        } else {
          resolve(dataUrl);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  async convertBase64ToImage(base64String, fileName) {
    if (base64String.startsWith("data:image")) {
      const blob = await fetch(base64String).then((res) => res.blob());
      return new File([blob], fileName, { type: blob.type });
    } else {
      throw new Error("Invalid base64 string");
    }
  }

  async createZipFromImages(images) {
    const zip = new JSZip();
    for (let i = 0; i < images.length; i++) {
      const response = await fetch(images[i].src);
      const blob = await response.blob();
      const originalFilename = images[i].name || `image_${i + 1}`; //file name, or fallback to image_1, image_2, etc.
      const extension = originalFilename.match(/\.[^\.]+$/) ? originalFilename.match(/\.[^\.]+$/)[0] : '.png';
      const imageFilename = originalFilename.replace(/\.[^\.]+$/, '') + extension;
      
      zip.file(imageFilename, blob);
    }
    return zip.generateAsync({ type: "blob" });
  }

  async createZipFromBase64(images) {
    const zip = new JSZip();
    for (let i = 0; i < images.length; i++) {
      const response = await fetch(images[i].src);
      const blob = await response.blob();
      const base64WithPrefix = await this.imageToBase64(blob);
      const originalFilename = images[i].name || `image_${i + 1}`; //image name, or fallback to image_1, image_2, etc.
      const txtFilename = originalFilename.replace(/\.[^\.]+$/, '.txt');
      
      zip.file(txtFilename, base64WithPrefix);
    }
    return zip.generateAsync({ type: "blob" });
  }
}