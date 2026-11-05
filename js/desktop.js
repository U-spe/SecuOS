
(() => {
  "use strict";

  const desktop = document.getElementById("desktop");

  function closePanels() {
    document.querySelectorAll(".floating-panel.open").forEach(panel => {
      panel.classList.remove("open");
    });
  }

  function showDesktop() {
    const windows = document.querySelectorAll(".system-window");

    windows.forEach(win => {
      if (!win.hidden) {
        win.dataset.wasVisible = "true";
        win.hidden = true;
      }
    });

    closePanels();
  }

  function restoreWindows() {
    document.querySelectorAll('.system-window[data-was-visible="true"]').forEach(win => {
      win.hidden = false;
      delete win.dataset.wasVisible;
    });
  }

  document.querySelector(".show-desktop-button")?.addEventListener("click", showDesktop);

  desktop?.addEventListener("dblclick", event => {
    if (event.target.closest(".desktop-icon, .system-window, .floating-panel")) return;
    restoreWindows();
  });

  document.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();

    if (event.key === "Escape") {
      closePanels();
    }

    // Ctrl + Alt + S opens SecuOS settings.
    if (event.ctrlKey && event.altKey && key === "s") {
      event.preventDefault();
      window.openSecuSettings?.();
    }

    // Escape closes the active system window.
    if (event.altKey && key === "f4") {
      const active = window.SecuWindowManager?.getActiveWindow();

      if (active) {
        event.preventDefault();
        window.SecuWindowManager.closeWindow(active);
      }
    }

    // Windows key / Meta key toggles the launcher for the active OS.
    if (event.key === "Meta" && !event.repeat) {
      const os = document.documentElement.dataset.os;

      if (os === "windows") {
        document.getElementById("startMenu")?.classList.toggle("open");
      } else if (os === "chrome") {
        document.getElementById("chromeLauncher")?.classList.toggle("open");
      } else if (os === "macos") {
        document.getElementById("appleMenu")?.classList.toggle("open");
      }
    }
  });

  document.addEventListener("click", event => {
    const isPanel = event.target.closest(".floating-panel");
    const isTray = event.target.closest(
      "#windowsTrayButton, #macControlButton, #chromeStatusButton"
    );

    if (!isPanel && !isTray) {
      // Panels are closed by their own toggle controls.
    }
  });

  window.SecuDesktop = window.SecuDesktop || {};

  window.SecuDesktop.showDesktop = showDesktop;
  window.SecuDesktop.restoreWindows = restoreWindows;
  window.SecuDesktop.closePanels = closePanels;

  document.body.classList.add("secuos-ready");

  console.info("SecuOS desktop initialized.");
})();
