
(() => {
  "use strict";

  let highestZ = 40;
  let activeWindow = null;

  const settingsWindow = document.getElementById("settingsWindow");

  function focusWindow(win) {
    if (!win) return;
    highestZ++;
    win.style.zIndex = highestZ;
    activeWindow = win;
  }

  function openWindow(id) {
    const win = document.getElementById(id);
    if (!win) return;

    win.hidden = false;
    win.classList.remove("minimized");
    focusWindow(win);
  }

  function closeWindow(win) {
    if (!win) return;
    win.hidden = true;
    win.classList.remove("maximized");
  }

  function minimizeWindow(win) {
    if (!win) return;
    win.hidden = true;
    win.classList.add("minimized");
  }

  function toggleMaximize(win) {
    if (!win) return;
    win.classList.toggle("maximized");
    focusWindow(win);
  }

  document.querySelectorAll(".system-window").forEach(win => {
    win.addEventListener("pointerdown", () => focusWindow(win));

    win.querySelector("[data-window-close]")?.addEventListener("click", () => {
      closeWindow(win);
    });

    win.querySelector("[data-window-minimize]")?.addEventListener("click", () => {
      minimizeWindow(win);
    });

    win.querySelector("[data-window-maximize]")?.addEventListener("click", () => {
      toggleMaximize(win);
    });

    const handle = win.querySelector("[data-drag-handle]");
    if (!handle) return;

    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    handle.addEventListener("pointerdown", event => {
      if (event.target.closest(".window-controls")) return;
      if (win.classList.contains("maximized")) return;

      dragging = true;
      focusWindow(win);

      const rect = win.getBoundingClientRect();
      offsetX = event.clientX - rect.left;
      offsetY = event.clientY - rect.top;

      handle.setPointerCapture(event.pointerId);
    });

    handle.addEventListener("pointermove", event => {
      if (!dragging) return;

      const x = Math.max(0, Math.min(
        window.innerWidth - win.offsetWidth,
        event.clientX - offsetX
      ));

      const y = Math.max(0, Math.min(
        window.innerHeight - win.offsetHeight,
        event.clientY - offsetY
      ));

      win.style.left = `${x}px`;
      win.style.top = `${y}px`;
      win.style.transform = "none";
    });

    handle.addEventListener("pointerup", () => {
      dragging = false;
    });

    handle.addEventListener("pointercancel", () => {
      dragging = false;
    });
  });

  document.addEventListener("click", event => {
    const action = event.target.closest("[data-action]")?.dataset.action;

    if (action === "settings") {
      openWindow("settingsWindow");
      closeAllPanels();
    }
  });

  function closeAllPanels() {
    document.querySelectorAll(".floating-panel.open").forEach(panel => {
      panel.classList.remove("open");
    });
  }

  window.SecuWindowManager = {
    openWindow,
    closeWindow,
    minimizeWindow,
    toggleMaximize,
    focusWindow,
    closeAllPanels,
    getActiveWindow: () => activeWindow
  };

  window.openSecuSettings = () => openWindow("settingsWindow");
})();
