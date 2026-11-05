
(() => {
  "use strict";

  const STORAGE_KEY = "secuos.profile.v1";

  const defaults = {
    os: "chrome",
    mode: "dark",
    accent: "#7257ff",
    wallpaper: "nebula",
    font: "space",
    profile: {
      displayName: "",
      username: ""
    },
    setupComplete: false
  };

  let settings = { ...defaults };

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved === "object") {
      settings = {
        ...defaults,
        ...saved,
        profile: {
          ...defaults.profile,
          ...(saved.profile || {})
        }
      };
    }
  } catch {
    settings = { ...defaults };
  }

  const screens = [...document.querySelectorAll(".setup-screen")];

  const steps = [
    "welcome",
    "os",
    "theme",
    "profile",
    "complete",
    "desktop"
  ];

  let currentStep = 0;

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  const wallpaperStyles = {
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

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error("SecuOS storage error:", error);
      return false;
    }
  }

  function applySettings() {
    document.documentElement.style.setProperty(
      "--accent",
      settings.accent
    );

    document.documentElement.style.setProperty(
      "--accent-glow",
      hexToRgba(settings.accent, 0.25)
    );

    document.documentElement.style.setProperty(
      "--font",
      fonts[settings.font] || fonts.space
    );

    const wallpaper = settings.wallpaper;

    if (wallpaper.startsWith("data:image/")) {
      document.documentElement.style.setProperty(
        "--wallpaper",
        `url("${wallpaper}") center / cover no-repeat fixed`
      );
    } else {
      document.documentElement.style.setProperty(
        "--wallpaper",
        wallpaperStyles[wallpaper] || wallpaperStyles.nebula
      );
    }

    document.body.classList.toggle(
      "light-mode",
      settings.mode === "light"
    );

    updateSelections();
  }

  function hexToRgba(hex, alpha) {
    const clean = hex.replace("#", "");
    const value = parseInt(clean, 16);

    if (!Number.isFinite(value)) {
      return `rgba(114,87,255,${alpha})`;
    }

    return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`;
  }

  function updateSelections() {
    $$("[data-os]").forEach(button => {
      button.classList.toggle(
        "selected",
        button.dataset.os === settings.os
      );
    });

    $$("[data-mode]").forEach(button => {
      button.classList.toggle(
        "selected",
        button.dataset.mode === settings.mode
      );
    });

    $$("[data-color]").forEach(button => {
      button.classList.toggle(
        "selected",
        button.dataset.color === settings.accent
      );
    });

    $$("[data-wallpaper]").forEach(button => {
      button.classList.toggle(
        "selected",
        button.dataset.wallpaper === settings.wallpaper
      );
    });

    $("#fontSelect").value = settings.font;
  }

  function goTo(step) {
    if (!steps.includes(step)) return;

    currentStep = steps.indexOf(step);

    screens.forEach(screen => {
      screen.classList.toggle(
        "active",
        screen.dataset.step === step
      );
    });

    const progress = {
      welcome: 0,
      os: 25,
      theme: 50,
      profile: 75,
      complete: 100,
      desktop: 100
    };

    $("#progress").style.width = `${progress[step]}%`;

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  function next() {
    const nextStep = steps[currentStep + 1];
    if (nextStep) goTo(nextStep);
  }

  function back() {
    const previousStep = steps[currentStep - 1];
    if (previousStep) goTo(previousStep);
  }

  // Navigation

  $$("[data-next]").forEach(button => {
    button.addEventListener("click", next);
  });

  $$("[data-back]").forEach(button => {
    button.addEventListener("click", back);
  });

  // Operating system selection

  $$("[data-os]").forEach(button => {
    button.addEventListener("click", () => {
      settings.os = button.dataset.os;
      updateSelections();
      save();
    });
  });

  // Day / Night

  $$("[data-mode]").forEach(button => {
    button.addEventListener("click", () => {
      settings.mode = button.dataset.mode;
      applySettings();
      save();
    });
  });

  // Accent colors

  $$("[data-color]").forEach(button => {
    button.addEventListener("click", () => {
      settings.accent = button.dataset.color;
      applySettings();
      save();
    });
  });

  $("#customColor").addEventListener("input", event => {
    settings.accent = event.target.value;
    applySettings();
    save();
  });

  // Backgrounds

  $$("[data-wallpaper]").forEach(button => {
    button.addEventListener("click", () => {
      settings.wallpaper = button.dataset.wallpaper;
      $("#uploadStatus").textContent =
        "Images are stored locally in this browser.";

      applySettings();
      save();
    });
  });

  // Custom background upload

  $("#wallpaperUpload").addEventListener("change", event => {
    const file = event.target.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      $("#uploadStatus").textContent =
        "Please select an image file.";
      return;
    }

    if (file.size > 1.5 * 1024 * 1024) {
      $("#uploadStatus").textContent =
        "Image is too large. Please use an image under 1.5 MB.";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      settings.wallpaper = reader.result;

      applySettings();

      const saved = save();

      $("#uploadStatus").textContent = saved
        ? `Uploaded: ${file.name}`
        : "Preview loaded, but browser storage is full.";
    };

    reader.onerror = () => {
      $("#uploadStatus").textContent =
        "Unable to read this image.";
    };

    reader.readAsDataURL(file);
  });

  // Fonts

  $("#fontSelect").addEventListener("change", event => {
    settings.font = event.target.value;
    applySettings();
    save();
  });

  // Presets

  const presets = {
    ubg: {
      mode: "dark",
      accent: "#7257ff",
      wallpaper: "nebula",
      font: "space"
    },

    minimal: {
      mode: "light",
      accent: "#388bff",
      wallpaper: "midnight",
      font: "inter"
    },

    neon: {
      mode: "dark",
      accent: "#13b98a",
      wallpaper: "aurora",
      font: "orbitron"
    },

    classic: {
      mode: "dark",
      accent: "#388bff",
      wallpaper: "midnight",
      font: "nunito"
    }
  };

  $$("[data-preset]").forEach(button => {
    button.addEventListener("click", () => {
      const preset = presets[button.dataset.preset];

      if (!preset) return;

      settings = {
        ...settings,
        ...preset
      };

      $("#uploadStatus").textContent =
        "Preset applied. Choose a custom background to replace it.";

      applySettings();
      save();
    });
  });

  // Profile

  $("#displayName").addEventListener("input", event => {
    $("#avatarPreview").textContent =
      event.target.value.trim().charAt(0).toUpperCase() || "S";
  });

  $("#finishSetup").addEventListener("click", () => {
    const displayName = $("#displayName").value.trim();

    const username = $("#username").value
      .trim()
      .replace(/^@/, "")
      .toLowerCase();

    const error = $("#profileError");

    error.textContent = "";

    if (!displayName || !username) {
      error.textContent =
        "Please enter both your display name and username.";
      return;
    }

    if (!/^[a-z0-9_]{3,24}$/.test(username)) {
      error.textContent =
        "Username must be 3–24 characters using letters, numbers, or underscores.";
      return;
    }

    settings.profile = {
      displayName,
      username
    };

    settings.setupComplete = true;

    if (!save()) {
      error.textContent =
        "Unable to save your profile. Check browser storage.";
      settings.setupComplete = false;
      return;
    }

    $("#completedName").textContent = displayName;

    $("#completedOS").textContent = {
      chrome: "ChromeOS",
      windows: "Windows",
      mac: "macOS"
    }[settings.os];

    goTo("complete");
  });

  // Enter desktop

  $("#enterDesktop").addEventListener("click", () => {
    $("#desktopName").textContent =
      settings.profile.displayName || "User";

    goTo("desktop");
  });

  // Initial state

  applySettings();

  if (settings.setupComplete) {
    $("#completedName").textContent =
      settings.profile.displayName || "User";

    $("#desktopName").textContent =
      settings.profile.displayName || "User";

    goTo("desktop");
  } else {
    goTo("welcome");
  }

})();
