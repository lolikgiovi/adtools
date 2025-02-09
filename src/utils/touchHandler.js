export class TouchHandler {
  static SWIPE_THRESHOLD = 50;

  constructor() {
    this.startX = null;
    this.setupTouchHandling();
    this.disableSwipeBackGesture();
  }

  setupTouchHandling() {
    const contentElement = document.getElementById("content");
    contentElement?.addEventListener("touchmove", (e) => e.stopPropagation(), { passive: true });
  }

  disableSwipeBackGesture() {
    document.body.addEventListener("touchstart", this.handleTouchStart.bind(this), { passive: true });
    document.body.addEventListener("touchmove", this.handleTouchMove.bind(this), { passive: false });
    document.body.addEventListener("touchend", this.handleTouchEnd.bind(this), { passive: true });
    this.preventBrowserBackNavigation();
  }

  handleTouchStart(e) {
    this.startX = e.touches[0].clientX;
  }

  handleTouchMove(e) {
    if (!this.startX) return;

    const diffX = this.startX - e.touches[0].clientX;
    if (Math.abs(diffX) > TouchHandler.SWIPE_THRESHOLD) {
      e.preventDefault();
    }
  }

  handleTouchEnd() {
    this.startX = null;
  }

  preventBrowserBackNavigation() {
    window.history.pushState(null, null, window.location.href);
    window.onpopstate = () => {
      window.history.pushState(null, null, window.location.href);
    };
  }
}
