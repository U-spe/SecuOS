(() => {
  "use strict";

  const root = document.documentElement;
  const wallpaper = document.querySelector(".wallpaper");
  const PREFIX = "secuos-";
  const DEFAULTS = {
    os: "windows",
    theme: "dark",
    accent: "#7257ff",
    wallpaper: "nebula",
    font: "space"
  };
  const gradients = {
    nebula: "radial-gradient(ellipse at 30% 25%, #542c88, #171126 45%, #09090d 85%)",
    midnight: "linear-gradient(135deg, #05070f, #152a50, #08090f)",
    aurora: "radial-gradient(ellipse at 70% 20%, #28c9a0, #123c55, #08090f)",
    sunset: "linear-gradient(140deg, #ff9a70, #8549b8, #19152e)"
  };
  const fonts = {
    space: '"Space Grotesk", sans-serif',
    inter: '"Inter", sans-serif',
    nunito: '"Nunito", sans-serif',
    orbitron: '"Orbitron", sans-serif',
    mono: '"JetBrains Mono", monospace',
    system: "system-ui, sans-serif"
  };
  const presets = {
    ubg: { theme: "dark", accent: "#7257ff", wallpaper: "nebula", font: "space" },
    minimal: { theme: "light", accent: "#388bff", wallpaper: "midnight", font: "inter" },
    neon: { theme: "dark", accent: "#13b98a", wallpaper: "aurora", font: "orbitron" },
    classic: { theme: "dark", accent: "#388bff", wallpaper: "midnight", font: "nunito" }
  };

  const read = (key, fallback = "") => {
    try { return localStorage.getItem(PREFIX + key) ?? fallback; }
    catch { return fallback; }
  };

  function persist(key, value) {
    try {
      localStorage.setItem(PREFIX + key, value);
      const all = JSON.parse(localStorage.getItem("secuos.settings") || "{}");
      all[key] = value;
      localStorage.setItem("secuos.settings", JSON.stringify(all));
    } catch {
      window.SecuDesktop?.notify("Could not save setting", "Browser storage is unavailable or full.");
    }
  }

  function updateButtons(selector, attribute, value, activeClass = "active") {
    document.querySelectorAll(selector).forEach(button => {
      button.classList.toggle(activeClass, button.getAttribute(attribute) === value);
      if (button.getAttribute(attribute) === value) button.setAttribute("aria-pressed", "true");
      else button.setAttribute("aria-pressed", "false");
    });
  }

  function setOS(os, announce = false) {
    if (!["windows", "macos", "chrome"].includes(os)) return;
    root.dataset.os = os;
    persist("os", os);
    updateButtons("[data-set-os]", "data-set-os", os);
    if (announce) window.SecuDesktop?.notify("Desktop style updated", "Your desktop layout has been changed.");
  }

  function setTheme(theme) {
    if (!["dark", "light", "system"].includes(theme)) return;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.dataset.theme = theme;
    persist("theme", theme);
    updateButtons("[data-theme]", "data-theme", theme);
  }

  function setAccent(color) {
    if (!/^#[0-9a-f]{6}$/i.test(color)) return;
    root.style.setProperty("--accent", color);
    persist("accent", color);
    const picker = document.getElementById("accentPicker");
    if (picker) picker.value = color;
  }

  function setFont(font) {
    if (!fonts[font]) return;
    root.style.setProperty("--secu-font", fonts[font]);
    document.body.style.fontFamily = fonts[font];
    persist("font", font);
    const select = document.getElementById("fontSelect");
    if (select) select.value = font;
  }

  function setWallpaper(value) {
    if (!wallpaper || typeof value !== "string" || !value) return;
    if (gradients[value]) {
      wallpaper.style.background = gradients[value];
      wallpaper.style.backgroundImage = "";
    } else {
      wallpaper.style.background = "";
      wallpaper.style.backgroundImage = 'linear-gradient(135deg, rgba(12,15,28,.18), rgba(0,0,0,.08)), url("' + value.replace(/"/g, "%22") + '")';
    }
    persist("wallpaper", value);
    updateButtons("[data-wallpaper]", "data-wallpaper", value);
  }

  function applyPreset(name) {
    const preset = presets[name];
    if (!preset) return;
    setTheme(preset.theme);
    setAccent(preset.accent);
    setWallpaper(preset.wallpaper);
    setFont(preset.font);
    window.SecuDesktop?.notify("Preset applied", "Your appearance settings have been updated.");
  }

  function getProfile() {
    try { return JSON.parse(localStorage.getItem("secuos.profile") || "null"); }
    catch { return null; }
  }

  function updateProfile() {
    const profile = getProfile();
    const name = profile?.displayName || read("display-name", "User");
    document.querySelectorAll(".profile-name").forEach(node => node.textContent = name);
    const displayInput = document.getElementById("displayNameInput");
    const usernameInput = document.getElementById("usernameInput");
    if (displayInput) displayInput.value = profile?.displayName || read("display-name", "");
    if (usernameInput) usernameInput.value = profile?.username || read("username", "");
    const avatar = profile?.avatarDataUrl || "/assets/graphics/avatars/default.png";
    document.querySelectorAll(".settings-profile img, .profile-small img, #profileAvatarPreview").forEach(img => { img.src = avatar; });
  }

  async function chooseProfilePhoto() {
    try {
      const item = await window.SecuFileSystem?.pickFile?.({ accept: "image/*" });
      if (!item) return;
      if (!item.blob || !item.type?.startsWith("image/")) throw new Error("Please choose an image.");
      if (item.size > 2 * 1024 * 1024) throw new Error("Choose an image under 2 MB.");
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== "string" || !reader.result.startsWith("data:image/")) return;
        const profile = getProfile();
        if (!profile) throw new Error("No local profile exists yet.");
        profile.avatarDataUrl = reader.result;
        localStorage.setItem("secuos.profile", JSON.stringify(profile));
        updateProfile();
        window.SecuDesktop?.notify("Profile photo updated", "Your profile photo has been saved.");
      };
      reader.onerror = () => window.SecuDesktop?.notify("Photo error", "The selected image could not be read.");
      reader.readAsDataURL(item.blob);
    } catch (error) {
      window.SecuDesktop?.notify("Profile photo unavailable", error.message);
    }
  }

  function addProfilePhotoControl() {
    const page = document.querySelector('.settings-page[data-page="personalization"]');
    if (!page || page.querySelector("#profileAvatarButton")) return;
    const wrapper = document.createElement("div");
    wrapper.className = "profile-photo-control";
    wrapper.innerHTML = '<img id="profileAvatarPreview" alt="Profile photo"><div><strong>Profile photo</strong><span>Choose an image from your SecuOS Files library.</span><button class="primary-button" id="profileAvatarButton" type="button">Choose photo</button></div>';
    page.insertBefore(wrapper, page.querySelector("label"));
    wrapper.querySelector("#profileAvatarButton").addEventListener("click", chooseProfilePhoto);
  }

  function setDesktopIcons(enabled) {
    document.querySelectorAll(".desktop-shortcuts, .mac-shortcuts, .chrome-shortcuts").forEach(node => {
      node.style.display = enabled ? "" : "none";
    });
    persist("desktop-icons", String(enabled));
  }

  function updateSettingsPage(pageName) {
    document.querySelectorAll("[data-settings-page]").forEach(button => {
      button.classList.toggle("active", button.dataset.settingsPage === pageName);
      button.setAttribute("aria-current", button.dataset.settingsPage === pageName ? "page" : "false");
    });
    document.querySelectorAll(".settings-page").forEach(page => page.classList.toggle("active", page.dataset.page === pageName));
  }

  function setupSearch() {
    const search = document.getElementById("settingsSearch");
    if (!search) return;
    search.addEventListener("input", () => {
      const query = search.value.trim().toLowerCase();
      if (!query) return;
      const pages = [...document.querySelectorAll(".settings-page")];
      const match = pages.find(page => page.textContent.toLowerCase().includes(query));
      if (match) updateSettingsPage(match.dataset.page);
    });
    search.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        search.value = "";
        updateSettingsPage("appearance");
      }
    });
  }

  function resetAppearance() {
    setTheme(DEFAULTS.theme);
    setAccent(DEFAULTS.accent);
    setWallpaper(DEFAULTS.wallpaper);
    setFont(DEFAULTS.font);
    window.SecuDesktop?.notify("Appearance reset", "Your default SecuOS appearance has been restored.");
  }

  function loadSettings() {
    setOS(read("os", DEFAULTS.os));
    setTheme(read("theme", DEFAULTS.theme));
    setAccent(read("accent", DEFAULTS.accent));
    setFont(read("font", DEFAULTS.font));
    setWallpaper(read("wallpaper", DEFAULTS.wallpaper));

    const icons = document.getElementById("desktopIconsToggle");
    const transparency = document.getElementById("transparencyToggle");
    const seconds = document.getElementById("secondsToggle");
    const skipBoot = document.getElementById("skipBootToggle");
    const startupLogin = document.getElementById("startupLoginToggle");
    const diagnostics = document.getElementById("bootDiagnosticsToggle");

    if (icons) icons.checked = read("desktop-icons", "true") === "true";
    if (transparency) transparency.checked = read("reduced-transparency") === "true";
    if (seconds) seconds.checked = read("seconds") === "true";
    if (skipBoot) skipBoot.checked = read("skip-boot", "false") === "true";
    if (startupLogin) startupLogin.checked = read("startup-login", "true") === "true";
    if (diagnostics) diagnostics.checked = read("boot-diagnostics", "true") === "true";

    setDesktopIcons(icons ? icons.checked : true);
    root.dataset.reducedTransparency = String(!!transparency?.checked);
    addProfilePhotoControl();
    updateProfile();
    updateSettingsPage("appearance");
    setupSearch();
  }

  document.querySelectorAll("[data-set-os]").forEach(button => button.addEventListener("click", () => setOS(button.dataset.setOs, true)));
  document.querySelectorAll("[data-theme]").forEach(button => button.addEventListener("click", () => setTheme(button.dataset.theme)));
  document.querySelectorAll("[data-wallpaper]").forEach(button => button.addEventListener("click", () => setWallpaper(button.dataset.wallpaper)));
  document.querySelectorAll("[data-preset]").forEach(button => button.addEventListener("click", () => applyPreset(button.dataset.preset)));
  document.getElementById("fontSelect")?.addEventListener("change", event => setFont(event.target.value));
  document.getElementById("accentPicker")?.addEventListener("input", event => setAccent(event.target.value));
  document.getElementById("wallpaperUpload")?.addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 2 * 1024 * 1024) {
      window.SecuDesktop?.notify("Image too large", "Choose a wallpaper under 2 MB.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string" && reader.result.startsWith("data:image/")) setWallpaper(reader.result);
    };
    reader.onerror = () => window.SecuDesktop?.notify("Wallpaper error", "The image could not be read.");
    reader.readAsDataURL(file);
  });
  document.getElementById("saveProfile")?.addEventListener("click", () => {
    const displayName = document.getElementById("displayNameInput")?.value.trim();
    const username = document.getElementById("usernameInput")?.value.trim();
    const profile = getProfile();
    if (profile) {
      if (displayName) profile.displayName = displayName;
      if (username) profile.username = username;
      localStorage.setItem("secuos.profile", JSON.stringify(profile));
    }
    if (displayName) persist("display-name", displayName);
    if (username) persist("username", username);
    updateProfile();
    window.SecuDesktop?.notify("Profile saved", "Your local profile has been updated.");
  });
  document.getElementById("desktopIconsToggle")?.addEventListener("change", event => setDesktopIcons(event.target.checked));
  document.getElementById("transparencyToggle")?.addEventListener("change", event => {
    root.dataset.reducedTransparency = String(event.target.checked);
    persist("reduced-transparency", String(event.target.checked));
  });
  document.getElementById("secondsToggle")?.addEventListener("change", event => {
    persist("seconds", String(event.target.checked));
    window.dispatchEvent(new Event("secuos-clock-update"));
  });
  document.getElementById("skipBootToggle")?.addEventListener("change", event => persist("skip-boot", String(event.target.checked)));
  document.getElementById("startupLoginToggle")?.addEventListener("change", event => persist("startup-login", String(event.target.checked)));
  document.getElementById("bootDiagnosticsToggle")?.addEventListener("change", event => persist("boot-diagnostics", String(event.target.checked)));
  document.getElementById("resetAppearance")?.addEventListener("click", resetAppearance);
  document.querySelectorAll("[data-settings-page]").forEach(button => button.addEventListener("click", () => updateSettingsPage(button.dataset.settingsPage)));

  window.addEventListener("storage", event => {
    if (!event.key?.startsWith(PREFIX)) return;
    if (event.key === PREFIX + "theme") setTheme(event.newValue || DEFAULTS.theme);
    if (event.key === PREFIX + "accent") setAccent(event.newValue || DEFAULTS.accent);
    if (event.key === PREFIX + "font") setFont(event.newValue || DEFAULTS.font);
    if (event.key === PREFIX + "wallpaper") setWallpaper(event.newValue || DEFAULTS.wallpaper);
    if (event.key === PREFIX + "os") setOS(event.newValue || DEFAULTS.os);
  });

  loadSettings();
  window.SecuSettings = { setOS, setTheme, setWallpaper, setAccent, setFont, applyPreset, chooseProfilePhoto, resetAppearance };
})();
