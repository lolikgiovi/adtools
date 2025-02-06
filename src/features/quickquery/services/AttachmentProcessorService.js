export class AttachmentProcessorService {
  constructor() {
    this.attachmentsContainer = null;
    this.fileContents = {};
  }

  // The business process will be processing the file
  // based on its format, and returning it as three format for each file
  // 1. original value (for txt, html, json)
  // 2. base64 encoded value (for images, pdf)
  // 3. binary value (for images, pdf)

  async processAttachments(files) {
    console.log("Processing attachments");
    const processedFiles = [];

    for (const file of files) {
      console.log("Processing file:", file.name);
      const extension = file.name.split(".").pop().toLowerCase();
      const processedFile = {
        name: file.name,
        type: file.type,
        size: file.size,
        processedFormats: {
          original: null,
          base64: null,
          binary: null,
        },
      };

      try {
        switch (extension) {
          case "jpg":
          case "jpeg":
          case "png":
          case "pdf":
            await this.handleMediaFile(file, processedFile);
            break;
          case "txt":
          case "html":
          case "json":
            await this.handleTextFile(file, processedFile);
            break;
          default:
            console.warn(`Unsupported file type: ${extension}`);
        }
        processedFiles.push(processedFile);
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
      }
    }

    return processedFiles;
  }

  async handleMediaFile(file, processedFile) {
    // Read as binary
    const binaryData = await this.readFileAs(file, "arrayBuffer");
    processedFile.processedFormats.binary = new Uint8Array(binaryData);

    // Read as base64
    const base64Data = await this.readFileAs(file, "dataURL");
    processedFile.processedFormats.base64 = base64Data;
  }

  async handleTextFile(file, processedFile) {
    const textContent = await this.readFileAs(file, "text");
    processedFile.processedFormats.original = textContent;
  }

  readFileAs(file, readAs) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Error reading file"));

      switch (readAs) {
        case "arrayBuffer":
          reader.readAsArrayBuffer(file);
          break;
        case "dataURL":
          reader.readAsDataURL(file);
          break;
        case "text":
          reader.readAsText(file);
          break;
      }
    });
  }
}
