(() => {
  "use strict";

  const stylesheets = [
    "/css/apps.css",
    "/css/desktop-surface.css"
  ];

  const scripts = [
    "/js/system-clock.js",
    "/js/window-manager.js",
    "/js/start-menu.js",
    "/js/dock.js",
    "/js/shelf.js",
    "/js/quick-settings.js",
    "/js/desktop-context.js",
    "/js/desktop-settings.js",
    "/js/desktop.js",
    "/js/file-system.js",
    "/js/system-experience.js",
    "/js/desktop-surface.js",
    "/js/app-bridge.js",
    "/js/boot-loader.js"
  ];

  function loadStyle(href) {
    if (document.querySelector(`link[href="${href}"]`)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const link = document.createElement("link");

      link.rel = "stylesheet";
      link.href = href;

      link.onload = resolve;
      link.onerror = () => reject(
        new Error(`Could not load stylesheet: ${href}`)
      );

      document.head.appendChild(link);
    });
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");

      script.src = src;
      script.async = false;

      script.onload = resolve;
      script.onerror = () => reject(
        new Error(`Could not load script: ${src}`)
      );

      document.body.appendChild(script);
    });
  }

  function showError(error) {
    console.error("[SecuOS]", error);

    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = "toast";

    const heading = document.createElement("strong");
    heading.textContent = "System component failed";

    const message = document.createElement("span");
    message.textContent = error.message;

    toast.append(heading, message);
    container.appendChild(toast);

    window.setTimeout(() => toast.remove(), 6000);
  }

  async function start() {
    for (const href of stylesheets) {
      try {
        await loadStyle(href);
      } catch (error) {
        showError(error);
      }
    }

    for (const src of scripts) {
      try {
        await loadScript(src);
      } catch (error) {
        showError(error);
      }
    }

    window.dispatchEvent(
      new CustomEvent("secuos:global-ready")
    );

    console.info("[SecuOS] All system components loaded.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, {
      once: true
    });
  } else {
    start();
  }
})();
