import App from "./App.js";
import { DependencyLoader } from "./utils/dependencyLoader.js";

document.addEventListener("DOMContentLoaded", async () => {
  await DependencyLoader.loadAll();
  console.log("DOM fully loaded");

  const app = new App();
  app.init();

  // Initialize all functionality
  checkReload();
  disableSwipeBackGesture();
  setupBurgerMenu();
  setupTouchHandling();
});

function setupBurgerMenu() {
  const burgerMenu = document.getElementById("burger-menu");
  const mainNav = document.getElementById("main-nav");

  // Toggle menu on burger click
  burgerMenu.addEventListener("click", () => {
    mainNav.classList.toggle("show");
  });

  // Close menu when a tool is selected
  mainNav.addEventListener("click", (e) => {
    if (e.target.tagName === "BUTTON") {
      mainNav.classList.remove("show");
    }
  });

  // Close menu when clicking outside
  document.addEventListener("click", (e) => {
    if (!mainNav.contains(e.target) && !burgerMenu.contains(e.target)) {
      mainNav.classList.remove("show");
    }
  });
}

function setupTouchHandling() {
  const contentElement = document.getElementById("content");
  contentElement.addEventListener(
    "touchmove",
    function (e) {
      // Allow default behavior for content area
      e.stopPropagation();
    },
    { passive: true }
  );
}

function disableSwipeBackGesture() {
  let startX;
  const threshold = 50; // minimum distance to trigger swipe

  // Handle touchstart
  document.body.addEventListener(
    "touchstart",
    function (e) {
      startX = e.touches[0].clientX;
    },
    { passive: true }
  );

  // Handle touchmove
  document.body.addEventListener(
    "touchmove",
    function (e) {
      if (!startX) {
        return;
      }

      let diffX = startX - e.touches[0].clientX;

      // If it's a horizontal swipe (left or right)
      if (Math.abs(diffX) > threshold) {
        e.preventDefault();
      }
    },
    { passive: false }
  );

  // Handle touchend
  document.body.addEventListener(
    "touchend",
    function () {
      startX = null;
    },
    { passive: true }
  );

  // Disable back/forward swipe gestures
  window.history.pushState(null, null, window.location.href);
  window.onpopstate = function (event) {
    window.history.pushState(null, null, window.location.href);
  };
}

function checkReload() {
  const lastReload = localStorage.getItem("lastReload");
  // lastReload will be deleted if the cookies is deleted
  const now = new Date().getTime();
  const oneDayInMs = 24 * 60 * 60 * 1000;

  if (lastReload) {
    const lastReloadDate = new Date(parseInt(lastReload));
    const nextReloadDate = new Date(parseInt(lastReload) + oneDayInMs);
    console.log(`Last reload: ${lastReloadDate.toLocaleString()}`);
    console.log(`Next reload due: ${nextReloadDate.toLocaleString()}`);
  } else {
    console.log("No previous reload recorded.");
  }

  if (!lastReload || now - lastReload > oneDayInMs) {
    console.log("Performing reload now...");
    localStorage.setItem("lastReload", now.toString());
    window.location.reload(true);
  } else {
    console.log("No reload needed at this time.");
  }
}
