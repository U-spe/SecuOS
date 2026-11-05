
(() => {
  "use strict";

  document.querySelectorAll(".shelf-apps button").forEach(button => {
    button.addEventListener("click", () => {
      if (button.dataset.action === "settings") {
        window.openSecuSettings?.();
        return;
      }

      window.SecuDesktop?.notify(
        "Desktop shortcut",
        "This item is a visual placeholder for now."
      );
    });
  });
})();
