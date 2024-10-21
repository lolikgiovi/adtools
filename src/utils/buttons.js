export function copyToClipboard(text, button) {
  navigator.clipboard.writeText(text).then(() => {
    const originalText = button.textContent;
    button.textContent = "Copied!";
    button.style.backgroundColor = "green";
    setTimeout(() => {
      button.textContent = originalText;
      button.style.backgroundColor = "";
    }, 500);
  });
}

export async function pasteFromClipboard(textField) {
  try {
    const text = await navigator.clipboard.readText();
    textField.value = text;
  } catch (err) {
    console.error("Failed to read clipboard contents: ", err);
  }
}
