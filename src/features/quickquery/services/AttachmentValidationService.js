export class AttachmentValidationService {
  validateAttachment(value, dataType, maxLength, attachments) {
    if (!value || !attachments?.length) return null;

    // Find matching file (case-insensitive)
    const matchingFile = attachments.find((file) => file.name.toLowerCase() === value.toLowerCase());
    if (!matchingFile) return null;

    const fieldDataType = dataType.toUpperCase();

    // Handle different data types
    switch (fieldDataType) {
      case "VARCHAR":
      case "VARCHAR2":
      case "CHAR":
        return this.handleVarcharType(matchingFile, maxLength);

      case "CLOB":
        return this.handleClobType(matchingFile);

      case "BLOB":
        return this.handleBlobType(matchingFile);

      default:
        return null;
    }
  }

  handleVarcharType(file, maxLength) {
    if (file.type.includes("text")) {
      // For text files, use original content
      const content = file.processedFormats.original;
      if (content.length <= maxLength) {
        return content;
      }
    } else {
      // For base64/image/pdf, use base64 content
      const content = file.processedFormats.base64;
      if (content.length <= maxLength) {
        return content;
      }
    }
    return null;
  }

  handleClobType(file) {
    if (file.type.includes("text")) {
      return file.processedFormats.original;
    }
    return file.processedFormats.base64;
  }

  handleBlobType(file) {
    return Array.from(file.processedFormats.binary);
  }
}
