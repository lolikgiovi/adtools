export class ScreenshotService {
    async loadDocxLibrary() {
        return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://unpkg.com/docx@7.1.0/build/index.js";
            script.onload = () => resolve(window.docx);
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    getFormattedDate() {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, "0");
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const year = now.getFullYear();
        return `${day}_${month}_${year}`;
    }

    toUpperCase(str) {
        return str.toUpperCase();
    }

    async generateDocument(inputText) {
        try {
            const docx = await this.loadDocxLibrary();

            const items = inputText
                .split("\n")
                .filter((item) => item.trim() !== "")
                .map((item) => this.toUpperCase(item.trim()));

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
                                size: 32,
                                font: "Calibri",
                                color: "2F5496",
                            },
                            paragraph: {
                                spacing: {
                                    after: 240,
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
                                size: 24,
                                font: "Calibri",
                                color: "2F5496",
                            },
                            paragraph: {
                                spacing: {
                                    after: 0,
                                },
                            },
                        },
                    ],
                    default: {
                        document: {
                            run: {
                                font: "Calibri",
                                size: 20,
                            },
                        },
                    },
                },
            });

            return docx.Packer.toBlob(doc);
        } catch (error) {
            console.error("Error generating document:", error);
            throw new Error("Failed to generate document. Please try again.");
        }
    }
}