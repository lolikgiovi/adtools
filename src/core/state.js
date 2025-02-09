export class AppState {
  constructor() {
    this.currentTool = null;
    this.codeMirror = null;
    this.loadedCssFiles = new Set();
    this.subscribers = new Set();
    this.error = null;
    this.isLoading = false;
  }

  setState(updates) {
    const previousState = { ...this };
    Object.assign(this, updates);
    this.notifySubscribers(previousState);
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notifySubscribers(previousState) {
    this.subscribers.forEach((callback) => callback(this, previousState));
  }

  getState() {
    return {
      currentTool: this.currentTool,
      codeMirror: this.codeMirror,
      loadedCssFiles: [...this.loadedCssFiles],
      error: this.error,
      isLoading: this.isLoading,
    };
  }
}
