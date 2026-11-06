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
    "/js/boot-loader.js"
  ];

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Could not load " + src));
      document.body.appendChild(script);
    });
  }

  async function start() {
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = "/css/apps.css";
    document.head.appendChild(stylesheet);

    for (const src of scripts) {
      try {
        await loadScript(src);
      } catch (error) {
        console.error("[SecuOS loader]", error);
        window.SecuDesktop?.notify?.(
          "System component unavailable",
          error.message
        );
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
