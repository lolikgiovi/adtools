export function initQueryEditor(querifyService) {
  // State
  let editor = null;
  let isWordWrapEnabled = false;

  // Get reference to editor container
  const editorContainer = document.getElementById("queryEditor");

  async function init() {
    try {
      // Initialize CodeMirror
      editor = CodeMirror(editorContainer, {
        mode: "text/x-sql",
        theme: "material",
        lineNumbers: true,
        readOnly: true,
        lineWrapping: isWordWrapEnabled,
      });

      console.log("Editor initialized successfully");
      return true;
    } catch (error) {
      console.error("Failed to initialize CodeMirror:", error);
      return false;
    }
  }

  function setValue(content) {
    if (editor) {
      editor.setValue(content || "");
    }
  }

  function getValue() {
    return editor ? editor.getValue() : "";
  }

  function toggleWordWrap() {
    isWordWrapEnabled = !isWordWrapEnabled;
    if (editor) {
      editor.setOption("lineWrapping", isWordWrapEnabled);
    }
    return isWordWrapEnabled;
  }

  function clear() {
    setValue("");
  }

  function showContentArea(areaId) {
    const contentAreas = document.querySelectorAll(".querify-content-area");
    contentAreas.forEach((area) => (area.style.display = "none"));

    const targetArea = document.getElementById(areaId);
    if (targetArea) {
      targetArea.style.display = "block";
    }

    // Refresh CodeMirror if showing editor
    if (areaId === "queryEditor" && editor) {
      editor.refresh();
    }
  }

  // Handle query generation
  async function generateQuery(file, queryType) {
    try {
      const result = await querifyService.processFile(file, queryType);

      if (result.isValid) {
        setValue(result.query);
        querifyService.clearError();

        // Update file status with primary keys and SQL size
        const sizeInBytes = new Blob([result.query]).size;
        const sizeText = formatSize(sizeInBytes);

        return {
          success: true,
          primaryKeys: result.primaryKeys,
          sqlSize: sizeText,
        };
      } else {
        querifyService.showError(result.errorMessage);
        return { success: false };
      }
    } catch (error) {
      querifyService.showError(`Error generating query: ${error.message}`);
      return { success: false };
    }
  }

  // Helper function to format file size
  function formatSize(bytes) {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    } else {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }
  }

  // Handle text preview
  function showTextPreview(content) {
    const textPreview = document.getElementById("textPreview");
    if (textPreview) {
      textPreview.textContent = content;
      showContentArea("textPreviewContainer");
    }
  }

  // Handle image preview
  function showImagePreview(content, fileName) {
    const imagePreview = document.getElementById("imagePreview");
    const imageInfo = document.getElementById("imageInfo");

    if (!imagePreview || !imageInfo) return;

    const isBase64 = /^data:image\/[a-z]+;base64,/.test(content);

    if (isBase64) {
      imagePreview.src = content;
      imagePreview.style.display = "block";

      // Get file information
      const fileExtension = fileName.split(".").pop().toLowerCase();
      const base64Data = content.split(",")[1];
      const decodedData = atob(base64Data);
      const fileSizeBytes = decodedData.length;
      const fileSizeKB = (fileSizeBytes / 1024).toFixed(2);

      // Get image dimensions
      const img = new Image();
      img.onload = function () {
        const dimensions = `${this.width}x${this.height}`;
        imageInfo.innerHTML = `
            <p>Filename: ${fileName}</p>
            <p>Extension: ${fileExtension}</p>
            <p>Dimensions: ${dimensions}</p>
            <p>Size: ${fileSizeKB} KB</p>
            <p>Base64 character count: ${base64Data.length}</p>
          `;
      };
      img.src = content;
    } else {
      imagePreview.style.display = "none";
      imageInfo.innerHTML = `
          <p>Filename: ${fileName}</p>
          <p>Not a valid image file or base64 string</p>
        `;
    }

    showContentArea("imagePreviewContainer");
  }

  // Public interface
  return {
    init,
    setValue,
    getValue,
    clear,
    toggleWordWrap,
    showContentArea,
    generateQuery,
    showTextPreview,
    showImagePreview,
  };
}
