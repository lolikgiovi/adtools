// components/control-panel.js
export function initControlPanel(querifyService) {
  // Get references to control elements
  const queryTypeSelect = document.getElementById("queryType");
  const generateAllButton = document.getElementById("generateAll");
  const downloadButton = document.getElementById("downloadSQL");
  const downloadAllButton = document.getElementById("downloadAll");
  const copyButton = document.getElementById("copySQL");
  const toggleWrapButton = document.getElementById("toggleWrap");
  const splitButton = document.getElementById("splitSQL");

  function init() {
    setupEventListeners();
  }

  function setupEventListeners() {
    queryTypeSelect.addEventListener("change", handleQueryTypeChange);
    generateAllButton.addEventListener("click", handleGenerateAll);
    downloadButton.addEventListener("click", handleDownloadSQL);
    downloadAllButton.addEventListener("click", handleDownloadAll);
    copyButton.addEventListener("click", handleCopySQL);
    toggleWrapButton.addEventListener("click", handleToggleWrap);
    splitButton.addEventListener("click", handleSplitSQL);
  }

  function handleQueryTypeChange() {
    const files = querifyService.getFiles();
    if (files.excel.length > 0) {
      querifyService.handleGenerateAll();
    }
    updateSplitButtonState();
  }

  async function handleGenerateAll() {
    const files = querifyService.getFiles();
    if (files.excel.length === 0) {
      querifyService.showError("No Excel files to process.");
      return;
    }

    // Change button appearance
    const originalText = generateAllButton.textContent;
    const originalColor = generateAllButton.style.backgroundColor;
    generateAllButton.textContent = "Generating...";
    generateAllButton.style.backgroundColor = "red";
    generateAllButton.disabled = true;

    try {
      for (let i = 0; i < files.excel.length; i++) {
        const result = await querifyService.processFile(files.excel[i], queryTypeSelect.value);

        if (result.isValid) {
          // Calculate SQL size
          const sizeInBytes = new Blob([result.query]).size;
          let sizeText;
          if (sizeInBytes >= 1024 * 1024) {
            sizeText = `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
          } else {
            sizeText = `${(sizeInBytes / 1024).toFixed(2)} KB`;
          }

          // Update file status with primary keys and SQL size
          querifyService.updateFileStatus(files.excel[i].name, true, result.primaryKeys, sizeText);
        }
      }

      // Select first file if no file is selected
      if (!querifyService.getSelectedFile() && files.excel.length > 0) {
        querifyService.selectFile(files.excel[0], "excel");
      }
    } catch (error) {
      console.error("Error in handleGenerateAll:", error);
      querifyService.showError(`Error generating queries: ${error.message}`);
    } finally {
      // Revert button appearance
      setTimeout(() => {
        generateAllButton.textContent = originalText;
        generateAllButton.style.backgroundColor = originalColor;
        generateAllButton.disabled = false;
      }, 1000);
    }
  }

  async function handleDownloadSQL() {
    const selectedFile = querifyService.getSelectedFile();
    if (!selectedFile) {
      querifyService.showError("No file selected. Please select a file to download.");
      return;
    }

    const sql = querifyService.getGeneratedQuery(selectedFile.name)?.query;
    if (!sql) {
      querifyService.showError("No SQL query generated for the selected file.");
      return;
    }

    // Change button appearance during download
    const originalText = downloadButton.textContent;
    const originalColor = downloadButton.style.backgroundColor;
    downloadButton.textContent = "Downloading";
    downloadButton.style.backgroundColor = "red";
    downloadButton.disabled = true;

    try {
      const blob = new Blob([sql], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const fileName = selectedFile.name.replace(/\.xlsx$/, "");
      a.href = url;
      a.download = `${fileName}.sql`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      querifyService.showError("Failed to download SQL file.");
      console.error("Download error:", error);
    } finally {
      // Revert button appearance after a short delay
      setTimeout(() => {
        downloadButton.textContent = originalText;
        downloadButton.style.backgroundColor = originalColor;
        downloadButton.disabled = false;
      }, 1000);
    }
  }

  async function handleDownloadAll() {
    const generatedQueries = querifyService.getAllGeneratedQueries();
    if (Object.keys(generatedQueries).length === 0) {
      querifyService.showError("No queries generated yet.");
      return;
    }

    // Change button appearance
    const originalText = downloadAllButton.textContent;
    const originalColor = downloadAllButton.style.backgroundColor;
    downloadAllButton.textContent = "Preparing...";
    downloadAllButton.style.backgroundColor = "red";
    downloadAllButton.disabled = true;

    try {
      const zip = new JSZip();
      for (const [fileName, queryData] of Object.entries(generatedQueries)) {
        const sqlFileName = fileName.replace(/\.xlsx$/, ".sql");
        zip.file(sqlFileName, queryData.query);
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      const currentDate = new Date().toISOString().split("T")[0];
      a.href = url;
      a.download = `querify-${currentDate}.zip`;

      downloadAllButton.textContent = "Downloading...";

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      querifyService.showError("Failed to generate zip file. Please try again.");
      console.error("Zip generation error:", error);
    } finally {
      setTimeout(() => {
        downloadAllButton.textContent = originalText;
        downloadAllButton.style.backgroundColor = originalColor;
        downloadAllButton.disabled = false;
      }, 1000);
    }
  }

  function handleCopySQL() {
    const sql = querifyService.getCurrentQuery();
    if (sql) {
      copyToClipboard(sql, copyButton);
    } else {
      querifyService.showError("No SQL query to copy.");
    }
  }

  function handleToggleWrap() {
    const isWrapped = querifyService.toggleWordWrap();
    toggleWrapButton.style.textDecoration = isWrapped ? "underline" : "none";
  }

  async function handleSplitSQL() {
    const selectedFile = querifyService.getSelectedFile();
    if (!selectedFile || !querifyService.getGeneratedQuery(selectedFile.name)) {
      querifyService.showError("No valid SQL query to split.");
      return;
    }

    // Change button appearance
    const originalText = splitButton.textContent;
    const originalColor = splitButton.style.backgroundColor;
    splitButton.textContent = "Processing...";
    splitButton.style.backgroundColor = "red";
    splitButton.disabled = true;

    try {
      const result = await querifyService.splitQuery(selectedFile.name);
      const zip = new JSZip();

      result.chunks.forEach((chunk, index) => {
        const paddedIndex = String(index + 1).padStart(2, "0");
        const chunkFileName = `${paddedIndex}_${selectedFile.name.replace(/\.xlsx$/, "")}.sql`;
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

      querifyService.showSuccess(
        `SQL query split into ${result.chunks.length} chunks. ${result.oversizedChunksCount} chunk(s) exceed 90 KB.`
      );
    } catch (error) {
      querifyService.showError(`Failed to split SQL: ${error.message}`);
    } finally {
      setTimeout(() => {
        splitButton.textContent = originalText;
        splitButton.style.backgroundColor = originalColor;
        splitButton.disabled = false;
      }, 1000);
    }
  }

  function updateSplitButtonState() {
    const selectedFile = querifyService.getSelectedFile();
    const queryType = queryTypeSelect.value;
    splitButton.disabled = !(selectedFile && (queryType === "merge-classic" || queryType === "insert"));
  }

  // Helper function for copying to clipboard
  function copyToClipboard(text, button) {
    const originalText = button.textContent;

    navigator.clipboard
      .writeText(text)
      .then(() => {
        button.textContent = "Copied!";
        setTimeout(() => {
          button.textContent = originalText;
        }, 2000);
      })
      .catch((err) => {
        console.error("Failed to copy:", err);
        querifyService.showError("Failed to copy to clipboard");
      });
  }

  // Public interface
  return {
    init,
    updateSplitButtonState,
    getQueryType: () => queryTypeSelect.value,
  };
}
