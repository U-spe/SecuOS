(() => {
  "use strict";

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const escapeHTML = value =>
    String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);

  let appList = [];
  let installedApps = [];

  let searchPanel = null;
  let searchInput = null;
  let searchResults = null;

  let weatherRequest = 0;
  let weatherInitialized = false;

  const currentOS = () =>
    document.documentElement.dataset.os || "windows";

  // --------------------------------------------------
  // APPLICATION REGISTRY
  // --------------------------------------------------

  function refreshRegistry() {
    const registry = window.SecuOSApps;

    if (!registry || !Array.isArray(registry.list)) {
      return false;
    }

    appList = registry.list;
    installedApps = typeof registry.installed === "function"
      ? registry.installed()
      : appList.map(app => app.id);

    return true;
  }

  function getInstalledApps() {
    if (!refreshRegistry()) return [];

    return appList.filter(app =>
      installedApps.includes(app.id)
    );
  }

  function iconHTML(app) {
    const icon = app.icon || "ri-apps-2-line";

    return `
      <i
        class="${escapeHTML(icon)}"
        aria-hidden="true"
      ></i>
    `;
  }

  function createDesktopIcon(app) {
    return `
      <button
        type="button"
        class="desktop-icon"
        data-app="${escapeHTML(app.id)}"
        title="${escapeHTML(app.description || app.name)}"
        aria-label="${escapeHTML(app.name)}"
      >
        ${iconHTML(app)}
        <span>${escapeHTML(app.name)}</span>
      </button>
    `;
  }

  function createDockIcon(app) {
    return `
      <button
        type="button"
        class="dock-icon"
        data-app="${escapeHTML(app.id)}"
        title="${escapeHTML(app.name)}"
        aria-label="${escapeHTML(app.name)}"
      >
        ${iconHTML(app)}
        <span class="dock-label">
          ${escapeHTML(app.name)}
        </span>
      </button>
    `;
  }

  function createShelfIcon(app) {
    return `
      <button
        type="button"
        class="shelf-app-icon"
        data-app="${escapeHTML(app.id)}"
        title="${escapeHTML(app.name)}"
        aria-label="${escapeHTML(app.name)}"
      >
        ${iconHTML(app)}
        <span class="shelf-app-label">
          ${escapeHTML(app.name)}
        </span>
      </button>
    `;
  }

  // --------------------------------------------------
  // WINDOWS DESKTOP
  // --------------------------------------------------

  function renderWindowsDesktop(apps) {
    const container = $(
      ".windows-layer .desktop-shortcuts"
    );

    if (!container) return;

    container.innerHTML = apps
      .map(createDesktopIcon)
      .join("");

    container.setAttribute(
      "aria-label",
      "Installed desktop applications"
    );
  }

  // --------------------------------------------------
  // MACOS DOCK
  // --------------------------------------------------

  function renderMacDock(apps) {
    const dock = $("#macDock");
    if (!dock) return;

    dock.innerHTML = apps
      .map(createDockIcon)
      .join("");

    dock.setAttribute(
      "aria-label",
      "Applications Dock"
    );

    dock.setAttribute(
      "role",
      "toolbar"
    );
  }

  // --------------------------------------------------
  // CHROMEOS SHELF
  // --------------------------------------------------

  function renderChromeShelf(apps) {
    const shelf = $("#chromeShelfApps");
    if (!shelf) return;

    shelf.innerHTML = apps
      .map(createShelfIcon)
      .join("");

    shelf.setAttribute(
      "aria-label",
      "Installed applications"
    );

    shelf.setAttribute(
      "role",
      "toolbar"
    );
  }

  // --------------------------------------------------
  // CHROMEOS DESKTOP
  // --------------------------------------------------

  function renderChromeDesktop(apps) {
    const container = $(
      ".chrome-layer .chrome-shortcuts"
    );

    if (!container) return;

    // ChromeOS uses the shelf as its primary app launcher.
    // Keep the desktop clear of duplicate app shortcuts.
    container.innerHTML = "";
    container.setAttribute("aria-hidden", "true");

    renderChromeShelf(apps);
  }

  // --------------------------------------------------
  // COMPLETE DESKTOP REFRESH
  // --------------------------------------------------

  function renderSurfaces() {
    if (!refreshRegistry()) return;

    const apps = getInstalledApps();

    renderWindowsDesktop(apps);
    renderMacDock(apps);
    renderChromeDesktop(apps);
    renderSearchResults(searchInput?.value || "");

    document.dispatchEvent(
      new CustomEvent("secuos:surfaces-rendered", {
        detail: {
          os: currentOS(),
          count: apps.length
        }
      })
    );
  }

  // --------------------------------------------------
  // WINDOWS SEARCH
  // --------------------------------------------------

  function createSearchPanel() {
    if (searchPanel) return;

    const desktop = $("#desktop") || document.body;

    searchPanel = document.createElement("section");
    searchPanel.id = "windowsSearchPanel";
    searchPanel.className =
      "floating-panel windows-search-panel";

    searchPanel.setAttribute("aria-label", "Windows Search");

    searchPanel.innerHTML = `
      <div class="surface-search-heading">
        <div>
          <span class="surface-search-eyebrow">
            SECUOS
          </span>
          <strong>Search</strong>
        </div>

        <button
          type="button"
          id="surfaceSearchClose"
          aria-label="Close search"
        >
          <i class="ri-close-line"></i>
        </button>
      </div>

      <label class="surface-search-input">
        <i class="ri-search-line"></i>

        <input
          id="surfaceSearchInput"
          type="search"
          placeholder="Search apps and applications"
          autocomplete="off"
          spellcheck="false"
        >

        <kbd>ENTER</kbd>
      </label>

      <div class="surface-search-section">
        <span>APPLICATIONS</span>
        <span id="surfaceSearchCount"></span>
      </div>

      <div
        id="surfaceSearchResults"
        class="surface-search-results"
      ></div>

      <div class="surface-search-footer">
        Search installed SecuOS applications
      </div>
    `;

    desktop.appendChild(searchPanel);

    searchInput = $("#surfaceSearchInput", searchPanel);
    searchResults = $("#surfaceSearchResults", searchPanel);

    searchInput.addEventListener("input", () => {
      renderSearchResults(searchInput.value);
    });

    $("#surfaceSearchClose").addEventListener(
      "click",
      closeSearch
    );
  }

  function renderSearchResults(query = "") {
    if (!searchResults) return;

    const apps = getInstalledApps();
    const normalized = String(query).trim().toLowerCase();

    const matches = apps.filter(app => {
      const haystack = [
        app.name,
        app.description,
        app.id
      ].join(" ").toLowerCase();

      return !normalized || haystack.includes(normalized);
    });

    $("#surfaceSearchCount").textContent =
      `${matches.length} ${matches.length === 1 ? "app" : "apps"}`;

    if (!matches.length) {
      searchResults.innerHTML = `
        <div class="surface-search-empty">
          <i class="ri-search-eye-line"></i>
          <strong>No results found</strong>
          <span>Try another app name.</span>
        </div>
      `;

      return;
    }

    searchResults.innerHTML = matches.map(app => `
      <button
        type="button"
        class="surface-search-result"
        data-surface-launch="${escapeHTML(app.id)}"
      >
        <span class="surface-search-result-icon">
          ${iconHTML(app)}
        </span>

        <span class="surface-search-result-copy">
          <strong>${escapeHTML(app.name)}</strong>
          <small>
            ${escapeHTML(app.description || "Application")}
          </small>
        </span>

        <i class="ri-arrow-up-right-line"></i>
      </button>
    `).join("");
  }

  function openSearch() {
    if (currentOS() !== "windows") return;

    createSearchPanel();

    document.querySelectorAll(".floating-panel.open")
      .forEach(panel => panel.classList.remove("open"));

    renderSearchResults(searchInput.value);

    searchPanel.classList.add("open");

    requestAnimationFrame(() => {
      searchInput.focus();
      searchInput.select();
    });
  }

  function closeSearch() {
    searchPanel?.classList.remove("open");
  }

  function launchApp(id) {
    if (!window.SecuOSApps?.open) {
      console.error("[SecuOS] App registry is unavailable.");
      return;
    }

    window.SecuOSApps.open(id);
  }

  // --------------------------------------------------
  // OS-SPECIFIC APP CLICK BEHAVIOR
  // --------------------------------------------------

  function handleSurfaceClicks(event) {
    const button = event.target.closest("button");

    if (!button) return;

    // macOS Dock launches on one click.
    if (
      currentOS() === "macos" &&
      button.closest("#macDock") &&
      button.dataset.app
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();

      launchApp(button.dataset.app);
      return;
    }

    // ChromeOS shelf launches on one click.
    // The existing application registry already supports
    // single-click ChromeOS launch behavior.
    if (
      currentOS() === "chrome" &&
      button.closest("#chromeShelfApps") &&
      button.dataset.app
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();

      launchApp(button.dataset.app);
      return;
    }

    // Windows Search button.
    if (
      currentOS() === "windows" &&
      button.id === "taskSearch"
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();

      openSearch();
      return;
    }

    // Windows clock briefing.
    if (
      currentOS() === "windows" &&
      button.id === "windowsClock"
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();

      const briefing = $("#clockBriefing");

      if (briefing) {
        briefing.classList.toggle("open");
      }

      return;
    }

    // macOS menu bar clock.
    if (
      currentOS() === "macos" &&
      button.id === "macClock"
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();

      const briefing = $("#clockBriefing");

      if (briefing) {
        briefing.classList.toggle("open");
      }

      return;
    }

    // Search result launch.
    const result = button.closest("[data-surface-launch]");

    if (result && searchPanel?.contains(result)) {
      event.preventDefault();
      event.stopImmediatePropagation();

      const id = result.dataset.surfaceLaunch;

      closeSearch();
      launchApp(id);
      return;
    }

    if (button.id === "surfaceSearchClose") {
      event.preventDefault();
      event.stopImmediatePropagation();

      closeSearch();
      return;
    }

    if (button.id === "weatherButton" ||
        button.id === "macWeatherButton") {
      event.preventDefault();
      event.stopImmediatePropagation();

      openWeather();
      return;
    }

    if (button.id === "weatherClose") {
      event.preventDefault();
      event.stopImmediatePropagation();

      $("#weatherPanel")?.classList.remove("open");
      return;
    }

    if (button.id === "weatherUseLocation") {
      event.preventDefault();
      event.stopImmediatePropagation();

      useCurrentLocation();
    }
  }

  // Window capture runs before the app registry's document
  // capture handler. This is important for macOS Dock clicks.
  window.addEventListener("click", handleSurfaceClicks, true);

  window.addEventListener("keydown", event => {
    if (currentOS() !== "windows") return;

    if (
      event.metaKey &&
      event.key.toLowerCase() === "s"
    ) {
      event.preventDefault();
      openSearch();
    }

    if (
      searchPanel?.classList.contains("open") &&
      event.key === "Escape"
    ) {
      closeSearch();
    }

    if (
      searchPanel?.classList.contains("open") &&
      event.key === "Enter"
    ) {
      const first = searchResults?.querySelector(
        "[data-surface-launch]"
      );

      if (first) {
        const id = first.dataset.surfaceLaunch;

        closeSearch();
        launchApp(id);
      }
    }
  }, true);

  document.addEventListener("pointerdown", event => {
    if (
      searchPanel?.classList.contains("open") &&
      !searchPanel.contains(event.target) &&
      !event.target.closest("#taskSearch")
    ) {
      closeSearch();
    }
  });

  // --------------------------------------------------
  // INSTALLED APP CHANGES
  // --------------------------------------------------

  function observeLauncherChanges() {
    if (!("MutationObserver" in window)) return;

    const targets = [
      $("#windowsAppGrid"),
      $("#chromeAppGrid")
    ].filter(Boolean);

    if (!targets.length) return;

    const observer = new MutationObserver(() => {
      renderSurfaces();
    });

    targets.forEach(target => {
      observer.observe(target, {
        childList: true,
        subtree: true
      });
    });
  }

  function hookInstallAPI() {
    const api = window.SecuOSApps;

    if (!api || api.__surfaceRefreshHooked) return;

    api.__surfaceRefreshHooked = true;

    ["install", "uninstall"].forEach(method => {
      if (typeof api[method] !== "function") return;

      const original = api[method].bind(api);

      api[method] = (...args) => {
        const result = original(...args);

        renderSurfaces();

        return result;
      };
    });
  }

  // --------------------------------------------------
  // WEATHER
  // --------------------------------------------------

  function showWeatherMessage(message, icon = "ri-cloud-line") {
    const result = $("#weatherResult");

    if (!result) return;

    result.innerHTML = `
      <div class="surface-weather-state">
        <i class="${icon}"></i>
        <span>${escapeHTML(message)}</span>
      </div>
    `;
  }

  function describeWeather(code) {
    const descriptions = {
      0: "Clear sky",
      1: "Mainly clear",
      2: "Partly cloudy",
      3: "Overcast",
      45: "Fog",
      48: "Depositing rime fog",
      51: "Light drizzle",
      53: "Moderate drizzle",
      55: "Dense drizzle",
      56: "Freezing drizzle",
      57: "Dense freezing drizzle",
      61: "Light rain",
      63: "Moderate rain",
      65: "Heavy rain",
      71: "Light snow",
      73: "Moderate snow",
      75: "Heavy snow",
      77: "Snow grains",
      80: "Rain showers",
      81: "Moderate rain showers",
      82: "Heavy rain showers",
      85: "Snow showers",
      86: "Heavy snow showers",
      95: "Thunderstorm",
      96: "Thunderstorm with hail",
      99: "Severe thunderstorm"
    };

    return descriptions[code] || "Conditions unavailable";
  }

  async function loadWeather(latitude, longitude, place) {
    const result = $("#weatherResult");
    if (!result) return;

    const requestId = ++weatherRequest;

    $("#weatherPlace").textContent = place;

    showWeatherMessage(
      "Loading live weather…",
      "ri-loader-4-line"
    );

    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),

      current: [
        "temperature_2m",
        "apparent_temperature",
        "relative_humidity_2m",
        "weather_code",
        "wind_speed_10m"
      ].join(","),

      daily: [
        "temperature_2m_max",
        "temperature_2m_min"
      ].join(","),

      temperature_unit: "fahrenheit",
      wind_speed_unit: "mph",
      timezone: "auto",
      forecast_days: "3"
    });

    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?${params}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error(
          `Weather request failed (${response.status}).`
        );
      }

      const data = await response.json();

      if (requestId !== weatherRequest) return;

      const current = data.current;
      const daily = data.daily;

      if (!current || !daily?.time?.length) {
        throw new Error("The weather service returned incomplete data.");
      }

      result.innerHTML = `
        <div class="surface-weather-current">
          <div class="surface-weather-temperature">
            <i class="ri-sun-cloudy-line"></i>
            <strong>${Math.round(current.temperature_2m)}°</strong>
            <span>F</span>
          </div>

          <div class="surface-weather-description">
            <strong>${escapeHTML(describeWeather(current.weather_code))}</strong>
            <span>${escapeHTML(place)}</span>
          </div>
        </div>

        <div class="surface-weather-stats">
          <div>
            <i class="ri-temp-hot-line"></i>
            <span>Feels like</span>
            <strong>${Math.round(current.apparent_temperature)}°F</strong>
          </div>

          <div>
            <i class="ri-drop-line"></i>
            <span>Humidity</span>
            <strong>${Math.round(current.relative_humidity_2m)}%</strong>
          </div>

          <div>
            <i class="ri-windy-line"></i>
            <span>Wind</span>
            <strong>${Math.round(current.wind_speed_10m)} mph</strong>
          </div>
        </div>

        <div class="surface-weather-forecast">
          ${daily.time.map((day, index) => `
            <div>
              <span>
                ${new Date(`${day}T12:00:00`).toLocaleDateString([], {
                  weekday: "short"
                })}
              </span>

              <strong>
                ${Math.round(daily.temperature_2m_max[index])}°
              </strong>

              <small>
                ${Math.round(daily.temperature_2m_min[index])}°
              </small>
            </div>
          `).join("")}
        </div>
      `;

      const updated = $("#weatherUpdated");

      if (updated) {
        updated.textContent =
          `Updated ${new Date().toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit"
          })}`;
      }

      const briefing = $("#briefingWeather");

      if (briefing) {
        briefing.innerHTML = `
          <i class="ri-sun-cloudy-line"></i>
          <span>
            ${Math.round(current.temperature_2m)}°F ·
            ${escapeHTML(describeWeather(current.weather_code))} ·
            ${escapeHTML(place)}
          </span>
        `;
      }

      localStorage.setItem(
        "secuos-weather",
        JSON.stringify({
          latitude,
          longitude,
          place
        })
      );

    } catch (error) {
      if (requestId !== weatherRequest) return;

      showWeatherMessage(
        `${error.message} Try another city or check your connection.`,
        "ri-error-warning-line"
      );
    }
  }

  async function searchWeather(city) {
    const name = String(city || "").trim();

    if (!name) {
      showWeatherMessage(
        "Type a city name first.",
        "ri-map-pin-line"
      );

      $("#weatherCity")?.focus();

      return;
    }

    showWeatherMessage(
      `Finding ${name}…`,
      "ri-loader-4-line"
    );

    const params = new URLSearchParams({
      name,
      count: "1",
      language: "en",
      format: "json"
    });

    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?${params}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error(
        `Location search failed (${response.status}).`
      );
    }

    const data = await response.json();
    const location = data.results?.[0];

    if (!location) {
      throw new Error(`No matching city found for "${name}".`);
    }

    await loadWeather(
      location.latitude,
      location.longitude,
      [
        location.name,
        location.admin1,
        location.country
      ].filter(Boolean).join(", ")
    );
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      showWeatherMessage(
        "Location services are unavailable. Search for a city instead.",
        "ri-map-pin-line"
      );

      return;
    }

    showWeatherMessage(
      "Waiting for location permission…",
      "ri-loader-4-line"
    );

    navigator.geolocation.getCurrentPosition(
      position => {
        loadWeather(
          position.coords.latitude,
          position.coords.longitude,
          "Current location"
        );
      },

      error => {
        const message = error.code === 1
          ? "Location permission was denied. Search for a city instead."
          : "Could not determine your location. Search for a city instead.";

        showWeatherMessage(
          message,
          "ri-error-warning-line"
        );
      },

      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 300000
      }
    );
  }

  function openWeather() {
    const panel = $("#weatherPanel");
    if (!panel) return;

    document.querySelectorAll(".floating-panel.open")
      .forEach(item => item.classList.remove("open"));

    panel.classList.add("open");

    let saved = null;

    try {
      saved = JSON.parse(
        localStorage.getItem("secuos-weather") || "null"
      );
    } catch {
      saved = null;
    }

    if (
      saved &&
      Number.isFinite(Number(saved.latitude)) &&
      Number.isFinite(Number(saved.longitude))
    ) {
      loadWeather(
        Number(saved.latitude),
        Number(saved.longitude),
        saved.place || "Saved location"
      );

      return;
    }

    if (!weatherInitialized) {
      weatherInitialized = true;
      useCurrentLocation();
      return;
    }

    showWeatherMessage(
      "Search for a city or use your current location.",
      "ri-map-pin-line"
    );
  }

  // The form is handled here in capture phase so the old
  // weather form listener cannot compete with this one.
  window.addEventListener("submit", event => {
    if (event.target?.id !== "weatherForm") return;

    event.preventDefault();
    event.stopImmediatePropagation();

    searchWeather($("#weatherCity")?.value).catch(error => {
      showWeatherMessage(
        error.message || "Weather search failed.",
        "ri-error-warning-line"
      );
    });
  }, true);

  // --------------------------------------------------
  // CLOCK / BRIEFING
  // --------------------------------------------------

  function refreshClockBriefing() {
    const now = new Date();

    const weekday = $("#briefingWeekday");
    const date = $("#briefingDate");
    const time = $("#briefingTime");

    if (weekday) {
      weekday.textContent = now.toLocaleDateString([], {
        weekday: "long"
      });
    }

    if (date) {
      date.textContent = now.toLocaleDateString([], {
        month: "long",
        day: "numeric",
        year: "numeric"
      });
    }

    if (time) {
      time.textContent = now.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit"
      });
    }
  }

  // --------------------------------------------------
  // INITIALIZATION
  // --------------------------------------------------

  function init() {
    if (!refreshRegistry()) {
      window.addEventListener(
        "secuos:apps-ready",
        init,
        { once: true }
      );

      return;
    }

    createSearchPanel();
    renderSurfaces();
    hookInstallAPI();
    observeLauncherChanges();
    refreshClockBriefing();

    window.addEventListener("secuos:ready", renderSurfaces);

    window.addEventListener("secuos:apps-ready", () => {
      hookInstallAPI();
      renderSurfaces();
    });

    window.addEventListener("storage", event => {
      if (event.key === "secuos-installed-apps") {
        renderSurfaces();
      }
    });

    window.setInterval(refreshClockBriefing, 1000);

    console.info("[SecuOS] Desktop surfaces initialized.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, {
      once: true
    });
  } else {
    init();
  }
})();
