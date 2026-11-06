(() => {
  "use strict";

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
    "/js/app-bridge.js",
    "/js/boot-loader.js"
  ];

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Could not load ${src}`));
      document.body.appendChild(script);
    });
  }

  async function start() {
    for (const href of ["/css/apps.css"]) {
      if (!document.querySelector(`link[href="${href}"]`)) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        document.head.appendChild(link);
      }
    }

    for (const src of scripts) {
      try {
        await loadScript(src);
      } catch (error) {
        console.error("[SecuOS loader]", error);

        const toast = document.getElementById("toastContainer");
        if (toast) {
          const item = document.createElement("div");
          item.className = "toast";
          item.textContent = error.message;
          toast.appendChild(item);
        }
      }
    }

    console.info("[SecuOS] Global system loaded.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
