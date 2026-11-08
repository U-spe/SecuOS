(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const content = $("#appWindowContent");
  const title = $("#appWindowTitle");
  const titleIcon = $("#appWindowIcon");
  const installedKey = "secuos-installed-apps";
  const calendarKey = "secuos-calendar-events";
  const notesKey = "secuos-notes";

  const apps = [
    { id: "files", name: "Files", icon: "ri-folder-3-fill", description: "Browse and manage your files.", core: true },
    { id: "gallery", name: "Gallery", icon: "ri-gallery-line", description: "View images saved in Files.", core: true },
    { id: "trash", name: "Trash", icon: "ri-delete-bin-6-line", description: "Restore or permanently delete items.", core: true },
    { id: "settings", name: "Settings", icon: "ri-settings-3-fill", description: "Customize your desktop.", core: true },
    { id: "calendar", name: "Calendar", icon: "ri-calendar-2-line", description: "Manage your events.", core: true },
    { id: "notepad", name: "Notepad", icon: "ri-sticky-note-line", description: "Write and save notes.", core: true },
    { id: "calculator", name: "Calculator", icon: "ri-calculator-line", description: "Perform calculations.", core: true },
    { id: "clock", name: "Clock", icon: "ri-time-line", description: "View the time and date.", core: true },
    { id: "terminal", name: "Terminal", icon: "ri-terminal-box-line", description: "Use the SecuOS command shell.", core: true },
    { id: "apps", name: "Apps", icon: "ri-apps-2-line", description: "Install and manage applications.", core: true },
    { id: "quickbar", name: "Quick Bar", icon: "ri-flashlight-line", description: "Open your favorite applications.", core: true },
    { id: "camera", name: "Camera", icon: "ri-camera-line", description: "Use your device camera.", core: false },
    { id: "soundie", name: "Soundie", icon: "ri-music-2-line", description: "Play audio saved in Files.", core: false },
    { id: "interwebs", name: "InterWebs", icon: "ri-global-line", description: "Open websites from your desktop.", core: false },
    { id: "popcorner", name: "Popcorner", icon: "ri-movie-2-line", description: "Browse your local video library.", core: false },
  ];

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function notify(heading, message) {
    if (window.SecuDesktop?.notify) {
      window.SecuDesktop.notify(heading, message);
      return;
    }

    const host = $("#toastContainer");
    if (!host) {
      console.info("[SecuOS]", heading, message);
      return;
    }

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<strong>${escapeHTML(heading)}</strong><span>${escapeHTML(message)}</span>`;
    host.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }

  function readJSON(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getInstalled() {
    return readJSON(installedKey, apps.map(app => app.id));
  }

  function isInstalled(id) {
    return getInstalled().includes(id);
  }

  function setInstalled(id, enabled) {
    const installed = getInstalled();
    const next = enabled
      ? [...new Set([...installed, id])]
      : installed.filter(item => item !== id);

    writeJSON(installedKey, next);
    renderLaunchers();
  }

  function appCard(app, style = "standard") {
    return `
      <button
        type="button"
        class="app-launcher ${style}"
        data-app="${app.id}"
        title="${escapeHTML(app.description)}"
      >
        <span class="app-launcher-icon"><i class="${app.icon}"></i></span>
        <span class="app-launcher-name">${escapeHTML(app.name)}</span>
      </button>
    `;
  }

  function renderLaunchers() {
    const available = apps.filter(app => isInstalled(app.id));

    const windowsGrid = $("#windowsAppGrid");
    const chromeGrid = $("#chromeAppGrid");

    if (windowsGrid) {
      windowsGrid.innerHTML = available.map(app => appCard(app)).join("");
    }

    if (chromeGrid) {
      chromeGrid.innerHTML = available.map(app => appCard(app)).join("");
    }

    $$(".app-launcher[data-app]").forEach(button => {
      button.setAttribute("aria-label", apps.find(app => app.id === button.dataset.app)?.name || button.dataset.app);
    });
  }

  function appInfo(id) {
    return apps.find(app => app.id === id);
  }

  function showApp(id, html, options = {}) {
    const app = appInfo(id);
    if (!app || !content) return;

    title.textContent = app.name;
    titleIcon.className = app.icon;

    content.classList.remove("app-loaded");
    content.classList.add("app-loading");
    content.innerHTML = `<div class="app-loading-screen"><span class="app-spinner"></span><strong>Opening ${escapeHTML(app.name)}</strong></div>`;

    window.SecuWindowManager?.openWindow("appWindow");

    const delay = options.instant ? 0 : 110;

    setTimeout(() => {
      content.innerHTML = html;
      content.classList.remove("app-loading");
      content.classList.add("app-loaded");
      content.scrollTop = 0;

      if (typeof options.afterRender === "function") {
        options.afterRender();
      }
    }, delay);
  }

  async function launch(id, options = {}) {
    if (!isInstalled(id)) {
      notify("App not installed", "Install this app from the Apps manager first.");
      return;
    }
    if (!appInfo(id)) {
      notify("App unavailable", "This application is not registered.");
      return;
    }
    document.querySelectorAll(".floating-panel.open").forEach(panel => panel.classList.remove("open"));
    try {
      const styleHref = "/assets/apps/" + encodeURIComponent(id) + "/app.css";
      if (!document.querySelector('link[data-secu-app-style="' + id + '"]')) {
        const style = document.createElement("link"); style.rel = "stylesheet"; style.href = styleHref; style.dataset.secuAppStyle = id; document.head.appendChild(style);
      }
      const appModule = await import("/assets/apps/" + encodeURIComponent(id) + "/app.js");
      if (typeof appModule.open !== "function") throw new Error("The app entry point does not export open().");
      await appModule.open(options);
    } catch (error) {
      console.error("[SecuOS] Could not open app:", id, error);
      notify("App failed to open", error.message || "The application could not be loaded.");
    }
  }


  // --------------------------------------------------
  // LAUNCH BEHAVIOR
  // --------------------------------------------------

  const launcherSelector = [
    ".desktop-icon[data-app]",
    ".pinned-grid [data-app]",
    ".launcher-grid [data-app]",
    ".dock-icon[data-app]",
    ".shelf-apps [data-app]",
    ".taskbar-button[data-app]"
  ].join(",");

  document.addEventListener("click", event => {
    const element = event.target.closest(launcherSelector);
    if (!element) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const id = element.dataset.app;

    if (document.documentElement.dataset.os === "chrome") {
      launch(id);
      return;
    }

    if (event.detail >= 2) {
      launch(id);
      return;
    }

    $$(launcherSelector).forEach(item => item.classList.remove("selected"));
    element.classList.add("selected");
  }, true);

  document.addEventListener("dblclick", event => {
    const element = event.target.closest(launcherSelector);
    if (!element) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }, true);

  // Launch buttons that are actions rather than desktop icons.
  $("#startAllApps")?.addEventListener("click", () => launch("apps"));

  $("#windowsClock")?.addEventListener("click", event => {
    event.stopPropagation();
    $("#clockBriefing")?.classList.toggle("open");
    renderBriefing();
  });

  $("#briefingClose")?.addEventListener("click", () => {
    $("#clockBriefing")?.classList.remove("open");
  });

  document.addEventListener("pointerdown", event => {
    if (!event.target.closest("#clockBriefing, #windowsClock")) {
      $("#clockBriefing")?.classList.remove("open");
    }
  });

  // --------------------------------------------------
  // CLOCK AND WINDOWS BRIEFING
  // --------------------------------------------------

  function getEvents() { try { return JSON.parse(localStorage.getItem("secuos-calendar-events") || "[]"); } catch { return []; } }
  function saveEvents(events) { localStorage.setItem("secuos-calendar-events", JSON.stringify(events)); }

  function renderBriefing() {
    const now = new Date();

    $("#briefingWeekday").textContent = now.toLocaleDateString([], { weekday: "long" });
    $("#briefingDate").textContent = now.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
    $("#briefingTime").textContent = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

    const today = now.toISOString().slice(0, 10);
    const events = getEvents()
      .filter(item => item.date === today)
      .sort((a, b) => String(a.time).localeCompare(String(b.time)));

    $("#briefingAgenda").innerHTML = events.length
      ? events.map(item => `
          <div class="briefing-event">
            <span class="briefing-event-dot"></span>
            <div><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.time || "All day")}</small></div>
          </div>
        `).join("")
      : `<div class="briefing-empty">No events planned for today.</div>`;
  }

  setInterval(() => {
    if ($("#clockBriefing")?.classList.contains("open")) renderBriefing();
  }, 15000);

  // --------------------------------------------------
  // GFORT
  // --------------------------------------------------

  function openGFort() {
    showApp("gfort", `
      <div class="gfort-app">
        <div class="gfort-hero">
          <i class="ri-gamepad-fill"></i>
          <h2>GFort</h2>
          <p>Choose a library platform.</p>
        </div>
        <div class="gfort-platforms">
          <button data-console="PlayStation"><i class="ri-playstation-line"></i><strong>PlayStation</strong><span>Library 01</span></button>
          <button data-console="Xbox"><i class="ri-xbox-line"></i><strong>Xbox</strong><span>Library 02</span></button>
          <button data-console="Nintendo"><i class="ri-gamepad-line"></i><strong>Nintendo</strong><span>Library 03</span></button>
        </div>
        <p class="integration-note">These are library selectors only. Game libraries will be connected later.</p>
      </div>
    `, {
      afterRender: () => {
        $$("[data-console]").forEach(button => {
          button.addEventListener("click", () => {
            $$("[data-console]").forEach(item => item.classList.remove("active"));
            button.classList.add("active");
            notify("Library selected", `${button.dataset.console} library selected.`);
          });
        });
      }
    });
  }

  // --------------------------------------------------
  // SCAR
  // --------------------------------------------------

  function openScar() {
    showApp("scar", `
      <div class="integration-app scar-app">
        <div class="integration-logo"><i class="ri-sparkling-2-line"></i></div>
        <h2>Scar</h2>
        <p class="integration-status"><span class="status-dot offline"></span> AI provider not connected</p>
        <div class="integration-details">
          <strong>AI workspace</strong>
          <p>The chat interface is reserved for the future AI service. Site-wide read and write permissions are not enabled in this build.</p>
          <p>When connected, changes will need explicit user approval before they are applied.</p>
        </div>
      </div>
    `);
  }

  // --------------------------------------------------
  // MAIL
  // --------------------------------------------------

  function openMail() {
    const drafts = readJSON(mailKey, []);

    showApp("mail", `
      <div class="mail-app">
        <aside class="mail-sidebar">
          <button class="active"><i class="ri-draft-line"></i> Drafts</button>
          <button disabled><i class="ri-inbox-line"></i> Inbox</button>
          <button disabled><i class="ri-send-plane-line"></i> Sent</button>
        </aside>
        <section class="mail-main">
          <div class="app-toolbar">
            <div><h2>Mail</h2><p>Local draft workspace.</p></div>
            <button class="primary-button" id="mailNew"><i class="ri-edit-line"></i> New draft</button>
          </div>
          <div class="mail-drafts" id="mailDrafts">
            ${drafts.length ? drafts.map(draft => `
              <button data-draft-id="${draft.id}">
                <strong>${escapeHTML(draft.subject || "(No subject)")}</strong>
                <span>${escapeHTML(draft.to || "No recipient")}</span>
              </button>
            `).join("") : `<div class="app-empty"><i class="ri-mail-line"></i><strong>No drafts yet</strong><span>Create a draft to get started.</span></div>`}
          </div>
          <form class="mail-compose" id="mailCompose" hidden>
            <label>To<input id="mailTo" type="email" placeholder="name@example.com"></label>
            <label>Subject<input id="mailSubject" placeholder="Subject"></label>
            <label>Message<textarea id="mailBody" rows="7" placeholder="Write your message..."></textarea></label>
            <div><button type="submit" class="primary-button">Save draft</button><button type="button" id="mailCancel">Cancel</button></div>
            <p class="integration-note">Drafts are saved locally. Sending email is not connected.</p>
          </form>
        </section>
      </div>
    `, {
      afterRender: () => {
        const form = $("#mailCompose");

        $("#mailNew").addEventListener("click", () => {
          form.hidden = false;
          $("#mailTo").value = "";
          $("#mailSubject").value = "";
          $("#mailBody").value = "";
        });

        $("#mailCancel").addEventListener("click", () => form.hidden = true);

        form.addEventListener("submit", event => {
          event.preventDefault();

          const current = readJSON(mailKey, []);
          current.unshift({
            id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
            to: $("#mailTo").value.trim(),
            subject: $("#mailSubject").value.trim(),
            body: $("#mailBody").value,
            updatedAt: Date.now()
          });

          writeJSON(mailKey, current);
          openMail();
          notify("Draft saved", "Your email draft is stored locally.");
        });

        $$("[data-draft-id]").forEach(button => {
          button.addEventListener("click", () => {
            const draft = readJSON(mailKey, []).find(item => item.id === button.dataset.draftId);
            if (!draft) return;

            form.hidden = false;
            $("#mailTo").value = draft.to;
            $("#mailSubject").value = draft.subject;
            $("#mailBody").value = draft.body;
          });
        });
      }
    });
  }

  // --------------------------------------------------
  // CHAT
  // --------------------------------------------------

  function openChat() {
    const messages = readJSON(chatKey, []);

    showApp("chat", `
      <div class="chat-app">
        <div class="chat-heading"><i class="ri-message-3-line"></i><div><strong>SecuOS Chat</strong><span>Local workspace</span></div></div>
        <div class="chat-messages" id="chatMessages">
          ${messages.map(message => `
            <div class="chat-message ${message.role === "user" ? "mine" : ""}">
              <span>${escapeHTML(message.role === "user" ? "You" : "SecuOS")}</span>
              <p>${escapeHTML(message.text)}</p>
            </div>
          `).join("")}
          ${messages.length ? "" : `<div class="app-empty"><i class="ri-chat-3-line"></i><strong>Start a conversation</strong><span>Messages are saved in this browser only.</span></div>`}
        </div>
        <form class="chat-compose" id="chatForm">
          <input id="chatInput" placeholder="Write a message..." autocomplete="off">
          <button type="submit" aria-label="Send"><i class="ri-send-plane-fill"></i></button>
        </form>
      </div>
    `, {
      afterRender: () => {
        $("#chatForm").addEventListener("submit", event => {
          event.preventDefault();

          const input = $("#chatInput");
          const text = input.value.trim();
          if (!text) return;

          const current = readJSON(chatKey, []);
          current.push({ role: "user", text, time: Date.now() });
          writeJSON(chatKey, current);
          openChat();
        });

        const list = $("#chatMessages");
        list.scrollTop = list.scrollHeight;
      }
    });
  }

  // --------------------------------------------------
  // WEATHER
  // --------------------------------------------------

  function weatherLabel(code) {
    if (code === 0) return "Clear sky";
    if ([1, 2, 3].includes(code)) return "Partly cloudy";
    if ([45, 48].includes(code)) return "Fog";
    if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
    if ([61, 63, 65, 80, 81, 82].includes(code)) return "Rain";
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
    if ([95, 96, 99].includes(code)) return "Thunderstorms";
    return "Conditions unavailable";
  }

  async function loadWeather(latitude, longitude, place) {
    const result = $("#weatherResult");
    if (!result) return;

    result.textContent = "Loading forecast…";
    $("#weatherPlace").textContent = place;

    try {
      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.search = new URLSearchParams({
        latitude,
        longitude,
        current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m",
        daily: "temperature_2m_max,temperature_2m_min",
        temperature_unit: "fahrenheit",
        wind_speed_unit: "mph",
        timezone: "auto",
        forecast_days: "3"
      });

      const response = await fetch(url);
      if (!response.ok) throw new Error("Weather service is unavailable.");

      const data = await response.json();
      const current = data.current;

      result.innerHTML = `
        <div class="weather-current">
          <i class="ri-sun-cloudy-line"></i>
          <div><strong>${Math.round(current.temperature_2m)}°F</strong><span>${weatherLabel(current.weather_code)}</span></div>
        </div>
        <div class="weather-stats">
          <div><span>Feels like</span><strong>${Math.round(current.apparent_temperature)}°F</strong></div>
          <div><span>Humidity</span><strong>${current.relative_humidity_2m}%</strong></div>
          <div><span>Wind</span><strong>${Math.round(current.wind_speed_10m)} mph</strong></div>
        </div>
        <div class="weather-days">
          ${data.daily.time.map((day, index) => `
            <div><span>${new Date(day + "T12:00:00").toLocaleDateString([], { weekday: "short" })}</span>
            <strong>${Math.round(data.daily.temperature_2m_max[index])}°</strong>
            <small>${Math.round(data.daily.temperature_2m_min[index])}°</small></div>
          `).join("")}
        </div>
      `;

      $("#weatherUpdated").textContent = "Updated " + new Date().toLocaleTimeString([], {
        hour: "numeric", minute: "2-digit"
      });

      $("#briefingWeather").innerHTML =
        `<i class="ri-sun-cloudy-line"></i><span>${Math.round(current.temperature_2m)}°F · ${weatherLabel(current.weather_code)} · ${escapeHTML(place)}</span>`;

      writeJSON("secuos-weather", { latitude, longitude, place });
    } catch (error) {
      result.textContent = error.message;
    }
  }

  async function searchWeather(city) {
    const response = await fetch(
      "https://geocoding-api.open-meteo.com/v1/search?name=" +
      encodeURIComponent(city) +
      "&count=1&language=en&format=json"
    );

    if (!response.ok) throw new Error("Location search failed.");

    const data = await response.json();
    if (!data.results?.length) throw new Error("No matching city found.");

    const place = data.results[0];
    return loadWeather(
      place.latitude,
      place.longitude,
      [place.name, place.admin1, place.country].filter(Boolean).join(", ")
    );
  }

  function openWeather() {
    document.querySelectorAll(".floating-panel.open").forEach(panel => panel.classList.remove("open"));
    $("#weatherPanel")?.classList.add("open");

    const saved = readJSON("secuos-weather", null);
    if (saved) loadWeather(saved.latitude, saved.longitude, saved.place);
  }

  $("#weatherButton")?.addEventListener("click", openWeather);
  $("#macWeatherButton")?.addEventListener("click", openWeather);
  $("#weatherClose")?.addEventListener("click", () => $("#weatherPanel")?.classList.remove("open"));

  $("#weatherForm")?.addEventListener("submit", async event => {
    event.preventDefault();

    try {
      await searchWeather($("#weatherCity").value.trim());
    } catch (error) {
      $("#weatherResult").textContent = error.message;
    }
  });

  $("#weatherUseLocation")?.addEventListener("click", () => {
    if (!navigator.geolocation) {
      $("#weatherResult").textContent = "Location is not available in this browser.";
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => loadWeather(
        position.coords.latitude,
        position.coords.longitude,
        "Current location"
      ),
      () => $("#weatherResult").textContent = "Location permission was not granted.",
      { timeout: 10000, maximumAge: 300000 }
    );
  });

  // --------------------------------------------------
  // INITIALIZATION
  // --------------------------------------------------

  window.SecuOSAppHost = {
    info: appInfo,
    list: () => apps.map(app => ({ ...app })),
    renderBriefing,
  };

  function init() {
    renderLaunchers();

    $("#wallpaperFromFiles")?.addEventListener("click", async () => {
      const item = await window.SecuFileSystem.pickFile({ accept: "image/*" });
      if (!item) return;

      const url = URL.createObjectURL(item.blob);
      window.SecuSettings?.setWallpaper(url);
      notify("Wallpaper updated", `${item.name} is now your wallpaper.`);
    });

    $("#windowsTrayButton")?.addEventListener("click", () => {
      $("#quickSettings")?.classList.toggle("open");
    });

    $("#macControlButton")?.addEventListener("click", () => {
      $("#quickSettings")?.classList.toggle("open");
    });

    $("#chromeStatusButton")?.addEventListener("click", () => {
      $("#quickSettings")?.classList.toggle("open");
    });

    $("#quickSettingsClose")?.addEventListener("click", () => {
      $("#quickSettings")?.classList.remove("open");
    });

    $("#powerButton")?.addEventListener("click", () => {
      $("#powerMenu")?.classList.toggle("open");
    });

    $$("[data-power]").forEach(button => {
      button.addEventListener("click", () => {
        const action = button.dataset.power;
        $("#powerMenu")?.classList.remove("open");
        $("#appleMenu")?.classList.remove("open");

        if (action === "lock") window.SecuOSBoot?.lock();
        if (action === "sleep") $("#secu-sleep-screen")?.classList.add("active");
        if (action === "restart" && confirm("Restart SecuOS?")) window.SecuOSBoot?.restart();
        if (action === "shutdown" && confirm("Shut down SecuOS?")) window.SecuOSBoot?.shutdown();
      });
    });

    const wake = () => $("#secu-sleep-screen")?.classList.remove("active");
    $("#secu-sleep-screen")?.addEventListener("click", wake);

    document.addEventListener("keydown", event => {
      if ($("#secu-sleep-screen")?.classList.contains("active")) {
        event.preventDefault();
        wake();
      }
    });

    $("#clearNotifications")?.addEventListener("click", () => {
      const panel = $("#notificationPanel");
      if (!panel) return;
      panel.querySelector(".notification-empty")?.classList.remove("hidden");
    });

    document.querySelectorAll(".start-search input, .launcher-search input").forEach(input => {
      input.addEventListener("input", () => {
        const query = input.value.trim().toLowerCase();
        const grid = input.closest(".start-menu, .chrome-launcher")?.querySelector(".pinned-grid, .launcher-grid");
        if (!grid) return;

        grid.querySelectorAll("[data-app]").forEach(item => {
          item.hidden = !item.textContent.toLowerCase().includes(query);
        });
      });
    });

    document.addEventListener("click", event => {
      if (!event.target.closest(".floating-panel, #windowsClock, #windowsTrayButton, #macControlButton, #chromeStatusButton")) {
        document.querySelectorAll(".floating-panel.open").forEach(panel => {
          if (!["startMenu", "chromeLauncher", "appleMenu"].includes(panel.id)) {
            panel.classList.remove("open");
          }
        });
      }
    });

    window.SecuOSApps = {
      open: launch,
      list: apps.map(app => ({ ...app })),
      installed: getInstalled,
      install: id => setInstalled(id, true),
      uninstall: id => {
        const app = appInfo(id);
        if (!app || app.core) return false;
        setInstalled(id, false);
        return true;
      }
    };

    window.SecuDesktopApps = window.SecuOSApps;

    window.addEventListener("secuos:ready", renderLaunchers);

    renderBriefing();
    console.info("[SecuOS] Application registry initialized.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
