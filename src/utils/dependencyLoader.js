// dependencyLoader.js
export class DependencyLoader {
  static dependencies = {
    jszip: {
      resources: ["https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js"],
    },
    codemirror: {
      core: "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/codemirror.min.js",
      resources: [
        // Core CSS
        "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/codemirror.min.css",
        "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/theme/elegant.min.css",
        "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/theme/material.min.css",
        // Modes
        "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/mode/sql/sql.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/mode/xml/xml.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/mode/javascript/javascript.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/mode/css/css.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/mode/htmlmixed/htmlmixed.min.js",
        // Addons
        "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/addon/edit/closetag.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/addon/edit/closebrackets.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/addon/hint/show-hint.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/addon/hint/html-hint.min.js",
      ],
    },
    handsontable: {
      resources: [
        "https://cdn.jsdelivr.net/npm/handsontable/dist/handsontable.full.min.js",
        "https://cdn.jsdelivr.net/npm/handsontable/dist/handsontable.full.min.css",
      ],
    },
    beautifier: {
      resources: [
        "https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.14.9/beautify.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.14.9/beautify-html.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.14.9/beautify-css.min.js",
      ],
    },
  };

  static loaded = new Set();

  static loadResource(url) {
    return new Promise((resolve, reject) => {
      const isCSS = url.endsWith(".css");
      const element = isCSS
        ? Object.assign(document.createElement("link"), {
            rel: "stylesheet",
            href: url,
          })
        : Object.assign(document.createElement("script"), {
            src: url,
          });

      element.onload = resolve;
      element.onerror = () => reject(new Error(`Failed to load ${url}`));
      document.head.appendChild(element);
    });
  }

  static async load(dependencyName) {
    if (this.loaded.has(dependencyName)) {
      console.log(`Dependency '${dependencyName}' has already been loaded, skipping...`);
      return;
    }

    const dependency = this.dependencies[dependencyName];
    if (!dependency) {
      throw new Error(`Unknown dependency: ${dependencyName}`);
    }

    try {
      // If there's a core file, load it first
      if (dependency.core) {
        await this.loadResource(dependency.core);
      }

      // Then load all additional resources in parallel
      if (dependency.resources) {
        await Promise.all(dependency.resources.map((url) => this.loadResource(url)));
      }

      this.loaded.add(dependencyName);
      console.log(`Successfully loaded all files for dependency '${dependencyName}'`);
    } catch (error) {
      console.error(`Error loading ${dependencyName}:`, error);
      throw error;
    }
  }

  static async loadAll() {
    const deps = Object.keys(this.dependencies);
    await Promise.all(deps.map((dep) => this.load(dep)));
    console.log("All dependencies loaded");
  }

  // CodeMirror specific methods
  static createCodeMirrorInstance(element, options = {}) {
    if (!window.CodeMirror) {
      throw new Error('CodeMirror is not loaded. Please load it first using DependencyLoader.load("codemirror")');
    }

    const defaultOptions = {
      lineNumbers: true,
      theme: "default",
      mode: "text/x-sql", // Default to SQL mode
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
}

// Example usage:
// 1. Load CodeMirror and all its dependencies
// await DependencyLoader.load('codemirror');

// 2. Create a CodeMirror instance
// const editor = DependencyLoader.createCodeMirrorInstance(textareaElement, {
//   mode: 'htmlmixed',
//   theme: 'material'
// });
