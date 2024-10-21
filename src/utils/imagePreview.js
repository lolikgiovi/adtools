export async function createImagePreview(file, isBase64 = false) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const container = document.createElement("div");
        container.style.display = "inline-block";
        container.style.alignItems = "baseline";
        container.style.marginTop = "20px";
        container.style.marginRight = "20px";
        container.style.textAlign = "center";

        img.style.maxWidth = `${200}px`;
        img.style.maxHeight = `${200}px`;
        img.style.border = "1px solid black";
        container.appendChild(img);

        const nameLabel = document.createElement("p");
        nameLabel.textContent = file.name;
        nameLabel.style.margin = "5px 0";
        container.appendChild(nameLabel);

        const dimensionLabel = document.createElement("p");
        dimensionLabel.textContent = `${img.naturalWidth} x ${img.naturalHeight} pixels`;
        dimensionLabel.style.margin = "0";
        dimensionLabel.style.fontSize = "0.8em";
        container.appendChild(dimensionLabel);

        const downloadButton = document.createElement("button");
        downloadButton.textContent = isBase64
          ? "Download Image"
          : "Download Base64";
        downloadButton.classList.add("download-button");
        downloadButton.addEventListener("click", async () => {
          if (isBase64) {
            const response = await fetch(img.src);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = file.name.replace(".txt", ".png");
            link.click();
          } else {
            const base64 = img.src.split(",")[1]; // Extract base64 data
            const fileExtension = file.name.split(".").pop().toLowerCase();
            const fullBase64 = `data:image/${fileExtension};base64,${base64}`; // Use file extension in MIME type
            const blob = new Blob([fullBase64], {
              type: "text/plain;charset=utf-8",
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = file.name.replace(/\.[^/.]+$/, "") + ".txt";
            link.click();
          }
        });
        container.appendChild(downloadButton);

        resolve(container);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
