// components/file-manager.js
export function initFileManager(querifyService) {
  // State variables
  let excelFiles = [];
  let textFiles = [];
  let imageFiles = [];
  let fileContents = {};
  let selectedFile = null;

  // Get references to DOM elements
  const fileInput = document.getElementById("querifyInputFiles");
  const dragDropArea = document.getElementById("dragDropArea");
  const fileListContainer = document.querySelector(".querify-file-list");

  function init() {
    setupEventListeners();
  }

  function setupEventListeners() {
    fileInput.addEventListener("change", handleFileSelection);
    dragDropArea.addEventListener("dragover", handleDragOver);
    dragDropArea.addEventListener("dragleave", handleDragLeave);
    dragDropArea.addEventListener("drop", handleDrop);
    dragDropArea.addEventListener("click", () => fileInput.click());
  }

  function handleFileSelection(e) {
    // querifyService.clearError();
    const selectedFiles = Array.from(e.target.files);
    processFiles(selectedFiles);
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    dragDropArea.classList.add("drag-over");
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    dragDropArea.classList.remove("drag-over");
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    dragDropArea.classList.remove("drag-over");
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  }

  function processFiles(files) {
    // Reset arrays
    excelFiles = [];
    textFiles = [];
    imageFiles = [];
    fileContents = {};

    files.forEach((file) => {
      console.log("Processing file:", file.name);
      const extension = file.name.split(".").pop().toLowerCase();

      if (extension === "xlsx" || extension === "xls") {
        excelFiles.push(file);
      } else if (extension === "txt") {
        // Read the content of the text file
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target.result;
          if (content.trim().startsWith("data:image")) {
            console.log("Text file contains base64 image data:", file.name);
            imageFiles.push(file);
          } else {
            textFiles.push(file);
          }
          fileContents[file.name] = content;
          updateFileList();
        };
        reader.readAsText(file);
      } else if (["jpg", "jpeg", "png", "gif"].includes(extension)) {
        imageFiles.push(file);
      }
    });

    updateFileList();
    handleTextFiles();
    handleImageFiles();
    querifyService.handleGenerateAll();
  }

  function updateFileList() {
    const excelFilesDiv = document.getElementById("excelFiles");
    const textFilesDiv = document.getElementById("textFiles");
    const imageFilesDiv = document.getElementById("imageFiles");

    excelFilesDiv.innerHTML = excelFiles.length ? "<h3>SQL Files:</h3>" : "";
    textFilesDiv.innerHTML = textFiles.length ? "<h3>Text Files:</h3>" : "";
    imageFilesDiv.innerHTML = imageFiles.length ? "<h3>Image Files:</h3>" : "";

    excelFiles.forEach((file, index) => {
      const fileButton = createFileButton(file, index, "excel");
      excelFilesDiv.appendChild(fileButton);
    });

    textFiles.forEach((file, index) => {
      const fileButton = createFileButton(file, index, "text");
      textFilesDiv.appendChild(fileButton);
    });

    imageFiles.forEach((file, index) => {
      const fileButton = createFileButton(file, index, "image");
      imageFilesDiv.appendChild(fileButton);
    });

    // Show/hide file list container based on if there are files
    const hasFiles = excelFiles.length > 0 || textFiles.length > 0 || imageFiles.length > 0;
    fileListContainer.style.display = hasFiles ? "flex" : "none";
    dragDropArea.classList.toggle("wide", !hasFiles);
    dragDropArea.classList.toggle("small", hasFiles);
  }

  function createFileButton(file, index, type) {
    const fileButton = document.createElement("div");
    fileButton.className = "querify-file-button";
    fileButton.dataset.fileName = file.name;

    const fileInfo = document.createElement("div");
    fileInfo.className = "querify-file-info";

    const fileNameSpan = document.createElement("span");
    fileNameSpan.className = "file-name";

    if (type === "excel") {
      fileNameSpan.textContent = file.name.split(".").slice(0, -1).join(".");
    } else {
      fileNameSpan.textContent = file.name;
    }

    fileInfo.appendChild(fileNameSpan);

    if (type === "excel") {
      const pkSpan = document.createElement("span");
      pkSpan.className = "primary-key";
      pkSpan.textContent = "pk: loading...";
      fileInfo.appendChild(pkSpan);

      const sqlSizeSpan = document.createElement("span");
      sqlSizeSpan.className = "sql-size";
      sqlSizeSpan.textContent = "size: calculating...";
      fileInfo.appendChild(sqlSizeSpan);

      // Update validation status
      if (querifyService.getFileStatus(file.name)?.isValid === false) {
        fileButton.classList.add("invalid-file");
      } else if (querifyService.getFileStatus(file.name)?.isValid === true) {
        fileButton.classList.add("valid-file");
      }
    }

    fileButton.appendChild(fileInfo);
    fileButton.addEventListener("click", () => selectFile(index, type));

    return fileButton;
  }

  function selectFile(index, type) {
    if (type === "excel") {
      selectedFile = excelFiles[index];
      const query = querifyService.getGeneratedQuery(selectedFile.name);
      if (query) {
        querifyService.setQuery(query);
      } else {
        querifyService.clearEditor();
      }

      const fileStatus = querifyService.getFileStatus(selectedFile.name);
      if (fileStatus?.isValid === false) {
        querifyService.showError(fileStatus.errorMessage);
      } else {
        querifyService.clearError();
      }
      querifyService.showContentArea("queryEditor");
    } else if (type === "text") {
      selectedFile = textFiles[index];
      showTextFile(selectedFile);
    } else if (type === "image") {
      selectedFile = imageFiles[index];
      showImageFile(selectedFile);
    }

    updateSelectedFileHighlight();
  }

  function updateSelectedFileHighlight() {
    const fileButtons = document.querySelectorAll(".querify-file-button");
    fileButtons.forEach((button) => {
      if (selectedFile && button.dataset.fileName === selectedFile.name) {
        button.classList.add("selected-file");
      } else {
        button.classList.remove("selected-file");
      }
    });
  }

  async function handleTextFiles() {
    for (const file of textFiles) {
      if (!fileContents[file.name]) {
        try {
          const content = await readTextFile(file);
          fileContents[file.name] = content;
        } catch (error) {
          console.error(`Error reading text file ${file.name}:`, error);
        }
      }
    }
  }

  async function handleImageFiles() {
    for (const file of imageFiles) {
      if (file.name.toLowerCase().endsWith(".txt")) {
        if (!fileContents[file.name]) {
          try {
            await readTextFile(file);
          } catch (error) {
            console.error(`Error reading text file ${file.name}:`, error);
          }
        }
      } else {
        try {
          const base64Data = await convertToBase64(file);
          fileContents[file.name] = base64Data;
        } catch (error) {
          console.error(`Error converting ${file.name} to base64:`, error);
        }
      }
    }
  }

  function readTextFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        fileContents[file.name] = e.target.result;
        resolve(e.target.result);
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  function convertToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function showTextFile(file) {
    const textPreview = document.getElementById("textPreview");
    textPreview.textContent = fileContents[file.name];
    querifyService.showContentArea("textPreviewContainer");
  }

  function showImageFile(file) {
    const imagePreview = document.getElementById("imagePreview");
    const imageInfo = document.getElementById("imageInfo");

    const content = fileContents[file.name];
    const isBase64 = /^data:image\/[a-z]+;base64,/.test(content);

    if (isBase64) {
      imagePreview.src = content;

      // Get file information
      const fileExtension = file.name.split(".").pop().toLowerCase();
      const base64Data = content.split(",")[1];
      const decodedData = atob(base64Data);
      const fileSizeBytes = decodedData.length;
      const fileSizeKB = (fileSizeBytes / 1024).toFixed(2);

      // Get image dimensions
      const img = new Image();
      img.onload = function () {
        const dimensions = `${this.width}x${this.height}`;
        imageInfo.innerHTML = `
          <p>Filename: ${file.name}</p>
          <p>Extension: ${fileExtension}</p>
          <p>Dimensions: ${dimensions}</p>
          <p>Size: ${fileSizeKB} KB</p>
          <p>Base64 character count: ${base64Data.length}</p>
        `;
      };
      img.src = content;
    } else {
      imagePreview.src = "";
      imageInfo.innerHTML = `
        <p>Filename: ${file.name}</p>
        <p>Not a valid image file or base64 string</p>
      `;
    }

    querifyService.showContentArea("imagePreviewContainer");
  }

  // Public interface
  return {
    init,
    getFiles: () => ({ excelFiles, textFiles, imageFiles, fileContents }),
    getSelectedFile: () => selectedFile,
    updateFileStatus: (fileName, isValid, primaryKeys = [], sqlSize = "") => {
      const fileButton = document.querySelector(`[data-file-name="${fileName}"]`);
      if (fileButton) {
        if (isValid) {
          fileButton.classList.add("valid-file");
          fileButton.classList.remove("invalid-file");

          const pkSpan = fileButton.querySelector(".primary-key");
          const sqlSizeSpan = fileButton.querySelector(".sql-size");

          if (pkSpan && primaryKeys.length > 0) {
            pkSpan.textContent = `pk: ${primaryKeys.join(", ")}`;
          }
          if (sqlSizeSpan && sqlSize) {
            sqlSizeSpan.textContent = `size: ${sqlSize}`;
          }
        } else {
          fileButton.classList.add("invalid-file");
          fileButton.classList.remove("valid-file");
        }
      }
    },
  };
}
