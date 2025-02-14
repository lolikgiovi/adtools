import{c as i}from"./utils-P83EfEoD.js";import"./vendor-ItrcfzAD.js";const u=`
        <div class="tool-container">
        <div id="uuidSingle" class="uuid-section">
            <h3 id="sectionText">Single UUID</h3>
            <p id="uuidOutputSingle" class="uuidText"></p>
            <div class="button-group">
                <button id="generateSingle">Generate</button>
                <button id="copySingle">Copy</button>
            </div>
        </div>
        </div>

        <div class="tool-container">
        <div id="uuidMultiple" class="uuid-section">
            <h3 id="sectionText">Multiple UUIDs</h3>
            <div class="button-group">
                <input type="number" id="uuidCount" min="1" max="1000" placeholder="How many?">
                <button id="generateMultiple">Generate</button>
                <button id="copyMultiple">Copy</button>
                <button id="clearButton">Clear</button>
            </div>
            <pre id="uuidOutputMultiple" class="uuidText"></pre>
        </div>
        </div>   
        `;class l{generateSingleUuid(){return crypto.randomUUID()}generateMultipleUuids(e){if(e<1||e>2e3||e===0||e===NaN)throw new Error("Count must be between 1 and 2000");return Array.from({length:e},()=>crypto.randomUUID()).join(`
`)}}class s{constructor(e){this.container=e,this.uuidService=new l,this.init()}async init(){await this.initializeUi(),this.bindElements(),this.setupEventListeners(),this.setupInitialState(),this.generateSingleUUID()}async initializeUi(){return new Promise(e=>{this.container.innerHTML=u,requestAnimationFrame(()=>{e()})})}bindElements(){this.elements={uuidOutputSingle:document.getElementById("uuidOutputSingle"),uuidOutputMultiple:document.getElementById("uuidOutputMultiple"),generateSingleBtn:document.getElementById("generateSingle"),generateMultipleBtn:document.getElementById("generateMultiple"),copySingleBtn:document.getElementById("copySingle"),copyMultipleBtn:document.getElementById("copyMultiple"),uuidCountInput:document.getElementById("uuidCount"),clearButton:document.getElementById("clearButton")}}setupEventListeners(){this.elements.generateSingleBtn.addEventListener("click",()=>this.generateSingleUUID()),this.elements.generateMultipleBtn.addEventListener("click",()=>this.generateMultipleUUIDs()),this.elements.copySingleBtn.addEventListener("click",()=>i(this.elements.uuidOutputSingle.textContent,this.elements.copySingleBtn)),this.elements.copyMultipleBtn.addEventListener("click",()=>i(this.elements.uuidOutputMultiple.textContent,this.elements.copyMultipleBtn)),this.elements.uuidCountInput.addEventListener("input",()=>this.handleCountInput()),this.elements.uuidCountInput.addEventListener("keydown",e=>{e.key==="Enter"&&(this.generateMultipleUUIDs(),i(this.elements.uuidOutputMultiple.textContent,this.elements.copyMultipleBtn))}),this.elements.clearButton.addEventListener("click",()=>this.handleClear())}setupInitialState(){this.elements.uuidOutputSingle.textContent="",this.elements.uuidOutputMultiple.textContent="",this.elements.uuidCountInput.value="",this.elements.copyMultipleBtn.disabled=!0}generateSingleUUID(){this.elements.uuidOutputSingle.textContent=this.uuidService.generateSingleUuid()}generateMultipleUUIDs(){const e=parseInt(this.elements.uuidCountInput.value);if(isNaN(e)||e<=0){alert("Please enter a valid positive number");return}try{const n=this.uuidService.generateMultipleUuids(e);this.elements.uuidOutputMultiple.textContent=n,this.elements.copyMultipleBtn.disabled=!1}catch(n){alert(n.message)}}handleCountInput(){console.log("11111"),this.elements.uuidCountInput.value.trim()===""?(this.elements.copyMultipleBtn.disabled=!0,console.log("22222")):(this.elements.copyMultipleBtn.disabled=!1,console.log("33333"))}handleClear(){this.elements.uuidCountInput.value="",this.elements.uuidOutputMultiple.textContent="",this.elements.copyMultipleBtn.disabled=!0}}function r(t){return new s(t)}export{r as initUuidGenerator};
//# sourceMappingURL=main-nz8dYveN.js.map
