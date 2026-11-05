
(() => {
  "use strict";

  const root = document.documentElement;
  const wallpaper = document.querySelector(".wallpaper");

  const storage = {
    get(key, fallback = "") {
      try {
        return localStorage.getItem(`secuos-${key}`) ?? fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(`secuos-${key}`, value);
      } catch {
        window.SecuDesktop?.notify(
          "Storage unavailable",
          "Your browser could not save this preference."
        );
      }
    }
  };

  function setOS(os) {
    if (!["windows", "macos", "chrome"].includes(os)) return;

    root.dataset.os = os;
    storage.set("os", os);

    document.querySelectorAll("[data-set-os]").forEach(button => {
      button.classList.toggle("active", button.dataset.setOs === os);
    });

    window.SecuDesktop?.notify(
      "Desktop style changed",
      `Your desktop now uses the ${os === "macos" ? "macOS" : os === "chrome" ? "ChromeOS" : "Windows 11"} layout.`
    );
  }

  function setTheme(theme) {
    if (!["dark", "light", "system"].includes(theme)) return;

    if (theme === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.dataset.theme = theme;
    }

    storage.set("theme", theme);
  }

  function setWallpaper(path) {
    if (!path || typeof path !== "string") return;

    wallpaper.style.backgroundImage =
      `linear-gradient(135deg, rgba(12,15,28,.2), rgba(0,0,0,.1)), url("${path}")`;

    storage.set("wallpaper", path);
  }

  function setAccent(color) {
    if (!/^#[0-9a-f]{6}$/i.test(color)) return;

    root.style.setProperty("--accent", color);
    storage.set("accent", color);
  }

  document.querySelectorAll("[data-set-os]").forEach(button => {
    button.addEventListener("click", () => setOS(button.dataset.setOs));
  });

  document.querySelectorAll("[data-theme]").forEach(button => {
    button.addEventListener("click", () => setTheme(button.dataset.theme));
  });

  document.querySelectorAll("[data-wallpaper]").forEach(button => {
    button.addEventListener("click", () => {
      setWallpaper(button.dataset.wallpaper);
    });
  });

  document.getElementById("accentPicker")?.addEventListener("input", event => {
    setAccent(event.target.value);
  });

  document.getElementById("wallpaperUpload")?.addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") return;

      wallpaper.style.backgroundImage =
        `linear-gradient(135deg, rgba(12,15,28,.15), rgba(0,0,0,.05)), url("${reader.result}")`;

      storage.set("wallpaper-upload", reader.result);
      storage.set("wallpaper", "");
    };

    reader.readAsDataURL(file);
  });

  document.getElementById("saveProfile")?.addEventListener("click", () => {
    const displayName = document.getElementById("displayNameInput")?.value.trim();
    const username = document.getElementById("usernameInput")?.value.trim();

    if (displayName) storage.set("display-name", displayName);
    if (username) storage.set("username", username);

    updateProfile();

    window.SecuDesktop?.notify(
      "Profile saved",
      "Your local desktop profile has been updated."
    );
  });

  function updateProfile() {
    const name = storage.get("display-name", "User");

    document.querySelectorAll(".profile-name").forEach(element => {
      element.textContent = name;
    });

    const nameInput = document.getElementById("displayNameInput");
    const usernameInput = document.getElementById("usernameInput");

    if (nameInput) nameInput.value = name;
    if (usernameInput) usernameInput.value = storage.get("username", "user");
  }

  const iconsToggle = document.getElementById("desktopIconsToggle");
  const transparencyToggle = document.getElementById("transparencyToggle");
  const secondsToggle = document.getElementById("secondsToggle");

  function setDesktopIcons(enabled) {
    document.querySelectorAll(
      ".desktop-shortcuts, .mac-shortcuts, .chrome-shortcuts"
    ).forEach(element => {
      element.style.display = enabled ? "" : "none";
    });

    storage.set("desktop-icons", String(enabled));
  }

  iconsToggle?.addEventListener("change", () => {
    setDesktopIcons(iconsToggle.checked);
  });

  transparencyToggle?.addEventListener("change", () => {
    root.dataset.reducedTransparency = String(transparencyToggle.checked);
    storage.set("reduced-transparency", String(transparencyToggle.checked));
  });

  secondsToggle?.addEventListener("change", () => {
    storage.set("seconds", String(secondsToggle.checked));
    window.dispatchEvent(new Event("secuos-clock-update"));
  });

  document.querySelectorAll("[data-settings-page]").forEach(button => {
    button.addEventListener("click", () => {
      const page = button.dataset.settingsPage;

      document.querySelectorAll("[data-settings-page]").forEach(item => {
        item.classList.toggle("active", item === button);
      });

      document.querySelectorAll(".settings-page").forEach(item => {
        item.classList.toggle("active", item.dataset.page === page);
      });
    });
  });

  function loadSettings() {
    setOS(storage.get("os", "windows"));
    setTheme(storage.get("theme", "dark"));

    const accent = storage.get("accent", "#6688ff");
    setAccent(accent);

    const uploaded = storage.get("wallpaper-upload");
    const savedWallpaper = storage.get("wallpaper");

    if (uploaded) {
      wallpaper.style.backgroundImage =
        `linear-gradient(135deg, rgba(12,15,28,.15), rgba(0,0,0,.05)), url("${uploaded}")`;
    } else if (savedWallpaper) {
      setWallpaper(savedWallpaper);
    }

    const showIcons = storage.get("desktop-icons", "true") === "true";
    const reducedTransparency = storage.get("reduced-transparency") === "true";
    const showSeconds = storage.get("seconds") === "true";

    if (iconsToggle) iconsToggle.checked = showIcons;
    if (transparencyToggle) transparencyToggle.checked = reducedTransparency;
    if (secondsToggle) secondsToggle.checked = showSeconds;

    setDesktopIcons(showIcons);
    root.dataset.reducedTransparency = String(reducedTransparency);

    const accentPicker = document.getElementById("accentPicker");
    if (accentPicker) accentPicker.value = accent;

    updateProfile();
  }

  loadSettings();

  window.SecuSettings = {
    setOS,
    setTheme,
    setWallpaper,
    setAccent
  };
})();
