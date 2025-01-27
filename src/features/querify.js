import { copyToClipboard, pasteFromClipboard } from "../utils/buttons.js";

export function initQuerify(container, updateHeaderTitle) {
  // updateHeaderTitle("Querify");
  const html = `
    <div class="tool-container querify-tool-container">
      <div class="querify-left-panel">
        <div id="dragDropArea" class="querify-drag-drop-area wide">
          <p>Drag and drop files here or click to select</p>
          <input type="file" id="querifyInputFiles" accept=".xlsx, .xls, .txt, .jpg, .jpeg, .png " multiple style="display: none;" />
        </div>
        <div class="querify-file-list">
          <div id="excelFiles"></div>
          <div id="textFiles"></div>
          <div id="imageFiles"></div>
        </div>
      </div>
      <div class="querify-right-panel">
        <div class="button-group querify-button-group">
          <select id="queryType">
            <option value="merge-classic">MERGE INTO (Querify Classic)</option>
            <option value="merge">MERGE INTO (Compact)</option>
            <option value="insert">INSERT INTO</option>
          </select>
          <button id="generateAll" title="Generate queries for all files">Generate All</button>
          <button id="copySQL">Copy</button>
          <button id="downloadSQL">Download</button>
          <button id="downloadAll">Download All</button>
          <button id="toggleWrap">Word Wrap</button>
          <button id="splitSQL" title="Split query into 90 kilobytes chunks for Jenkins execution" disabled>Split</button>
        </div>
        <div id="errorMessages"></div>
        <div id="queryEditor" class="querify-content-area"></div>
        <div id="imagePreviewContainer" class="querify-content-area" style="display: none;">
          <img id="imagePreview" style="max-width: 100%; max-height: 300px;">
          <div id="imageInfo"></div>
        </div>
        <div id="textPreviewContainer" class="querify-content-area" style="display: none;">
          <pre id="textPreview"></pre>
        </div>
        <div id="progressBar" class="querify-progress-bar" style="display: none;">
          <div class="progress"></div>
        </div>
      </div>
      <button id="aboutQuerify" class="about-button">?</button>
    </div>
  `;
  container.innerHTML = html;

  let excelFiles = [];
  let textFiles = [];
  let imageFiles = [];
  let fileContents = {};

  let selectedFile = null;
  let editor;
  let isWordWrapEnabled = false;
  let generatedQueries = {};
  let fileValidationStatus = {};
  let scriptDependencies = [
    "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/moment.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/codemirror.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/mode/sql/sql.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js",
    "https://cdn.jsdelivr.net/npm/marked/marked.min.js",
  ];

  // Elements
  const fileInput = document.getElementById("querifyInputFiles");
  const queryTypeSelect = document.getElementById("queryType");
  const generateAllButton = document.getElementById("generateAll");
  const errorMessagesDiv = document.getElementById("errorMessages");
  const downloadButton = document.getElementById("downloadSQL");
  const downloadAllButton = document.getElementById("downloadAll");
  const copyButton = document.getElementById("copySQL");
  const toggleWrapButton = document.getElementById("toggleWrap");
  const imagePreviewContainer = document.getElementById(
    "imagePreviewContainer"
  );
  const imagePreview = document.getElementById("imagePreview");
  const imageInfo = document.getElementById("imageInfo");
  const queryEditor = document.getElementById("queryEditor");
  const dragDropArea = document.getElementById("dragDropArea");
  const splitButton = document.getElementById("splitSQL");
  const aboutButton = document.getElementById("aboutQuerify");

  // Event listeners
  fileInput.addEventListener("change", handleFileSelection);
  generateAllButton.addEventListener("click", handleGenerateAll);
  downloadButton.addEventListener("click", handleDownloadSQL);
  downloadAllButton.addEventListener("click", handleDownloadAll);
  copyButton.addEventListener("click", () =>
    copyToClipboard(editor.getValue(), copyButton)
  );
  toggleWrapButton.addEventListener("click", toggleWordWrap);
  queryTypeSelect.addEventListener("change", handleQueryTypeChange);
  dragDropArea.addEventListener("dragover", handleDragOver);
  dragDropArea.addEventListener("dragleave", handleDragLeave);
  dragDropArea.addEventListener("drop", handleDrop);
  dragDropArea.addEventListener("click", () => fileInput.click());
  splitButton.addEventListener("click", handleSplitSQL);
  aboutButton.addEventListener("click", showAboutPopup);

  // Initial commands to load scripts and clear error
  loadScriptInOrder(scriptDependencies);
  clearError();

  function loadScriptInOrder(scripts, index = 0) {
    if (index < scripts.length) {
      const script = document.createElement("script");
      script.src = scripts[index];
      script.onload = () => loadScriptInOrder(scripts, index + 1);
      document.head.appendChild(script);
    } else {
      initializeEditor();
    }
  }

  function initializeEditor() {
    editor = CodeMirror(queryEditor, {
      mode: "text/x-sql",
      theme: "material",
      lineNumbers: true,
      readOnly: true,
    });

    console.log("Editor initialized successfully");
  }

  function selectFile(index, type) {
    if (type === "excel") {
      selectedFile = excelFiles[index];
      if (generatedQueries[selectedFile.name]) {
        editor.setValue(generatedQueries[selectedFile.name].query);
      } else {
        editor.setValue("");
      }

      if (fileValidationStatus[selectedFile.name] === false) {
        showError(fileValidationStatus[selectedFile.name + "_error"]);
      } else {
        clearError();
      }
      showContentArea("queryEditor");
    } else if (type === "text") {
      selectedFile = textFiles[index];
      showTextFile(selectedFile);
    } else if (type === "image") {
      selectedFile = imageFiles[index];
      selectImageFile(selectedFile);
    }

    // Update the highlighting for all file types
    updateSelectedFileHighlight();
    updateSplitButtonState();
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

  function showContentArea(areaId) {
    const contentAreas = document.querySelectorAll(".querify-content-area");
    contentAreas.forEach((area) => (area.style.display = "none"));
    document.getElementById(areaId).style.display = "block";

    // Clear error message if the code editor is being hidden
    if (areaId !== "queryEditor") {
      clearError();
    }
  }

  function handleFileSelection(e) {
    clearError();
    const selectedFiles = Array.from(e.target.files);
    processFiles(selectedFiles);
  }

  function processFiles(files) {
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
    handleGenerateAll();
  }

  function updateFileList() {
    const excelFilesDiv = document.getElementById("excelFiles");
    const textFilesDiv = document.getElementById("textFiles");
    const imageFilesDiv = document.getElementById("imageFiles");
    const fileListContainer = document.querySelector(".querify-file-list");

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

    // Check if there are any files
    const hasFiles =
      excelFiles.length > 0 || textFiles.length > 0 || imageFiles.length > 0;

    // Show or hide the file list container
    if (hasFiles) {
      fileListContainer.style.display = "flex";
      dragDropArea.classList.remove("wide");
      dragDropArea.classList.add("small");
    } else {
      fileListContainer.style.display = "none";
      dragDropArea.classList.remove("small");
      dragDropArea.classList.add("wide");
    }
  }

  function createFileButton(file, index, type) {
    const fileButton = document.createElement("div");
    fileButton.className = "querify-file-button";
    fileButton.dataset.fileName = file.name;

    const fileInfo = document.createElement("div");
    fileInfo.className = "querify-file-info";

    const fileNameSpan = document.createElement("span");
    fileNameSpan.className = "file-name";

    // Remove file extension for Excel files
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

      // Update primary key and SQL size after query generation
      if (
        fileValidationStatus[file.name] === true &&
        generatedQueries[file.name]
      ) {
        const tableName = file.name.split(".")[0];
        const tableSchema = generatedQueries[file.name].tableSchema;
        if (tableSchema) {
          // Use the primary keys stored in generatedQueries
          const primaryKeys = generatedQueries[file.name].primaryKeys;
          pkSpan.textContent = `pk: ${primaryKeys.join(", ")}`;

          // Calculate and update SQL size
          const query = generatedQueries[file.name].query;
          const sizeInBytes = new Blob([query]).size;
          let sizeText;
          if (sizeInBytes >= 1024 * 1024) {
            const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
            sizeText = `${sizeInMB} MB`;
          } else {
            const sizeInKB = (sizeInBytes / 1024).toFixed(2);
            sizeText = `${sizeInKB} KB`;
          }
          sqlSizeSpan.textContent = `size: ${sizeText}`;
        } else {
          pkSpan.textContent = "pk: unknown";
          sqlSizeSpan.textContent = "size: unknown";
        }
      } else {
        pkSpan.textContent = "pk: unknown";
        sqlSizeSpan.textContent = "size: unknown";
      }

      if (fileValidationStatus[file.name] === false) {
        fileButton.classList.add("invalid-file");
      } else if (fileValidationStatus[file.name] === true) {
        fileButton.classList.add("valid-file");
      }
    }

    fileButton.appendChild(fileInfo);

    fileButton.addEventListener("click", () => selectFile(index, type));

    return fileButton;
  }

  function findPrimaryKeys(tableSchema, tableName) {
    console.log("TABLE:", tableSchema, tableName);
    if (!tableSchema || !Array.isArray(tableSchema)) {
      console.warn(`Invalid table schema for ${tableName}`);
      return ["unknown"];
    }

    // Special case for "config" tables
    if (tableName.toLowerCase().endsWith("config")) {
      const parameterKeyField = tableSchema.find(
        (field) => field.field.toLowerCase() === "parameter_key"
      );
      if (parameterKeyField) {
        return [parameterKeyField.field];
      }
    } else if (tableName.toLowerCase().endsWith("event")) {
      const eventCodeField = tableSchema.find(
        (field) => field.field.toLowerCase() === "event_code"
      );
      if (eventCodeField) {
        return [eventCodeField.field];
      }
    }

    // Look for all fields with "PK" or "pk" in the order column
    const pkFields = tableSchema
      .filter(
        (field) => field.order && field.order.toString().toLowerCase() === "pk"
      )
      .map((field) => field.field);

    if (pkFields.length > 0) {
      return pkFields;
    }

    console.warn(
      `No suitable primary key found for ${tableName}. Using the first field as primary key.`
    );
    console.log(tableSchema[0].field);
    return [tableSchema[0] ? tableSchema[0].field.toLowerCase() : "unknown"];
  }

  function handleTextFiles() {
    textFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        console.log(`Found text file: ${file.name}:`);
        fileContents[file.name] = e.target.result;
      };
      reader.readAsText(file);
    });
  }

  function showTextFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const textPreview = document.getElementById("textPreview");
      textPreview.textContent = e.target.result;
      showContentArea("textPreviewContainer");
    };
    reader.readAsText(file);
  }

  function convertToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleImageFiles() {
    for (const file of imageFiles) {
      if (file.name.toLowerCase().endsWith(".txt")) {
        // Use pre-loaded content from processFile function
        if (fileContents[file.name]) {
          console.log(`Using pre-loaded content for ${file.name}`);
        } else {
          // Read base64 if it wasn't loaded
          try {
            await readTextFile(file);
          } catch (error) {
            console.error(`Error reading text file ${file.name}:`, error);
          }
        }
      } else {
        // For regular image files, convert to base64
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
        resolve();
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  function selectImageFile(file) {
    if (file.name.toLowerCase().endsWith(".txt")) {
      // For text files, use the pre-loaded content
      if (fileContents[file.name]) {
        showImagePreview(fileContents[file.name], file.name);
        showContentArea("imagePreviewContainer");
      } else {
        console.warn(`Content for ${file.name} not found`);
      }
    } else {
      // For regular image files, use FileReader as before
      const reader = new FileReader();
      reader.onload = (e) => {
        showImagePreview(e.target.result, file.name);
        showContentArea("imagePreviewContainer");
      };
      reader.readAsDataURL(file);
    }
  }

  function showImagePreview(content, fileName) {
    const imagePreviewContainer = document.getElementById(
      "imagePreviewContainer"
    );
    const imagePreview = document.getElementById("imagePreview");
    const imageInfo = document.getElementById("imageInfo");

    // Check if content is base64
    const isBase64 = /^data:image\/[a-z]+;base64,/.test(content);

    if (isBase64) {
      imagePreview.src = content;
      imagePreviewContainer.style.display = "block";

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
      // If it's not a valid image, hide the preview
      imagePreviewContainer.style.display = "none";
      imageInfo.innerHTML = `
        <p>Filename: ${fileName}</p>
        <p>Not a valid image file or base64 string</p>
      `;
    }
  }

  async function handleGenerateAll() {
    clearError();
    showProgressBar();
    for (let i = 0; i < excelFiles.length; i++) {
      await handleGenerateQuery(excelFiles[i]);
      updateProgress(((i + 1) / excelFiles.length) * 100);
    }
    hideProgressBar();

    if (excelFiles.length > 0) {
      selectFile(0, "excel");
    }
  }

  async function handleGenerateQuery(file) {
    console.log(`Starting handleGenerateQuery for file: ${file.name}`);
    if (!file) {
      showError("Please select an Excel file.");
      return;
    }

    const queryType = queryTypeSelect.value;
    try {
      const result = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array" });

            if (workbook.SheetNames.length < 2) {
              resolve({
                isValid: false,
                errorMessage: "Excel file must contain at least two sheets.",
              });
              return;
            }

            const dataSheet = workbook.Sheets[workbook.SheetNames[0]];
            const schemaSheet = workbook.Sheets[workbook.SheetNames[1]];

            let tableData = XLSX.utils.sheet_to_json(dataSheet, { header: 1 });
            const tableSchema = XLSX.utils.sheet_to_json(schemaSheet, {
              header: ["field", "dataType", "nullable", "blank", "order"],
            });

            if (tableSchema.length === 0) {
              resolve({
                isValid: false,
                errorMessage: "Schema sheet is empty or improperly formatted.",
              });
              return;
            }

            console.log(`Validating data for ${file.name}`);
            const validationResult = validateData(tableData, tableSchema);
            if (!validationResult.isValid) {
              resolve({
                isValid: false,
                errorMessage: validationResult.errorMessage,
              });
              return;
            }

            console.log(`Processing image data for ${file.name}`);
            tableData = await processImageData(tableData, tableSchema);

            const fileName = file.name.split(".").slice(0, -1).join(".");
            console.log(`Generating SQL query for ${fileName}`);
            const primaryKeys = findPrimaryKeys(tableSchema, fileName);
            const query = generateSQLQuery(
              tableData,
              tableSchema,
              queryType,
              fileName,
              primaryKeys
            );
            resolve({
              isValid: true,
              query: query,
              tableSchema: tableSchema,
              primaryKeys: primaryKeys,
            });
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      });

      console.log(
        `Query generation result for ${file.name}: ${
          result.isValid ? "Valid" : "Invalid"
        }`
      );

      if (result.isValid) {
        generatedQueries[file.name] = {
          query: result.query,
          tableSchema: result.tableSchema,
          primaryKeys: result.primaryKeys,
          fullTableName: file.name.split(".").slice(0, -1).join("."),
        };
        fileValidationStatus[file.name] = true;
        if (file === selectedFile) {
          editor.setValue(result.query);
          clearError();
        }
      } else {
        fileValidationStatus[file.name] = false;
        fileValidationStatus[file.name + "_error"] = result.errorMessage;
        if (file === selectedFile) {
          showError(result.errorMessage);
        }
      }
      updateFileList(); // Update file list to reflect new validation status
    } catch (error) {
      console.error(`Error in handleGenerateQuery for ${file.name}:`, error);
      showError(`Error processing ${file.name}: ${error.message}`);
    }
  }

  async function processImageData(tableData, tableSchema) {
    console.log("Starting processImageData");
    const clobFields = tableSchema.filter((field) =>
      field.dataType.toUpperCase().startsWith("CLOB")
    );

    if (clobFields.length === 0) {
      console.log("No CLOB fields found, returning original data");
      return tableData;
    }

    for (let i = 1; i < tableData.length; i++) {
      for (const clobField of clobFields) {
        const clobFieldName = clobField.field.toLowerCase();
        const clobColumnIndex = tableData[0].findIndex(
          (field) => field.toLowerCase() === clobFieldName
        );

        if (clobColumnIndex === -1) {
          console.log(
            `CLOB field ${clobFieldName} not found in data, skipping`
          );
          continue;
        }

        let content = tableData[i][clobColumnIndex];
        if (typeof content !== "string" || content.length >= 100) {
          continue;
        }

        const baseFileName = content
          .split(".")
          .slice(0, -1)
          .join(".")
          .toLowerCase();
        console.log("baseFileName:", baseFileName);
        const matchingFile = findMatchingFile(baseFileName);

        if (matchingFile) {
          try {
            if (matchingFile.name.toLowerCase().endsWith(".txt")) {
              console.log(`Reading text file: ${matchingFile.name}`);
              content = await readTextFile(matchingFile);
            } else {
              console.log(
                `Converting image file to base64: ${matchingFile.name}`
              );
              content = await convertToBase64(matchingFile);
            }

            if (content.startsWith("data:image")) {
              tableData[i][clobColumnIndex] = content;
            } else {
              console.warn(
                `Invalid image data for ${matchingFile.name}, keeping original value`
              );
            }
          } catch (error) {
            console.warn(
              `Failed to process file ${matchingFile.name}: ${error.message}`
            );
          }
        } else {
          console.log(
            `No matching file found for ${baseFileName}, keeping original value`
          );
        }
      }
    }

    console.log("Finished processImageData");
    return tableData;
  }

  function findMatchingFile(baseFileName) {
    return [...textFiles, ...imageFiles].find(
      (file) =>
        file.name.split(".").slice(0, -1).join(".").toLowerCase() ===
        baseFileName
    );
  }

  function ensureBase64Prefix(content) {
    if (!content.startsWith("data:")) {
      // If there's no data URI scheme, assume it's a raw base64 string
      return "data:image/png;base64," + content;
    }
    return content;
  }

  function isValidBase64(str) {
    // Remove data URI scheme if present
    const base64String = str.split(",")[1] || str;
    try {
      return btoa(atob(base64String)) === base64String;
    } catch (err) {
      return false;
    }
  }

  function formatCLOB(content) {
    const chunkSize = 1000;
    let formattedContent = "";
    for (let i = 0; i < content.length; i += chunkSize) {
      formattedContent += content.slice(i, i + chunkSize) + "\n";
    }
    return formattedContent;
  }

  function getExcelColumnName(index) {
    let columnName = "";
    while (index >= 0) {
      columnName = String.fromCharCode(65 + (index % 26)) + columnName;
      index = Math.floor(index / 26) - 1;
    }
    return columnName;
  }

  function validateData(tableData, tableSchema) {
    if (tableData.length === 0) {
      return { isValid: false, errorMessage: "Excel file is empty." };
    }

    if (tableData[0].length !== tableSchema.length) {
      return {
        isValid: false,
        errorMessage: `Mismatch in field count. Sheet1 has ${tableData[0].length} field names, but Sheet2 has ${tableSchema.length} field names.`,
      };
    }

    const fieldNames = new Set(tableData[0]);
    const schemaFieldNames = new Set(tableSchema.map((field) => field.field));

    // Check if all fields in Sheet1 exist in Sheet2
    for (let field of fieldNames) {
      if (!schemaFieldNames.has(field)) {
        return {
          isValid: false,
          errorMessage: `Field '${field}' in Sheet1 does not exist in Sheet2.`,
        };
      }
    }

    // Check if all fields in Sheet2 exist in Sheet1
    for (let field of schemaFieldNames) {
      if (!fieldNames.has(field)) {
        return {
          isValid: false,
          errorMessage: `Field '${field}' in Sheet2 does not exist in Sheet1.`,
        };
      }
    }

    // Create a map of field names to their indices in Sheet1
    const fieldIndices = {};
    tableData[0].forEach((field, index) => {
      fieldIndices[field] = index;
    });

    // Validate data types and check for NULL in non-nullable fields
    for (let i = 1; i < tableData.length; i++) {
      for (let schema of tableSchema) {
        const fieldIndex = fieldIndices[schema.field];
        const value = tableData[i][fieldIndex];

        // Ignore validation for created, updated, and config_id
        if (
          schema.field.toLowerCase() === "created_time" ||
          schema.field.toLowerCase() === "created_by" ||
          schema.field.toLowerCase() === "updated_time" ||
          schema.field.toLowerCase() === "updated_by" ||
          schema.field.toLowerCase() === "config_id"
        ) {
          continue;
        }

        // Check for NULL in non-nullable fields
        if (
          schema.nullable.toLowerCase() === "no" &&
          (value === null ||
            value === undefined ||
            value === "NULL" ||
            value === "null")
        ) {
          const columnLetter = getExcelColumnName(fieldIndex);
          return {
            isValid: false,
            errorMessage: `NON NULLABLE data on ROW ${
              i + 1
            } COLUMN ${columnLetter} is NULL(${schema.field}), PLEASE RECHECK`,
          };
        }

        if (!validateField(value, schema)) {
          const columnLetter = getExcelColumnName(fieldIndex);
          return {
            isValid: false,
            errorMessage: `Invalid data in Sheet1 at row ${
              i + 1
            }, column ${columnLetter} (${schema.field}). Expected ${
              schema.dataType
            }, got ${value}`,
          };
        }
      }
    }

    return { isValid: true, errorMessage: "" };
  }

  function validateField(value, schema) {
    if (
      schema.nullable.toLowerCase() === "yes" &&
      (value === null ||
        value === undefined ||
        value === "NULL" ||
        value === "null" ||
        value === "")
    ) {
      return true;
    }

    switch (schema.dataType.split("(")[0].toUpperCase()) {
      case "VARCHAR2":
      case "VARCHAR":
        return true;
      case "NUMBER":
        return !isNaN(parseFloat(value)) && isFinite(value);
      case "TIMESTAMP":
        return isValidTimestamp(value);
      default:
        return true;
    }
  }

  function isValidTimestamp(value) {
    if (typeof value === "string") {
      if (value.toLowerCase() === "sysdate") {
        return true;
      }
    }

    const formats = [
      "DD-MM-YYYY",
      "DD-MM-YYYY HH:mm:ss",
      "YYYY-MM-DD",
      "YYYY-MM-DD HH:mm:ss",
      "DD-MM-YYYY HH.mm.ss,SSSSSSSSS",
      "DD/MM/YYYY",
      "DD/M/YYYY",
      "M/D/YYYY H:mm:ss.SSSSSS A",
    ];

    return formats.some((format) => moment(value, format, true).isValid());
  }

  function generateSQLQuery(
    tableData,
    tableSchema,
    queryType,
    fileName,
    primaryKeys
  ) {
    let schemaName, tableName;

    if (fileName.includes(".")) {
      [schemaName, tableName] = fileName.split(".");
    } else {
      schemaName = "schema_name";
      tableName = fileName;
      console.log("No dot found - using fileName as tableName:", tableName);
    }

    const fullTableName = `${schemaName.toLowerCase()}.${tableName.toLowerCase()}`;
    console.log("Final fullTableName:", `${fullTableName}`);
    console.log("primaryKeys:", primaryKeys);

    // Use the field names from Sheet 1 (tableData[0]) instead of the schema
    const fieldNames = tableData[0].map((field) => field.toLowerCase());

    const fieldIndices = {};
    tableData[0].forEach((field, index) => {
      fieldIndices[field.toLowerCase()] = index;
    });

    // Create a map of field names to their schema information
    const schemaMap = {};
    tableSchema.forEach((schema) => {
      schemaMap[schema.field.toLowerCase()] = schema;
    });

    let query = "";

    if (queryType === "insert") {
      query = `SET DEFINE OFF;\n\n`;
      for (let i = 1; i < tableData.length; i++) {
        query += `INSERT INTO ${fullTableName} (${fieldNames.join(", ")}) `;
        query += `VALUES (`;
        const values = fieldNames.map((field) => {
          const value = tableData[i][fieldIndices[field]];
          return formatValue(value, schemaMap[field], fullTableName);
        });
        query += values.join(", ");
        query += ");\n";
      }
    } else if (queryType === "merge") {
      query = `SET DEFINE OFF;\n\n`;
      query += `MERGE INTO ${fullTableName} t\nUSING (\n`;

      for (let i = 1; i < tableData.length; i++) {
        query += "  SELECT ";
        query += fieldNames
          .map((field) => {
            const value = tableData[i][fieldIndices[field]];
            const schema = schemaMap[field];
            return `${formatValue(value, schema, fullTableName)} AS ${field}`;
          })
          .join(", ");
        query += " FROM DUAL";
        if (i < tableData.length - 1) query += " UNION ALL\n";
      }

      query += `\n) s\nON (${primaryKeys
        .map((pk) => `t.${pk} = s.${pk}`)
        .join(" AND ")})\n`;
      query += `WHEN MATCHED THEN UPDATE SET\n`;
      query += fieldNames
        .filter(
          (field) =>
            !primaryKeys.some(
              (pk) => pk.toLowerCase() === field.toLowerCase()
            ) &&
            field.toLowerCase() !== "created_time" &&
            field.toLowerCase() !== "created_by"
        )
        .map((field) => `  t.${field} = s.${field}`)
        .join(",\n");
      query += `\nWHEN NOT MATCHED THEN INSERT (${fieldNames.join(", ")})\n`;
      query += `VALUES (${fieldNames
        .map((field) => `s.${field}`)
        .join(", ")});\n`;
    } else if (queryType === "merge-classic") {
      query = `SET DEFINE OFF;\n\n`;
      for (let i = 1; i < tableData.length; i++) {
        query += `MERGE INTO ${fullTableName} tgt\nUSING (SELECT`;
        query += fieldNames
          .map((field) => {
            const value = tableData[i][fieldIndices[field]];
            const schema = schemaMap[field];
            return `\n  ${formatValue(
              value,
              schema,
              fullTableName
            )} AS ${field}`;
          })
          .join(",");
        query += `\nFROM DUAL) src\nON (${primaryKeys
          .map((pk) => `tgt.${pk} = src.${pk}`)
          .join(" AND ")})\n`;
        query += `WHEN MATCHED THEN UPDATE SET\n`;
        query += fieldNames
          .filter(
            (field) =>
              !primaryKeys.some(
                (pk) => pk.toLowerCase() === field.toLowerCase()
              ) &&
              field.toLowerCase() !== "created_time" &&
              field.toLowerCase() !== "created_by"
          )
          .map((field) => `  tgt.${field} = src.${field}`)
          .join(",\n");
        query += `\nWHEN NOT MATCHED THEN INSERT (${fieldNames.join(", ")})\n`;
        query += `VALUES (${fieldNames
          .map((field) => `src.${field}`)
          .join(", ")});\n\n`;
      }
    }

    const pkConditions = primaryKeys.map((pk) => {
      const pkValues = tableData
        .slice(1)
        .map((row) => {
          const pkIndex = fieldIndices[pk.toLowerCase()];
          const pkValue = row[pkIndex];
          const pkSchema = schemaMap[pk.toLowerCase()];
          return formatValue(pkValue, pkSchema, fullTableName);
        })
        .filter((value) => value !== "NULL");
      return `${pk} IN (${pkValues.join(", ")})`;
    });

    const whereClause = pkConditions.join(" AND ");

    query += `\n--Count updated data in the last 30 minutes\nSELECT COUNT(*) FROM ${fullTableName} WHERE updated_time >= SYSDATE - INTERVAL '30' MINUTE;`;
    query += `\nSELECT * FROM ${fullTableName} WHERE ${whereClause};`;

    return query;
  }

  function formatValue(value, schema, fullTableName) {
    const fieldName = schema.field.toLowerCase();
    const dataType = schema.dataType.split("(")[0].toUpperCase();
    const capacity = schema.dataType.match(/\((\d+)\)/);

    // Handle sequential config ID
    if (fieldName.toLowerCase() === "config_id" && dataType === "NUMBER") {
      return `(SELECT MAX(${fieldName})+1 FROM ${fullTableName})`;
    }

    // Handle sequential system config
    if (
      fieldName === "system_config_id" &&
      fullTableName.toLowerCase() === "config.system_config"
    ) {
      return `(SELECT MAX(CAST(${fieldName} AS INT))+1 FROM ${fullTableName})`;
    }

    // Handle created_time and updated_time
    if (fieldName === "created_time" || fieldName === "updated_time") {
      return `SYSDATE`;
    }

    // Handle created_by and updated_by
    if (fieldName === "created_by" || fieldName === "updated_by") {
      return `'SYSTEM'`;
    }

    if (
      value === null ||
      value === undefined ||
      value === "NULL" ||
      value === "null"
    ) {
      return "NULL";
    }

    switch (dataType) {
      case "VARCHAR2":
      case "VARCHAR":
        return `'${value.toString().replace(/'/g, "''")}'`;
      case "CHAR":
        if (capacity) {
          return `RPAD('${value.toString().replace(/'/g, "''")}', ${
            capacity[1]
          })`;
        }
        return `'${value.toString().replace(/'/g, "''")}'`;
      case "NUMBER":
        return value;
      case "DATE":
        return `TO_DATE('${value}', 'YYYY-MM-DD')`;
      case "TIMESTAMP":
        return formatTimestamp(value);
      case "CLOB":
        return formatCLOB(value);
      case "BLOB":
        return formatBLOB(value);
      default:
        return `'${value.toString().replace(/'/g, "''")}'`;
    }
  }

  function formatTimestamp(value) {
    if (value.toUpperCase() === "SYSDATE") {
      return "SYSDATE";
    }

    // Detect the date format
    let format;
    let oracleFormat;
    if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
      format = "DD-MM-YYYY";
      oracleFormat = "DD-MM-YYYY";
    } else if (/^\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2}$/.test(value)) {
      format = "DD-MM-YYYY HH:mm:ss";
      oracleFormat = "DD-MM-YYYY HH24:MI:SS";
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      format = "YYYY-MM-DD";
      oracleFormat = "YYYY-MM-DD";
    } else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
      format = "YYYY-MM-DD HH:mm:ss";
      oracleFormat = "YYYY-MM-DD HH24:MI:SS";
    } else if (/^\d{2}-\d{2}-\d{4} \d{2}\.\d{2}\.\d{2},\d{9}$/.test(value)) {
      format = "DD-MM-YYYY HH.mm.ss,SSSSSSSSS";
      oracleFormat = "DD-MM-YYYY HH24:MI:SS.FF9";
    } else if (
      /^\d{1,2}\/\d{1,2}\/\d{4} \d{1,2}:\d{2}:\d{2}(\.\d{6})? [AP]M$/.test(
        value
      )
    ) {
      format = "M/D/YYYY h:mm:ss.SSSSSS A";
      oracleFormat = "MM/DD/YYYY HH24:MI:SS.FF6";
    } else {
      // Default format if none of the above match
      format = "DD-MM-YYYY HH:mm:ss";
      oracleFormat = "DD-MM-YYYY HH24:MI:SS";
    }

    // Parse the date using the detected format
    const parsedDate = moment(value, format, true);

    if (!parsedDate.isValid()) {
      console.warn(`Invalid date format: ${value}. Using as-is.`);
      return `TO_TIMESTAMP('${value.replace(/'/g, "''")}', '${oracleFormat}')`;
    }

    // Format the date to a standardized string
    let formattedDate;
    if (format === "DD/MM/YYYY") {
      formattedDate = parsedDate.format("DD-MM-YYYY");
      oracleFormat = "DD-MM-YYYY";
    } else {
      formattedDate = parsedDate.format("YYYY-MM-DD HH:mm:ss.SSSSSS");
      oracleFormat = "YYYY-MM-DD HH24:MI:SS.FF6";
    }

    return `TO_TIMESTAMP('${formattedDate}', '${oracleFormat}')`;
  }

  function formatCLOB(value) {
    const chunkSize = 1000;
    let result = "";
    let currentChunkSize = 0;
    let isFirstChunk = true;

    for (let i = 0; i < value.length; i++) {
      let char = value[i];

      if (char === "'" || char === "\u2018" || char === "\u2019") {
        char = "''";
      } else if (char === "\u201C" || char === "\u201D") {
        char = '"';
      }

      if (currentChunkSize + char.length > chunkSize || isFirstChunk) {
        if (!isFirstChunk) {
          result += "') || \n";
        }
        result += "to_clob('";
        currentChunkSize = 0;
        isFirstChunk = false;
      }

      result += char;
      currentChunkSize += char.length;
    }

    result += "')";
    return result;
  }

  function formatBLOB(value) {
    // Assuming value is a base64 encoded string
    return `UTL_RAW.CAST_TO_RAW('${value}')`;
  }

  function handleDownloadSQL() {
    if (!selectedFile) {
      showError("No file selected. Please select a file to download.");
      return;
    }

    const sql = generatedQueries[selectedFile.name]?.query;
    if (!sql) {
      showError("No SQL query generated for the selected file.");
      return;
    }

    const downloadButton = document.getElementById("downloadSQL");
    const originalText = downloadButton.textContent;
    const originalColor = downloadButton.style.backgroundColor;

    // Change button appearance
    downloadButton.textContent = "Downloading";
    downloadButton.style.backgroundColor = "red";
    downloadButton.disabled = true;

    const blob = new Blob([sql], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const fileName = selectedFile.name.replace(/\.xlsx$/, "");
    a.href = url;
    a.download = `${fileName}.sql`;

    // Use setTimeout to allow the UI to update before starting the download
    setTimeout(() => {
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Revert button appearance after a short delay
      setTimeout(() => {
        downloadButton.textContent = originalText;
        downloadButton.style.backgroundColor = originalColor;
        downloadButton.disabled = false;
      }, 1000); // Delay for 1 second to show "Downloading" state
    }, 0);
  }

  function handleDownloadAll() {
    if (Object.keys(generatedQueries).length === 0) {
      showError("No queries generated yet.");
      return;
    }

    const downloadAllButton = document.getElementById("downloadAll");
    const originalText = downloadAllButton.textContent;
    const originalColor = downloadAllButton.style.backgroundColor;

    // Change button appearance
    downloadAllButton.textContent = "Preparing...";
    downloadAllButton.style.backgroundColor = "red";
    downloadAllButton.disabled = true;

    const zip = new JSZip();
    for (const [fileName, queryData] of Object.entries(generatedQueries)) {
      const sqlFileName = fileName.replace(/\.xlsx$/, ".sql");
      zip.file(sqlFileName, queryData.query);
    }

    zip
      .generateAsync({ type: "blob" })
      .then((content) => {
        const url = URL.createObjectURL(content);
        const a = document.createElement("a");
        const currentDate = new Date().toISOString().split("T")[0]; // Format: YYYY-MM-DD
        a.href = url;
        a.download = `querify-${currentDate}.zip`;

        downloadAllButton.textContent = "Downloading...";

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      })
      .catch((error) => {
        console.error("Error generating zip file:", error);
        showError("Failed to generate zip file. Please try again.");
      })
      .finally(() => {
        // Revert button appearance
        setTimeout(() => {
          downloadAllButton.textContent = originalText;
          downloadAllButton.style.backgroundColor = originalColor;
          downloadAllButton.disabled = false;
        }, 1000);
      });
  }

  function showError(message) {
    errorMessagesDiv.textContent = message;
    errorMessagesDiv.style.color = "red";
    errorMessagesDiv.style.display = "block";
  }

  function clearError() {
    errorMessagesDiv.textContent = "";
    errorMessagesDiv.style.display = "none";
  }

  function toggleWordWrap() {
    isWordWrapEnabled = !isWordWrapEnabled;
    editor.setOption("lineWrapping", isWordWrapEnabled);
    toggleWrapButton.style.textDecoration = isWordWrapEnabled
      ? "underline"
      : "none";
  }

  function handleQueryTypeChange() {
    if (excelFiles.length > 0) {
      handleGenerateAll();
    }
    updateSplitButtonState();
  }

  function updateSplitButtonState() {
    const queryType = queryTypeSelect.value;
    splitButton.disabled = !(
      selectedFile &&
      (queryType === "merge-classic" || queryType === "insert")
    );
  }

  async function handleSplitSQL() {
    if (!selectedFile || !generatedQueries[selectedFile.name]) {
      showError("No valid SQL query to split.");
      return;
    }

    const splitButton = document.getElementById("splitSQL");
    const originalText = splitButton.textContent;
    const originalColor = splitButton.style.backgroundColor;

    // Change button appearance
    splitButton.textContent = "Processing...";
    splitButton.style.backgroundColor = "red";
    splitButton.disabled = true;

    const sql = generatedQueries[selectedFile.name].query;
    const queryType = queryTypeSelect.value;
    const maxChunkSize = 90 * 1024; // 90 KB

    // Get the necessary data from the generatedQueries object
    const fullTableName = generatedQueries[selectedFile.name].fullTableName;

    showProgressBar();
    updateProgress(0);

    try {
      const { chunks, oversizedChunksCount } = splitSQLQuery(
        sql,
        queryType,
        maxChunkSize,
        fullTableName
      );
      const zip = new JSZip();

      chunks.forEach((chunk, index) => {
        const paddedIndex = String(index + 1).padStart(2, "0");
        const chunkFileName = `${paddedIndex}_${selectedFile.name.replace(
          /\.xlsx$/,
          ""
        )}.sql`;
        zip.file(chunkFileName, chunk);
      });

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedFile.name.replace(/\.xlsx$/, "")}_split.zip`;

      splitButton.textContent = "Downloading...";

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showSuccess(
        `SQL query split into ${chunks.length} chunks. ${oversizedChunksCount} chunk(s) exceed 90 KB.`
      );
    } catch (error) {
      showError(`Failed to split SQL: ${error.message}`);
    } finally {
      hideProgressBar();

      // Revert button appearance after a short delay
      setTimeout(() => {
        splitButton.textContent = originalText;
        splitButton.style.backgroundColor = originalColor;
        splitButton.disabled = false;
      }, 1000); // Delay for 1 second to show "Downloading" state
    }
  }

  function splitSQLQuery(sql, queryType, maxChunkSize, fullTableName) {
    let chunks = [];
    let currentChunk = "";
    let oversizedChunksCount = 0;
    const statements = sql.split(/;(?=(?:[^']*'[^']*')*[^']*$)/);

    // Filter out SET DEFINE OFF and SELECT statements
    const relevantStatements = statements.filter((stmt) => {
      const trimmedStmt = stmt.trim().toUpperCase();
      return (
        !trimmedStmt.startsWith("SET DEFINE OFF") &&
        !trimmedStmt.startsWith("SELECT") &&
        (trimmedStmt.startsWith("INSERT") || trimmedStmt.startsWith("MERGE"))
      );
    });

    for (const statement of relevantStatements) {
      if (statement.trim() === "") continue;

      const potentialChunk = currentChunk + statement + ";"; // + ";\n";

      if (potentialChunk.length > maxChunkSize && currentChunk !== "") {
        chunks.push(currentChunk);
        currentChunk = statement + ";"; // + ";\n";
      } else {
        currentChunk = potentialChunk;
      }
      if (statement.length + 1 > maxChunkSize) {
        oversizedChunksCount++;
        console.log(
          `${oversizedChunksCount} - A single statement exceeds ${maxChunkSize} bytes and cannot be split further.`
        );
      }
    }

    if (currentChunk !== "") {
      chunks.push(currentChunk);
    }

    if (chunks.length === 0) {
      throw new Error(
        "Unable to split the SQL query into chunks smaller than 90 KB."
      );
    }

    // Add SET DEFINE OFF at the beginning of each chunk
    chunks = chunks.map((chunk) => "SET DEFINE OFF;" + chunk);

    // Add SELECT statement to each chunk
    chunks = chunks.map((chunk) => {
      const tableName = extractTableName(chunk, queryType);
      return (
        chunk +
        `\n--Count updated data in the last 30 minutes\nSELECT COUNT(*) FROM ${fullTableName} WHERE updated_time >= SYSDATE - INTERVAL '30' MINUTE;`
      );
    });

    return { chunks, oversizedChunksCount };
  }

  function extractTableName(chunk, queryType) {
    let match;
    if (queryType === "merge-classic") {
      match = chunk.match(/MERGE INTO (\w+\.?\w+)/i);
    } else if (queryType === "insert") {
      match = chunk.match(/INSERT INTO (\w+\.?\w+)/i);
    }
    return match ? match[1] : "unknown_table";
  }

  function showSuccess(message) {
    errorMessagesDiv.textContent = message;
    errorMessagesDiv.style.color = "green";
    errorMessagesDiv.style.display = "block";
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

  function showProgressBar() {
    document.getElementById("progressBar").style.display = "block";
  }

  function hideProgressBar() {
    document.getElementById("progressBar").style.display = "none";
  }

  function updateProgress(percentage) {
    document.querySelector(
      "#progressBar .progress"
    ).style.width = `${percentage}%`;
  }

  // Implement a simple tooltip functionality
  const buttons = document.querySelectorAll("button[title]");
  buttons.forEach((button) => {
    button.addEventListener("mouseover", showTooltip);
    button.addEventListener("mouseout", hideTooltip);
  });

  function showTooltip(e) {
    const tooltip = document.createElement("div");
    tooltip.className = "querify-tooltip";
    tooltip.textContent = e.target.getAttribute("title");
    document.body.appendChild(tooltip);
    positionTooltip(e, tooltip);
  }

  function hideTooltip() {
    const tooltip = document.querySelector(".querify-tooltip");
    if (tooltip) tooltip.remove();
  }

  function positionTooltip(e, tooltip) {
    const rect = e.target.getBoundingClientRect();
    tooltip.style.left = `${
      rect.left + rect.width / 2 - tooltip.offsetWidth / 2
    }px`;
    tooltip.style.top = `${rect.top - 30}px`;
  }

  function showAboutPopup() {
    const popup = document.createElement("div");
    popup.className = "about-popup";

    const closeButton = document.createElement("span");
    closeButton.className = "about-popup-close";
    closeButton.innerHTML = "&times;";
    closeButton.onclick = closeAboutPopup;

    const content = document.createElement("div");
    content.className = "about-popup-content markdown-body"; // Add this class

    // Load the MD file
    fetch("src/styles/about-querify.md")
      .then((response) => response.text())
      .then((text) => {
        content.innerHTML = marked.parse(text);

        popup.appendChild(closeButton);
        popup.appendChild(content);

        const overlay = document.createElement("div");
        overlay.className = "about-popup-overlay";
        overlay.onclick = closeAboutPopup;

        document.body.appendChild(overlay);
        document.body.appendChild(popup);

        overlay.style.display = "block";
        popup.style.display = "block";
      })
      .catch((error) => {
        console.error("Error loading the about-querify.md file:", error);
        content.innerHTML =
          "<p>Error loading content. Please try again later.</p>";

        popup.appendChild(closeButton);
        popup.appendChild(content);

        const overlay = document.createElement("div");
        overlay.className = "about-popup-overlay";
        overlay.onclick = closeAboutPopup;

        document.body.appendChild(overlay);
        document.body.appendChild(popup);

        overlay.style.display = "block";
        popup.style.display = "block";
      });
  }

  function closeAboutPopup() {
    const popup = document.querySelector(".about-popup");
    const overlay = document.querySelector(".about-popup-overlay");

    if (popup) popup.remove();
    if (overlay) overlay.remove();
  }
}
