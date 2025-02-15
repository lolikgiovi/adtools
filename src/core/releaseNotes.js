export class ReleaseNotes {
  constructor() {}

  async getLatestReleaseNotes() {
    try {
      const response = await fetch("src/release-notes/2025-02-14_fix_query_and_html.md");
      const releaseNotes = await response.text();

      return releaseNotes;
    } catch (error) {
      console.error("Error reading release notes:", error);
      return null;
    }
  }
}
