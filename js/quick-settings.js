
(() => {
  "use strict";

  const panel = document.getElementById("quickSettings");

  const buttons = [
    document.getElementById("windowsTrayButton"),
    document.getElementById("macControlButton"),
    document.getElementById("chromeStatusButton")
  ];

  function toggleQuickSettings() {
    if (!panel) return;
    panel.classList.toggle("open");
  }

  buttons.forEach(button => {
    button?.addEventListener("click", toggleQuickSettings);
  });

  document.getElementById("quickSettingsClose")?.addEventListener("click", () => {
    panel?.classList.remove("open");
  });

  document.querySelectorAll(".quick-toggle").forEach(button => {
    button.addEventListener("click", () => {
      button.classList.toggle("active");

      const enabled = button.classList.contains("active");
      button.setAttribute("aria-pressed", String(enabled));
    });
  });

  document.querySelectorAll(".quick-slider input").forEach(slider => {
    slider.addEventListener("input", () => {
      if (slider.getAttribute("aria-label") === "Brightness") {
        document.documentElement.style.setProperty(
          "--desktop-brightness",
          slider.value / 100
        );

        document.querySelector(".desktop-shade").style.opacity =
          String(1 - Number(slider.value) / 100);
      }
    });
  });

  window.SecuQuickSettings = {
    open: () => panel?.classList.add("open"),
    close: () => panel?.classList.remove("open"),
    toggle: toggleQuickSettings
  };
})();
