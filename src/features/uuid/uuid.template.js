export const uuidTemplate = `
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
        `;