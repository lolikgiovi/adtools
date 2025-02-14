export class BaseUrlService {
  constructor() {
    this.storageKey = "html_base_urls";
  }

  getAllUrls() {
    const urls = localStorage.getItem(this.storageKey);
    return urls ? JSON.parse(urls) : [];
  }

  addUrl(name, url) {
    const urls = this.getAllUrls();
    if (!urls.find((item) => item.name === name || item.url === url)) {
      urls.push({ name, url });
      localStorage.setItem(this.storageKey, JSON.stringify(urls));
      return true;
    }
    return false;
  }

  removeUrl(name) {
    const urls = this.getAllUrls();
    const filteredUrls = urls.filter((item) => item.name !== name);
    localStorage.setItem(this.storageKey, JSON.stringify(filteredUrls));
  }

  clearUrls() {
    localStorage.removeItem(this.storageKey);
    return true;
  }
}
