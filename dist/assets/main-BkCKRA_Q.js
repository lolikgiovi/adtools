import{D as o,c as u}from"./utils-P83EfEoD.js";import"./vendor-ItrcfzAD.js";const r=`
    <div class="tool-container">
      <h3 id="sectionText">Values</h3>
      <textarea id="inputValues" placeholder="Enter values of the field, one per line">notification_template_id_1
notification_template_id_2
notification_template_id_3
notification_template_id_4</textarea>
      <div class="button-group">
        <div class="input-group">
          <label for="schemaName">Schema Name</label>
          <input type="text" id="schemaName" placeholder="Schema Name" value="notification">
        </div>
        <div class="input-group">
          <label for="tableName">Table Name</label>
          <input type="text" id="tableName" placeholder="Table Name" value="notification_template">
        </div>
        <div class="input-group">
          <label for="fieldName">Field Name</label>
          <input type="text" id="fieldName" placeholder="Field Name" value="notification_template_id">
        </div>
      </div>
      <div class="button-group">
        <button id="generateButton">Generate</button>
        <button id="clearButton">Clear</button>
        <button id="pasteButton">Paste</button>
      </div>
    </div>
    <div class="tool-container">
      <h3 id="sectionText">Generated Query</h3>
      <div id="outputQueryEditor" class="queryin-content-area"></div>
      <div class="button-group">
        <button id="copyButton">Copy</button>
        <button id="clearResultButton">Clear</button>
      </div>
    </div>
`;class d{generateQuery(e,t,a,l){const s=e.split(`
`).filter(n=>n.trim()!=="").map(n=>`    '${n.trim()}'`).join(`,
`);return`SELECT *
FROM ${t}.${a}
WHERE ${l} IN (
${s});`}}class c{constructor(e){this.container=e,this.queryInService=new d,this.outputQueryEditor=null,this.init()}async init(){await this.initializeUi(),this.bindElements(),this.setupEventListeners(),await this.loadDependencies()}async initializeUi(){return new Promise(e=>{this.container.innerHTML=r,requestAnimationFrame(()=>{e()})})}async loadDependencies(){await o.load("codemirror"),this.initializeEditor()}bindElements(){this.elements={inputValues:document.getElementById("inputValues"),generateButton:document.getElementById("generateButton"),clearButton:document.getElementById("clearButton"),pasteButton:document.getElementById("pasteButton"),copyButton:document.getElementById("copyButton"),clearResultButton:document.getElementById("clearResultButton"),schemaName:document.getElementById("schemaName"),tableName:document.getElementById("tableName"),fieldName:document.getElementById("fieldName")}}setupEventListeners(){this.elements.generateButton.addEventListener("click",()=>this.updateCodeMirror()),this.elements.clearButton.addEventListener("click",()=>this.handleClear()),this.elements.clearResultButton.addEventListener("click",()=>this.handleClearResult()),this.elements.pasteButton.addEventListener("click",()=>this.handlePaste()),this.elements.copyButton.addEventListener("click",()=>this.handleCopy()),[this.elements.inputValues,this.elements.schemaName,this.elements.tableName,this.elements.fieldName].forEach(e=>{e.addEventListener("input",()=>this.updateCodeMirror())}),this.adjustInputWidth()}initializeEditor(){this.outputQueryEditor=CodeMirror(document.getElementById("outputQueryEditor"),{mode:"sql",lineNumbers:!0,readOnly:!0}),this.updateCodeMirror()}updateCodeMirror(){if(!this.outputQueryEditor)return;const e=this.queryInService.generateQuery(this.elements.inputValues.value,this.elements.schemaName.value,this.elements.tableName.value,this.elements.fieldName.value);this.outputQueryEditor.setValue(e),this.outputQueryEditor.refresh()}handleClear(){this.elements.inputValues.value="",this.elements.fieldName.value="",this.elements.tableName.value="",this.elements.schemaName.value="",this.updateCodeMirror()}handleClearResult(){this.outputQueryEditor.setValue("")}async handlePaste(){try{const e=await navigator.clipboard.readText();this.elements.inputValues.value=e,this.updateCodeMirror()}catch(e){console.error("Failed to read clipboard contents: ",e)}}handleCopy(){u(this.outputQueryEditor.getValue(),this.elements.copyButton)}adjustInputWidth(){document.querySelectorAll('.input-group input[type="text"]').forEach(t=>{t.addEventListener("input",function(){this.style.width="auto",this.style.width=this.scrollWidth+5+"px"}),t.dispatchEvent(new Event("input"))})}}function y(i){return new c(i)}export{y as initQueryInGenerator};
//# sourceMappingURL=main-BkCKRA_Q.js.map
