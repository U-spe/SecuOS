
(() => {
  "use strict";

  const startMenu = document.getElementById("startMenu");
  const appleMenu = document.getElementById("appleMenu");
  const launcher = document.getElementById("chromeLauncher");

  const menus = [startMenu, appleMenu, launcher];

  function closeMenus() {
    menus.forEach(menu => menu?.classList.remove("open"));
  }

  function toggleMenu(menu) {
    if (!menu) return;
    const wasOpen = menu.classList.contains("open");
    closeMenus();
    if (!wasOpen) menu.classList.add("open");
  }

  document.getElementById("startButton")?.addEventListener("click", () => {
    toggleMenu(startMenu);
  });

  document.getElementById("appleMenuButton")?.addEventListener("click", () => {
    toggleMenu(appleMenu);
  });

  document.getElementById("launcherButton")?.addEventListener("click", () => {
    toggleMenu(launcher);
  });

  document.addEventListener("click", event => {
    if (
      !event.target.closest("#startMenu") &&
      !event.target.closest("#startButton") &&
      !event.target.closest("#appleMenu") &&
      !event.target.closest("#appleMenuButton") &&
      !event.target.closest("#chromeLauncher") &&
      !event.target.closest("#launcherButton")
    ) {
      closeMenus();
    }
  });

  document.getElementById("powerButton")?.addEventListener("click", () => {
    document.getElementById("powerMenu")?.classList.toggle("open");
  });

  document.querySelectorAll(".start-search input, .launcher-search input").forEach(input => {
    input.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        input.value = "";
        closeMenus();
      }
    });
  });

  window.SecuMenus = { closeMenus, toggleMenu };
})();
