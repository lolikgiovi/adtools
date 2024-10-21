export function initCodeMirror() {
  return new Promise((resolve, reject) => {
    if (window.CodeMirror) {
      loadAdditionalResources()
        .then(() => resolve(window.CodeMirror))
        .catch(reject);
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/codemirror.min.js";
    script.onload = () => {
      const cssLink = document.createElement("link");
      cssLink.rel = "stylesheet";
      cssLink.href =
        "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/codemirror.min.css";
      document.head.appendChild(cssLink);

      loadAdditionalResources()
        .then(() => resolve(window.CodeMirror))
        .catch(reject);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function loadAdditionalResources() {
  const resources = [
    // SQL mode (existing)
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/mode/sql/sql.min.js",
    // HTML mixed mode and its dependencies
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/mode/xml/xml.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/mode/javascript/javascript.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/mode/css/css.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/mode/htmlmixed/htmlmixed.min.js",
    // Addons for HTML editing
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/addon/edit/closetag.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/addon/edit/closebrackets.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/addon/hint/show-hint.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/addon/hint/html-hint.min.js",
    // JSON
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/mode/javascript/javascript.min.js",
  ];

  return Promise.all(resources.map(loadScript));
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export function createCodeMirrorInstance(element, options = {}) {
  const defaultOptions = {
    lineNumbers: true,
    theme: "default",
    mode: "text/x-sql", // Default to SQL mode for backwards compatibility
    readOnly: false,
  };

  const mergedOptions = { ...defaultOptions, ...options };

  // If HTML mode is requested, set some additional options
  if (mergedOptions.mode === "htmlmixed") {
    mergedOptions.autoCloseTags = true;
    mergedOptions.autoCloseBrackets = true;
    mergedOptions.extraKeys = { "Ctrl-Space": "autocomplete" };
  }

  return CodeMirror.fromTextArea(element, mergedOptions);
}
