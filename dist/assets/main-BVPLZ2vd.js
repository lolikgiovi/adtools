import{D as c,c as d,p as h}from"./utils-P83EfEoD.js";import"./vendor-ItrcfzAD.js";const p=`
    <div class="tool-container splunk-container">
      <div class="splunk-controls button-group">
        <button id="formatButton">Format</button>
        <button id="minifyButton">Minify</button>
        <button id="copyButton">Copy</button>
        <button id="pasteButton">Paste</button>
        <button id="clearButton">Clear</button>
        <button id="toggleHighlightButton">Highlight</button>
        <button id="removeSpacesButton">Remove Spaces After =</button>
      </div>
      <div class="splunk-content">
        <div id="splunkEditor" class="splunk-content-area"></div>
      </div>
    </div>
  `;class g{formatText(e,t){return t?e.replace(/\s*\n\s*/g,""):e.split("|").map(i=>i.trim()).join(`|
`)}removeSpacesAfterEquals(e){return e.replace(/\s*=\s*/g,"=")}defineSplunkMode(e){e.defineMode("splunk",()=>({token:function(t,i){if(t.match(/^[^=|]+=/))return i.fieldName=t.string.slice(t.start,t.pos-1),i.expectValue=!0,"key";if(i.expectValue){if(t.match(/^\s+/))return i.hasSpaceAfterEquals=!0,"error";if(t.match(/^\$!{date\.convertDate\(/))return i.inVTLFormat=!0,"vtl-format";if(t.match(/^\$!{context\.[^}]+}/))return"context";if(i.inVTLFormat){if(t.match(/^\$!{context\.[^}]+}/))return"vtl-value";if(t.match(/^'[^']+'/))return"vtl-parameter";if(t.match(/^\)/))return i.inVTLFormat=!1,"vtl-format"}if(t.match(/^\$!{[^}]+}/))return i.hasSpaceAfterEquals?"variable-error":"context";if(t.match(/'[^']+'/))return"string";if(t.match(/^[^|]+/))return"hardcoded"}return t.match(/\|/)?(i.expectValue=!1,i.hasSpaceAfterEquals=!1,i.inVTLFormat=!1,"delimiter"):(t.next(),null)},startState:function(){return{expectValue:!1,hasSpaceAfterEquals:!1,fieldName:"",inVTLFormat:!1}}}))}}class m{constructor(e){this.container=e,this.splunkService=new g,this.editor=null,this.highlightingEnabled=!0,this.init()}async init(){await this.initializeUi(),this.bindElements(),await this.loadDependencies()}async initializeUi(){return new Promise(e=>{this.container.innerHTML=p,requestAnimationFrame(()=>{e()})})}bindElements(){this.elements={formatButton:document.getElementById("formatButton"),minifyButton:document.getElementById("minifyButton"),copyButton:document.getElementById("copyButton"),pasteButton:document.getElementById("pasteButton"),clearButton:document.getElementById("clearButton"),toggleHighlightButton:document.getElementById("toggleHighlightButton"),removeSpacesButton:document.getElementById("removeSpacesButton")},this.elements.toggleHighlightButton.textContent="Disable Highlight"}async loadDependencies(){await c.load("codemirror"),this.initializeEditor(),this.setupEventListeners()}initializeEditor(){this.splunkService.defineSplunkMode(CodeMirror),this.editor=CodeMirror(document.getElementById("splunkEditor"),{mode:"splunk",lineNumbers:!0,theme:"default",lineWrapping:!0,styleSelectedText:!0,value:`eventType=[EVENT_NAME]|
description=|
channelCode=EVE|
channelName=EVE|
cifNo= $!{context.cifNo}|
mobilePhone= $!{context.mobilePhone}|
amount=$!{context.amount}|
transactionDate=$!{date.convertDate($!{context.transactionDate},'yyyy-MM-dd HH:mm:ss')}`})}setupEventListeners(){const{formatButton:e,minifyButton:t,copyButton:i,pasteButton:r,clearButton:l,toggleHighlightButton:a,removeSpacesButton:s}=this.elements;e.addEventListener("click",()=>{const n=this.splunkService.formatText(this.editor.getValue(),!1);this.editor.setValue(n)}),t.addEventListener("click",()=>{const n=this.splunkService.formatText(this.editor.getValue(),!0);this.editor.setValue(n)}),i.addEventListener("click",()=>d(this.editor.getValue(),i)),r.addEventListener("click",()=>h(n=>this.editor.setValue(n))),l.addEventListener("click",()=>this.editor.setValue("")),a.addEventListener("click",()=>this.toggleHighlighting()),s.addEventListener("click",()=>{const n=this.editor.getValue(),u=this.splunkService.removeSpacesAfterEquals(n);this.editor.setValue(u)})}toggleHighlighting(){this.highlightingEnabled=!this.highlightingEnabled,this.highlightingEnabled?(this.splunkService.defineSplunkMode(CodeMirror),this.editor.setOption("mode","splunk")):this.editor.setOption("mode",null),this.elements.toggleHighlightButton.textContent=this.highlightingEnabled?"Disable Highlight":"Enable Highlight"}async handlePaste(){try{const e=await navigator.clipboard.readText();this.editor.setValue(e)}catch(e){console.error("Failed to read clipboard contents: ",e)}}}function E(o){return new m(o)}export{E as initSplunkTemplate};
//# sourceMappingURL=main-BVPLZ2vd.js.map
