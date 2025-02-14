export class ReloadManager {
  static ONE_DAY_MS = 24 * 60 * 60 * 1000;

  checkReload() {
    const lastReload = localStorage.getItem("lastReload");
    const now = new Date().getTime();

    if (this.shouldReload(lastReload, now)) {
      this.performReload(now);
    } else {
    }
  }

  shouldReload(lastReload, now) {
    return !lastReload || now - lastReload > ReloadManager.ONE_DAY_MS;
  }

  performReload(now) {
    localStorage.setItem("lastReload", now.toString());
    window.location.reload(true);
  }
}
