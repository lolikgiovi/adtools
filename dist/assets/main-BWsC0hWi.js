import{c}from"./utils-P83EfEoD.js";import"./vendor-ItrcfzAD.js";const m=`
    <div class="tool-container html-preview-formatter-container">
      <div class="editor-preview-container">
        <div class="html-preview-formatter-content">
          <div class="html-preview-formatter-controls button-group">
            <button id="formatButton">Format</button>
            <button id="minifyButton">Minify</button>
            <button id="copyButton">Copy</button>
            <button id="pasteButton">Paste</button>
            <button id="clearButton">Clear</button>
            <button id="toggleWrapButton">Word Wrap</button>
            <button id="toggleHighlightButton">Syntax Highlight</button>
          </div>
          <div id="html-editor" class="html-content-area"></div>
          <div class="dynamic-fields-container">
            <h3 id="sectionText">Dynamic Fields</h3>
            <div id="dynamicFields"></div>
          </div>
        </div>
        <div class="preview-container button-group">
          <div class="iphone-simulator">
            <iframe id="htmlPreview"></iframe>
          </div>
        </div>
      </div>
    </div>
  `;class h{formatHTML(e){return typeof html_beautify>"u"?(console.error("html_beautify is not available. Falling back to basic formatting."),this.basicFormatHTML(e)):html_beautify(e,{indent_size:2,wrap_line_length:0,preserve_newlines:!0,max_preserve_newlines:1,end_with_newline:!1,extra_liners:[]})}async parseVelocity(e,t={}){try{return window.Velocity.render(e,t)}catch(n){return console.error("Error in Velocity parsing:",n),e}}basicFormatHTML(e){return e.replace(/>s+</g,`>
<`).replace(/(<[^/].*?>)/g,`
$1`).split(`
`).filter(t=>t.trim()!=="").map(t=>"  ".repeat(t.match(/^\s*/)[0].length/2)+t.trim()).join(`
`)}minifyHTML(e){return e.replace(/\s+/g," ").replace(/> </g,"><")}replaceVariables(e,t,n){let i=e.replace(/\${baseUrl}/g,t);return n.forEach(o=>{const a=new RegExp(`\\$\\{${o.name}\\}`,"g");i=i.replace(a,o.value)}),i}detectDynamicFields(e){const t=new Set,n=/\$\{([^}]+)\}/g;let i;for(;(i=n.exec(e))!==null;)i[1]!=="baseUrl"&&t.add(i[1]);const o=/\$(!?\{)?([a-zA-Z][a-zA-Z0-9_]*)}?/g;for(;(i=o.exec(e))!==null;){const a=i[2];a!=="baseUrl"&&t.add(a)}return Array.from(t)}reloadImages(e){const t=e.getElementsByTagName("img");for(let n of t){const i=n.src;n.src="about:blank",n.src=i}}}class u{constructor(e){this.container=e,this.htmlService=new h,this.editor=null,this.init()}async init(){await this.initializeUi(),await this.initializeEditor(),this.bindElements(),this.setupEventListeners()}async initializeUi(){return new Promise(e=>{this.container.innerHTML=m,requestAnimationFrame(()=>{e()})})}bindElements(){this.elements={copyButton:document.getElementById("copyButton"),pasteButton:document.getElementById("pasteButton"),toggleWrapButton:document.getElementById("toggleWrapButton"),toggleHighlightButton:document.getElementById("toggleHighlightButton"),baseUrlSelect:document.getElementById("baseUrl"),dynamicFieldsContainer:document.getElementById("dynamicFields"),htmlPreview:document.getElementById("htmlPreview")},this.elements.toggleWrapButton.textContent="Disable Word Wrap",this.elements.toggleHighlightButton.textContent="Disable Syntax Highlight"}initializeEditor(){this.editor=CodeMirror(document.querySelector(".html-content-area"),{mode:"htmlmixed",lineWrapping:!0,lineNumbers:!0,theme:"default",autoCloseTags:!0,autoCloseBrackets:!0,matchBrackets:!0,indentUnit:2,tabSize:2,indentWithTabs:!1,extraKeys:{"Ctrl-Space":"autocomplete"}})}setupEventListeners(){var e,t;this.editor.on("change",()=>{this.detectDynamicFields(),this.updatePreview()}),document.getElementById("formatButton").addEventListener("click",()=>this.formatHTML()),document.getElementById("minifyButton").addEventListener("click",()=>this.minifyHTML()),document.getElementById("copyButton").addEventListener("click",()=>c(this.editor.getValue(),this.elements.copyButton)),document.getElementById("pasteButton").addEventListener("click",()=>this.handlePaste()),document.getElementById("clearButton").addEventListener("click",()=>this.editor.setValue("")),(e=document.getElementById("loadImagesButton"))==null||e.addEventListener("click",()=>this.loadImages()),this.elements.toggleWrapButton.addEventListener("click",()=>this.toggleWordWrap()),this.elements.toggleHighlightButton.addEventListener("click",()=>this.toggleSyntaxHighlight()),(t=this.elements.baseUrlSelect)==null||t.addEventListener("change",()=>this.updatePreview()),this.elements.dynamicFieldsContainer.addEventListener("input",()=>this.updatePreview())}toggleWordWrap(){const e=this.editor.getOption("lineWrapping");this.editor.setOption("lineWrapping",!e),this.elements.toggleWrapButton.textContent=e?"Enable Word Wrap":"Disable Word Wrap"}toggleSyntaxHighlight(){const e=this.editor.getOption("mode")==="htmlmixed";this.editor.setOption("mode",e?null:"htmlmixed"),this.elements.toggleHighlightButton.textContent=e?"Enable Syntax Highlight":"Disable Syntax Highlight"}formatHTML(){const e=this.htmlService.formatHTML(this.editor.getValue());this.editor.setValue(e)}minifyHTML(){const e=this.htmlService.minifyHTML(this.editor.getValue());this.editor.setValue(e)}async updatePreview(){var r,s;const e=this.editor.getValue(),t=Array.from(document.querySelectorAll("#dynamicFields input")),n={};t.forEach(d=>{n[d.name]=d.value});const i=await this.htmlService.parseVelocity(e,n),o=this.htmlService.replaceVariables(i,((r=this.elements.baseUrlSelect)==null?void 0:r.value)||"",t),a=this.elements.htmlPreview.contentDocument;a.open(),a.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <base href="${((s=this.elements.baseUrlSelect)==null?void 0:s.value)||""}/" target="_blank">
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <style>
            body { 
              margin: 0;
              padding: 0;
              width: 100%;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
              overflow-x: hidden;
            }
            img {
              max-width: 100%;
              height: auto;
            }
            table {
              width: 100% !important;
              height: auto !important;
            }
            td {
              word-break: break-word;
            }
          </style>
        </head>
        <body>
          ${o}
        </body>
      </html>
    `),a.close()}detectDynamicFields(){const e=this.editor.getValue(),t=this.htmlService.detectDynamicFields(e);this.elements.dynamicFieldsContainer.innerHTML="",t.forEach(n=>{const i=document.createElement("input");i.type="text",i.name=n,i.placeholder=n,i.value=n,this.elements.dynamicFieldsContainer.appendChild(i)})}loadImages(){const e=this.elements.htmlPreview.contentDocument||this.elements.htmlPreview.contentWindow.document;this.htmlService.reloadImages(e)}async handlePaste(){try{const e=await navigator.clipboard.readText();this.editor.setValue(e)}catch(e){console.error("Failed to read clipboard contents: ",e)}}}function y(l){return new u(l)}export{y as initHtmlTemplate};
//# sourceMappingURL=main-BWsC0hWi.js.map
