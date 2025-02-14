export class HtmlService {
  formatHTML(content) {
    if (typeof html_beautify === "undefined") {
      console.error("html_beautify is not available. Falling back to basic formatting.");
      return this.basicFormatHTML(content);
    }
    return html_beautify(content, {
      indent_size: 2,
      wrap_line_length: 0,
      preserve_newlines: true,
      max_preserve_newlines: 1,
      end_with_newline: false,
      extra_liners: [],
    });
  }

  async parseVelocity(content, context = {}) {
    try {
      return window.Velocity.render(content, context);
    } catch (error) {
      console.error("Error in Velocity parsing:", error);
      return content;
    }
  }

  basicFormatHTML(content) {
    return content
      .replace(/>s+</g, ">\n<")
      .replace(/(<[^/].*?>)/g, "\n$1")
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => "  ".repeat(line.match(/^\s*/)[0].length / 2) + line.trim())
      .join("\n");
  }

  minifyHTML(content) {
    return content.replace(/\s+/g, " ").replace(/> </g, "><");
  }

  replaceVariables(content, baseUrl, dynamicFields) {
    let replaced = content.replace(/\${baseUrl}/g, baseUrl);
    dynamicFields.forEach((input) => {
      const regex = new RegExp(`\\$\\{${input.name}\\}`, "g");
      replaced = replaced.replace(regex, input.value);
    });
    return replaced;
  }

  detectDynamicFields(content) {
    const fields = new Set();

    // Detect ${variable} syntax
    const dollarRegex = /\$\{([^}]+)\}/g;
    let match;
    while ((match = dollarRegex.exec(content)) !== null) {
      if (match[1] !== "baseUrl") {
        fields.add(match[1]);
      }
    }

    // // Detect Velocity $variable syntax
    // const velocityRegex = /\$(!?\{)?([a-zA-Z][a-zA-Z0-9_]*)}?/g;
    // while ((match = velocityRegex.exec(content)) !== null) {
    //   const varName = match[2];
    //   if (varName !== "baseUrl") {
    //     fields.add(varName);
    //   }
    // }

    return Array.from(fields);
  }

  reloadImages(iframeDocument) {
    const images = iframeDocument.getElementsByTagName("img");
    for (let img of images) {
      const currentSrc = img.src;
      img.src = "about:blank";
      img.src = currentSrc;
    }
  }
}
