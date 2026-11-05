
(() => {
  "use strict";

  const dock = document.querySelector(".mac-dock");
  if (!dock) return;

  const icons = [...dock.querySelectorAll(".dock-icon")];

  icons.forEach(icon => {
    icon.addEventListener("pointerenter", () => {
      icon.classList.add("hovered");
    });

    icon.addEventListener("pointerleave", () => {
      icon.classList.remove("hovered");
    });

    icon.addEventListener("click", () => {
      const label = icon.getAttribute("aria-label") || "Desktop item";

      if (label === "Settings") {
        window.openSecuSettings?.();
      } else {
        window.SecuDesktop?.notify(
          label,
          "This desktop item is a placeholder for now."
        );
      }
    });
  });
})();
