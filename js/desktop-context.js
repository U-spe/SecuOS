
(() => {
  "use strict";

  const desktop = document.getElementById("desktop");
  const menu = document.getElementById("desktopContext");

  function closeContextMenu() {
    menu?.classList.remove("open");
  }

  desktop?.addEventListener("contextmenu", event => {
    if (event.target.closest(".system-window, .floating-panel, button, input")) {
      return;
    }

    event.preventDefault();

    if (!menu) return;

    menu.classList.add("open");

    const rect = menu.getBoundingClientRect();
    const x = Math.min(event.clientX, window.innerWidth - rect.width - 8);
    const y = Math.min(event.clientY, window.innerHeight - rect.height - 8);

    menu.style.left = `${Math.max(8, x)}px`;
    menu.style.top = `${Math.max(8, y)}px`;
    menu.style.right = "auto";
    menu.style.bottom = "auto";
  });

  document.getElementById("contextRefresh")?.addEventListener("click", () => {
    closeContextMenu();
    window.SecuDesktop?.notify("Desktop", "Desktop refreshed.");
  });

  document.getElementById("contextSettings")?.addEventListener("click", () => {
    closeContextMenu();
    window.openSecuSettings?.();
  });

  document.getElementById("contextNotifications")?.addEventListener("click", () => {
    closeContextMenu();
    document.getElementById("notificationPanel")?.classList.add("open");
  });

  document.addEventListener("pointerdown", event => {
    if (!event.target.closest("#desktopContext")) {
      closeContextMenu();
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeContextMenu();
  });

  document.querySelectorAll(".desktop-icon").forEach(icon => {
    icon.addEventListener("click", event => {
      document.querySelectorAll(".desktop-icon").forEach(item => {
        item.classList.remove("selected");
      });

      icon.classList.add("selected");

      if (icon.dataset.action === "settings") {
        window.openSecuSettings?.();
      }
    });

    icon.addEventListener("dblclick", () => {
      const name = icon.querySelector("span")?.textContent || "Desktop item";

      if (icon.dataset.action !== "settings") {
        window.SecuDesktop?.notify(
          name,
          "This desktop shortcut is not connected to an application yet."
        );
      }
    });
  });

  document.addEventListener("click", event => {
    if (!event.target.closest(".desktop-context")) closeContextMenu();
  });
})();
