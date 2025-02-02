export class FileProcessor {
  constructor() {
    this.fileContents = {};
  }

  async processFile(file) {
    const extension = file.name.split(".").pop().toLowerCase();

    try {
      if (extension === "xlsx" || extension === "xls") {
        return await this.processExcelFile(file);
      } else if (extension === "txt") {
        return await this.processTextFile(file);
      } else if (["jpg", "jpeg", "png", "gif"].includes(extension)) {
        return await this.processImageFile(file);
      } else {
        throw new Error(`Unsupported file type: ${extension}`);
      }
    } catch (error) {
      throw new Error(`Error processing ${file.name}: ${error.message}`);
    }
  }

  async processExcelFile(file) {
    try {
      const data = await this.readFileAsArrayBuffer(file);
      const workbook = XLSX.read(data, { type: "array" });

      if (workbook.SheetNames.length < 2) {
        throw new Error("Excel file must contain at least two sheets.");
      }

      const dataSheet = workbook.Sheets[workbook.SheetNames[0]];
      const schemaSheet = workbook.Sheets[workbook.SheetNames[1]];

      const tableData = XLSX.utils.sheet_to_json(dataSheet, { header: 1 });
      const tableSchema = XLSX.utils.sheet_to_json(schemaSheet, {
        header: ["field", "dataType", "nullable", "blank", "order"],
      });

      return {
        fileName: file.name,
        tableData,
        tableSchema,
        type: "excel",
      };
    } catch (error) {
      throw new Error(`Excel processing error: ${error.message}`);
    }
  }

  async processTextFile(file) {
    try {
      const content = await this.readFileAsText(file);

      // Check if the text file contains base64 image data
      if (content.trim().startsWith("data:image")) {
        return {
          fileName: file.name,
          content,
          type: "image",
        };
      }

      return {
        fileName: file.name,
        content,
        type: "text",
      };
    } catch (error) {
      throw new Error(`Text file processing error: ${error.message}`);
    }
  }

  async processImageFile(file) {
    try {
      const base64Data = await this.convertToBase64(file);
      return {
        fileName: file.name,
        content: base64Data,
        type: "image",
      };
    } catch (error) {
      throw new Error(`Image processing error: ${error.message}`);
    }
  }

  // Utility methods for file reading
  readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  convertToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // CLOB field processing
  async processClobFields(tableData, tableSchema) {
    const clobFields = tableSchema.filter((field) => field.dataType.toUpperCase().startsWith("CLOB"));

    if (clobFields.length === 0) {
      return tableData;
    }

    const processedData = [...tableData];
    for (let i = 1; i < processedData.length; i++) {
      for (const clobField of clobFields) {
        const clobFieldName = clobField.field.toLowerCase();
        const clobColumnIndex = processedData[0].findIndex((field) => field.toLowerCase() === clobFieldName);

        if (clobColumnIndex === -1) continue;

        let content = processedData[i][clobColumnIndex];
        if (typeof content !== "string" || content.length >= 100) continue;

        const baseFileName = content.split(".").slice(0, -1).join(".").toLowerCase();
        const storedContent = this.fileContents[baseFileName];

        if (storedContent && storedContent.startsWith("data:image")) {
          processedData[i][clobColumnIndex] = storedContent;
        }
      }
    }

    return processedData;
  }

  // Cache file content for later use
  cacheFileContent(fileName, content) {
    const baseFileName = fileName.split(".").slice(0, -1).join(".").toLowerCase();
    this.fileContents[baseFileName] = content;
  }

  // Get cached file content
  getCachedContent(fileName) {
    const baseFileName = fileName.split(".").slice(0, -1).join(".").toLowerCase();
    return this.fileContents[baseFileName];
  }
}
