export class SplunkService {
  formatText(text, shouldMinify) {
    if (shouldMinify) {
      return text.replace(/\s*\n\s*/g, "");
    } else {
      return text
        .split("|").map((part) => part.trim())
        .join("|\n");
    }
  }

  removeSpacesAfterEquals(text) {
    return text.replace(/\s*=\s*/g, "=");
  }

  defineSplunkMode(CodeMirror) {
    CodeMirror.defineMode("splunk", () => ({
      token: function (stream, state) {
        if (stream.match(/^[^=|]+=/)) {
          state.fieldName = stream.string.slice(stream.start, stream.pos - 1);
          state.expectValue = true;
          return "key";
        }
        if (state.expectValue) {
          if (stream.match(/^\s+/)) {
            state.hasSpaceAfterEquals = true;
            return "error";
          }
          if (stream.match(/^\$!{date\.convertDate\(/)) {
            state.inVTLFormat = true;
            return "vtl-format";
          }
          if (stream.match(/^\$!{context\.[^}]+}/)) {
            return "context";
          }
          if (state.inVTLFormat) {
            if (stream.match(/^\$!{context\.[^}]+}/)) {
              return "vtl-value";
            }
            if (stream.match(/^'[^']+'/)) {
              return "vtl-parameter";
            }
            if (stream.match(/^\)/)) {
              state.inVTLFormat = false;
              return "vtl-format";
            }
          }
          if (stream.match(/^\$!{[^}]+}/)) {
            return state.hasSpaceAfterEquals ? "variable-error" : "context";
          }
          if (stream.match(/'[^']+'/)) {
            return "string";
          }
          if (stream.match(/^[^|]+/)) {
            return "hardcoded";
          }
        }
        if (stream.match(/\|/)) {
          state.expectValue = false;
          state.hasSpaceAfterEquals = false;
          state.inVTLFormat = false;
          return "delimiter";
        }
        stream.next();
        return null;
      },
      startState: function () {
        return {
          expectValue: false,
          hasSpaceAfterEquals: false,
          fieldName: "",
          inVTLFormat: false,
        };
      },
    }));
  }
}