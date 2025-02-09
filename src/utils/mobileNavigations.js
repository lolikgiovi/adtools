export class MobileNavigation {
  constructor() {
    this.burgerMenu = document.getElementById("burger-menu");
    this.mainNav = document.getElementById("main-nav");
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.burgerMenu?.addEventListener("click", () => this.toggleMenu());
    this.mainNav?.addEventListener("click", this.handleNavClick.bind(this));
    document.addEventListener("click", this.handleOutsideClick.bind(this));
  }

  handleNavClick(e) {
    if (e.target.tagName === "BUTTON") {
      this.hideMenu();
    }
  }

  handleOutsideClick(e) {
    if (!this.mainNav?.contains(e.target) && !this.burgerMenu?.contains(e.target)) {
      this.hideMenu();
    }
  }

  toggleMenu() {
    this.mainNav?.classList.toggle("show");
  }

  hideMenu() {
    this.mainNav?.classList.remove("show");
  }
}
