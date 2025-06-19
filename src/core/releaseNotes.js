export class ReleaseNotes {
  constructor() {}

  async getLatestReleaseNotes() {
    try {
      const response = await fetch("/src/release-notes/2025-06-19_add_image_checker.md");
      const releaseNotes = await response.text();

      return releaseNotes;
    } catch (error) {
      console.error("Error reading release notes:", error);
      return null;
    }
  }
}
