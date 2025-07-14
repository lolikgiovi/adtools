export class ReleaseNotes {
  constructor() {}

  async getLatestReleaseNotes() {
    try {
      const response = await fetch("/src/release-notes/2025-07-13_quickquery_enhancements.md");
      const releaseNotes = await response.text();

      return releaseNotes;
    } catch (error) {
      console.error("Error reading release notes:", error);
      return null;
    }
  }
}
