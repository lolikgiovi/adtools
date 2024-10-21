import { copyToClipboard, pasteFromClipboard } from "../utils/buttons.js";

export function initScreenshotTemplate(container) {
  const html = `
    <div class="tool-container">
      <h3 id="sectionText">Generate Documentation Template for Config Deployment</h3>
      <textarea id="inputList" placeholder="Enter table name, one table per line"></textarea>
      <div class="button-group">
        <button id="generateButton">Generate Document</button>
        <button id="clearButton">Clear</button>
        <button id="pasteButton">Paste</button>
      </div>
    </div>
  `;
  container.innerHTML = html;

  const inputList = document.getElementById("inputList");
  const generateButton = document.getElementById("generateButton");
  const clearButton = document.getElementById("clearButton");
  const pasteButton = document.getElementById("pasteButton");

  function adjustTextareaHeight(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  }

  async function loadDocxLibrary() {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/docx@7.1.0/build/index.js";
      script.onload = () => resolve(window.docx);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function getFormattedDate() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
    const year = now.getFullYear();
    return `${day}_${month}_${year}`;
  }

  function toUpperCase(str) {
    return str.toUpperCase();
  }

  async function generateDocument() {
    try {
      const docx = await loadDocxLibrary();

      const items = inputList.value
        .split("\n")
        .filter((item) => item.trim() !== "")
        .map((item) => toUpperCase(item.trim()));

      const doc = new docx.Document({
        sections: [
          {
            properties: {},
            children: [
              new docx.Paragraph({
                text: `Deployment (Config) - ${new Date().toLocaleDateString(
                  "en-US",
                  { day: "numeric", month: "long", year: "numeric" }
                )}`,
                heading: docx.HeadingLevel.HEADING_1,
              }),
              ...items.flatMap((item) => [
                new docx.Paragraph({
                  text: item,
                  heading: docx.HeadingLevel.HEADING_2,
                }),
                new docx.Paragraph("Before"),
                new docx.Paragraph(""),
                new docx.Paragraph(""),
                new docx.Paragraph("Execution"),
                new docx.Paragraph(""),
                new docx.Paragraph(""),
                new docx.Paragraph("Commit"),
                new docx.Paragraph(""),
                new docx.Paragraph(""),
                new docx.Paragraph(""),
              ]),
            ],
          },
        ],
        styles: {
          paragraphStyles: [
            {
              id: "Heading1",
              name: "Heading 1",
              basedOn: "Normal",
              next: "Normal",
              quickFormat: true,
              run: {
                size: 32, // 16 pt
                font: "Calibri",
                color: "2F5496", // Word's default blue color
              },
              paragraph: {
                spacing: {
                  after: 240, // 12 pt spacing after H1
                },
              },
            },
            {
              id: "Heading2",
              name: "Heading 2",
              basedOn: "Normal",
              next: "Normal",
              quickFormat: true,
              run: {
                size: 24, // 12 pt
                font: "Calibri",
                color: "2F5496", // Word's default blue color
              },
              paragraph: {
                spacing: {
                  after: 0, // No spacing after H2
                },
              },
            },
          ],
          default: {
            document: {
              run: {
                font: "Calibri",
                size: 20, // 10 pt
              },
            },
          },
        },
      });

      docx.Packer.toBlob(doc).then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `deploy_config_${getFormattedDate()}.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      });
    } catch (error) {
      console.error("Error generating document:", error);
      alert("Failed to generate document. Please try again.");
    }
  }

  generateButton.addEventListener("click", generateDocument);

  clearButton.addEventListener("click", () => {
    inputList.value = "";
    adjustTextareaHeight(inputList);
  });

  pasteButton.addEventListener("click", async () => {
    await pasteFromClipboard(inputList);
    adjustTextareaHeight(inputList);
  });

  inputList.addEventListener("input", () => adjustTextareaHeight(inputList));

  // Initial actions
  adjustTextareaHeight(inputList);
}
