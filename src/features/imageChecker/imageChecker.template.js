export const imageCheckerTemplate = `
    <div class="tool-container">
      <h3 id="sectionText">Image Checker</h3>
      <div class="input-container">
        <div>
          <textarea id="batchImagePathsInput" placeholder="Enter image paths (content/v1/...) or UUIDs, one per line"></textarea>
        </div>
        <div class="button-group">
          <button id="checkImageButton">Check Images</button>
          <button id="clearButton">Clear</button>
        </div>
      </div>
      <div id="resultsContainer" class="results-container">
        <!-- Results will be displayed here -->
      </div>
    </div>
`;
