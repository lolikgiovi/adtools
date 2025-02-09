export class ReloadManager {
  static ONE_DAY_MS = 24 * 60 * 60 * 1000;

  checkReload() {
    const lastReload = localStorage.getItem("lastReload");
    const now = new Date().getTime();

    if (lastReload) {
      this.logReloadTimes(lastReload);
    } else {
      console.log("No previous reload recorded.");
    }

    if (this.shouldReload(lastReload, now)) {
      this.performReload(now);
    } else {
      console.log("No reload needed at this time.");
    }
  }

  shouldReload(lastReload, now) {
    return !lastReload || now - lastReload > ReloadManager.ONE_DAY_MS;
  }

  performReload(now) {
    console.log("Performing reload now...");
    localStorage.setItem("lastReload", now.toString());
    window.location.reload(true);
  }

  logReloadTimes(lastReload) {
    const lastReloadDate = new Date(parseInt(lastReload));
    const nextReloadDate = new Date(parseInt(lastReload) + ReloadManager.ONE_DAY_MS);

    console.log(`Last reload: ${lastReloadDate.toLocaleString()}`);
    console.log(`Next reload due: ${nextReloadDate.toLocaleString()}`);
  }
}
