(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const STORAGE_KEY = "secuos-experience";

  function readSettings() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveSettings(values) {
    const settings = Object.assign(readSettings(), values);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {}

    return settings;
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function notify(title, message) {
    window.SecuDesktop?.notify(title, message);
  }

  // --------------------------------------------------
  // OS-SPECIFIC WALLPAPERS
  // --------------------------------------------------

  function currentOS() {
    return document.documentElement.dataset.os || "windows";
  }

  function wallpaperElement() {
    return $(".wallpaper");
  }

  function applyWallpaper() {
    const wallpaper = wallpaperElement();
    if (!wallpaper) return;

    const os = currentOS();
    const settings = readSettings();
    const saved = settings["wallpaper-" + os];

    if (saved) {
      wallpaper.style.backgroundImage =
        'linear-gradient(135deg, rgba(0,0,0,.12), rgba(0,0,0,.08)), url("' +
        saved +
        '")';
      return;
    }

    const backgrounds = {
      windows:
        "radial-gradient(ellipse at 72% 45%, #2763b7 0%, transparent 42%), linear-gradient(135deg, #101b36, #182c50 55%, #080e1c)",

      macos:
        "radial-gradient(ellipse at 25% 25%, #9caccb 0%, transparent 35%), radial-gradient(ellipse at 75% 70%, #334c75 0%, transparent 42%), linear-gradient(135deg, #18243c, #111827)",

      chrome:
        "radial-gradient(circle at 50% 35%, #6c91c9 0%, transparent 38%), linear-gradient(145deg, #182d48, #0b1728)"
    };

    wallpaper.style.backgroundImage = backgrounds[os] || backgrounds.windows;
  }

  function saveCurrentWallpaper(path) {
    if (!path) return;

    const os = currentOS();
    saveSettings({ ["wallpaper-" + os]: path });
    applyWallpaper();
  }

  function bindWallpapers() {
    $$(".wallpaper-picker [data-wallpaper]").forEach(button => {
      button.addEventListener("click", () => {
        saveCurrentWallpaper(button.dataset.wallpaper);
      });
    });

    $("#wallpaperUpload")?.addEventListener("change", event => {
      const file = event.target.files?.[0];

      if (!file || !file.type.startsWith("image/")) return;

      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result !== "string") return;
        saveCurrentWallpaper(reader.result);
        notify("Wallpaper updated", "Saved for this desktop environment.");
      };

      reader.readAsDataURL(file);
    });

    $$("[data-set-os]").forEach(button => {
      button.addEventListener("click", () => {
        setTimeout(applyWallpaper, 0);
      });
    });

    applyWallpaper();
  }

  // --------------------------------------------------
  // APPLICATION FRAMEWORK
  // --------------------------------------------------

  function closePanels() {
    $$(".floating-panel.open").forEach(panel => {
      panel.classList.remove("open");
    });
  }

  function showApp(title, icon, content) {
    $("#appWindowTitle").textContent = title;
    $("#appWindow .window-title i").className = icon;
    $("#appWindowContent").innerHTML = content;

    window.SecuWindowManager?.openWindow("appWindow");
  }

  // CALCULATOR

  function openCalculator() {
    showApp(
      "Calculator",
      "ri-calculator-line",
      `
        <div class="calculator">
          <div class="calc-display" id="calcDisplay">0</div>
          <div class="calc-keys">
            ${[
              "AC", "±", "%", "÷",
              "7", "8", "9", "×",
              "4", "5", "6", "−",
              "1", "2", "3", "+",
              "0", ".", "=", "⌫"
            ].map(key => `
              <button
                type="button"
                data-calc="${key}"
                class="${["÷", "×", "−", "+", "="].includes(key) ? "operator" : ""}"
              >${key}</button>
            `).join("")}
          </div>
        </div>
      `
    );

    let current = "0";
    let stored = null;
    let operator = null;
    let fresh = false;

    const display = $("#calcDisplay");

    function paint() {
      display.textContent =
        current.length > 14
          ? Number(current).toPrecision(9)
          : current;
    }

    $$(".calc-keys button").forEach(button => {
      button.addEventListener("click", () => {
        const key = button.dataset.calc;

        if (key === "AC") {
          current = "0";
          stored = null;
          operator = null;
          fresh = false;
        } else if (key === "⌫") {
          current = current.length > 1 ? current.slice(0, -1) : "0";
        } else if (key === "±") {
          current = String(Number(current) * -1);
        } else if (key === "%") {
          current = String(Number(current) / 100);
        } else if (["÷", "×", "−", "+"].includes(key)) {
          stored = Number(current);
          operator = key;
          fresh = true;
        } else if (key === "=" && operator) {
          const a = stored;
          const b = Number(current);

          const result =
            operator === "+" ? a + b :
            operator === "−" ? a - b :
            operator === "×" ? a * b :
            b === 0 ? NaN : a / b;

          current = Number.isFinite(result)
            ? String(Number(result.toPrecision(11)))
            : "Error";

          stored = null;
          operator = null;
          fresh = true;
        } else if (key === ".") {
          if (fresh) {
            current = "0.";
            fresh = false;
          } else if (!current.includes(".")) {
            current += ".";
          }
        } else if (/^\d$/.test(key)) {
          current = fresh || current === "0"
            ? key
            : current + key;

          fresh = false;
        }

        paint();
      });
    });
  }

  // NOTES

  function openNotes() {
    showApp(
      "Notes",
      "ri-sticky-note-line",
      `
        <div class="notes-app">
          <div class="notes-toolbar">
            <span><i class="ri-save-3-line"></i> Saved in this browser</span>
            <button id="notesClear">Clear</button>
          </div>

          <textarea
            id="notesText"
            placeholder="Start writing your notes..."
          ></textarea>

          <div class="notes-status" id="notesStatus">
            Autosave is on
          </div>
        </div>
      `
    );

    const area = $("#notesText");
    area.value = readSettings().notes || "";

    let timer;

    area.addEventListener("input", () => {
      clearTimeout(timer);
      $("#notesStatus").textContent = "Saving…";

      timer = setTimeout(() => {
        saveSettings({ notes: area.value });
        $("#notesStatus").textContent = "Saved";
      }, 250);
    });

    $("#notesClear").addEventListener("click", () => {
      if (!area.value || !confirm("Clear all notes?")) return;

      area.value = "";
      saveSettings({ notes: "" });
      $("#notesStatus").textContent = "Notes cleared";
    });
  }

  // CALENDAR

  function openCalendar() {
    const state = {
      year: new Date().getFullYear(),
      month: new Date().getMonth()
    };

    function render() {
      const first = new Date(state.year, state.month, 1);
      const year = first.getFullYear();
      const month = first.getMonth();
      const offset = first.getDay();
      const count = new Date(year, month + 1, 0).getDate();
      const today = new Date();

      const cells = [];

      for (let i = 0; i < offset; i++) {
        cells.push('<span class="calendar-empty"></span>');
      }

      for (let day = 1; day <= count; day++) {
        const isToday =
          day === today.getDate() &&
          month === today.getMonth() &&
          year === today.getFullYear();

        cells.push(`
          <button
            class="${isToday ? "today" : ""}"
            data-day="${day}"
          >${day}</button>
        `);
      }

      showApp(
        "Calendar",
        "ri-calendar-2-line",
        `
          <div class="calendar-app">
            <div class="calendar-toolbar">
              <button id="calPrev"><i class="ri-arrow-left-s-line"></i></button>
              <strong>
                ${first.toLocaleDateString([], {
                  month: "long",
                  year: "numeric"
                })}
              </strong>
              <button id="calNext"><i class="ri-arrow-right-s-line"></i></button>
            </div>

            <div class="calendar-grid calendar-weekdays">
              ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
                .map(day => `<span>${day}</span>`).join("")}
            </div>

            <div class="calendar-grid">${cells.join("")}</div>

            <p class="calendar-hint" id="calendarHint">
              Select a date to view it.
            </p>
          </div>
        `
      );

      $("#calPrev").addEventListener("click", () => {
        state.month--;
        render();
      });

      $("#calNext").addEventListener("click", () => {
        state.month++;
        render();
      });

      $$("[data-day]").forEach(button => {
        button.addEventListener("click", () => {
          $("#calendarHint").textContent =
            new Date(year, month, Number(button.dataset.day))
              .toLocaleDateString([], {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric"
              });
        });
      });
    }

    render();
  }

  // FILES

  function openFiles() {
    showApp(
      "Files",
      "ri-folder-3-line",
      `
        <div class="files-app">
          <div class="files-toolbar">
            <div><i class="ri-hard-drive-2-line"></i> This browser session</div>

            <label class="primary-button file-pick">
              Choose files
              <input id="filePicker" type="file" multiple hidden>
            </label>
          </div>

          <p class="files-note">
            Files you select are listed here for this session.
            SecuOS does not upload them.
          </p>

          <div class="file-list" id="fileList">
            <div class="file-empty">
              <i class="ri-folder-open-line"></i>
              <span>No files selected</span>
            </div>
          </div>
        </div>
      `
    );

    $("#filePicker").addEventListener("change", event => {
      const files = [...event.target.files];

      $("#fileList").innerHTML = files.length
        ? files.map(file => `
            <div class="file-row">
              <i class="ri-file-line"></i>
              <span>${escapeHTML(file.name)}</span>
              <small>${file.size.toLocaleString()} bytes</small>
            </div>
          `).join("")
        : '<div class="file-empty">No files selected</div>';
    });
  }

  // CLOCK

  function openClock() {
    function render() {
      const now = new Date();

      showApp(
        "Clock",
        "ri-time-line",
        `
          <div class="clock-app">
            <div class="clock-face">
              ${now.toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit"
              })}
            </div>

            <div>
              ${now.toLocaleDateString([], {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric"
              })}
            </div>

            <p>Local device time</p>
          </div>
        `
      );
    }

    render();

    const timer = setInterval(() => {
      if ($("#appWindow").hidden ||
          $("#appWindowTitle").textContent !== "Clock") {
        clearInterval(timer);
        return;
      }

      render();
    }, 15000);
  }

  const applications = {
    calculator: openCalculator,
    notes: openNotes,
    calendar: openCalendar,
    files: openFiles,
    clock: openClock
  };

  function openApp(name) {
    const app = applications[String(name || "").toLowerCase()];

    if (!app) {
      notify("Application unavailable", "This application is not installed.");
      return;
    }

    closePanels();
    app();
  }

  function bindApplications() {
    const groups = [
      ".desktop-icon",
      ".pinned-grid [data-app]",
      ".launcher-grid [data-app]",
      ".dock-icon[data-app]",
      ".shelf-apps [data-app]"
    ];

    groups.forEach(selector => {
      $$(selector).forEach(element => {
        if (element.dataset.appBound === "true") return;

        const app =
          element.dataset.app ||
          (element.dataset.icon === "files" ? "files" : null);

        if (!app) return;

        element.dataset.appBound = "true";
        element.addEventListener("click", () => openApp(app));
      });
    });
  }

  // --------------------------------------------------
  // WEATHER
  // --------------------------------------------------

  function weatherCondition(code) {
    if (code === 0) return ["Clear sky", "ri-sun-line"];
    if ([1, 2, 3].includes(code)) return ["Partly cloudy", "ri-sun-cloudy-line"];
    if ([45, 48].includes(code)) return ["Fog", "ri-mist-line"];
    if ([51, 53, 55, 56, 57].includes(code)) return ["Drizzle", "ri-drizzle-line"];
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return ["Rain", "ri-rainy-line"];
    if ([71, 73, 75, 77, 85, 86].includes(code)) return ["Snow", "ri-snowy-line"];
    if ([95, 96, 99].includes(code)) return ["Thunderstorms", "ri-thunderstorms-line"];

    return ["Conditions unavailable", "ri-cloud-line"];
  }

  async function loadWeather(latitude, longitude, place) {
    const result = $("#weatherResult");

    $("#weatherPlace").textContent = place;
    result.innerHTML = '<div class="weather-loading"><i class="ri-loader-4-line"></i> Loading forecast…</div>';

    try {
      const url =
        "https://api.open-meteo.com/v1/forecast" +
        "?latitude=" + encodeURIComponent(latitude) +
        "&longitude=" + encodeURIComponent(longitude) +
        "&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m" +
        "&daily=temperature_2m_max,temperature_2m_min" +
        "&temperature_unit=fahrenheit" +
        "&wind_speed_unit=mph" +
        "&timezone=auto&forecast_days=3";

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Weather service returned " + response.status);
      }

      const data = await response.json();
      const current = data.current;
      const daily = data.daily;
      const condition = weatherCondition(current.weather_code);

      result.innerHTML = `
        <div class="weather-current">
          <i class="${condition[1]}"></i>
          <div>
            <strong>${Math.round(current.temperature_2m)}°F</strong>
            <span>${condition[0]}</span>
          </div>
        </div>

        <div class="weather-stats">
          <div>
            <span>Feels like</span>
            <strong>${Math.round(current.apparent_temperature)}°F</strong>
          </div>
          <div>
            <span>Humidity</span>
            <strong>${current.relative_humidity_2m}%</strong>
          </div>
          <div>
            <span>Wind</span>
            <strong>${Math.round(current.wind_speed_10m)} mph</strong>
          </div>
        </div>

        <div class="weather-days">
          ${daily.time.map((day, index) => `
            <div>
              <span>${new Date(day + "T12:00:00").toLocaleDateString([], {
                weekday: "short"
              })}</span>
              <strong>${Math.round(daily.temperature_2m_max[index])}°</strong>
              <small>${Math.round(daily.temperature_2m_min[index])}°</small>
            </div>
          `).join("")}
        </div>
      `;

      $("#weatherUpdated").textContent =
        "Updated " + new Date().toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit"
        }) + " · Open-Meteo";

      saveSettings({
        weatherPlace: place,
        weatherCoords: [latitude, longitude]
      });
    } catch (error) {
      result.innerHTML = `
        <div class="weather-error">
          <i class="ri-wifi-off-line"></i>
          <strong>Could not load weather</strong>
          <span>${escapeHTML(error.message)}</span>
        </div>
      `;
    }
  }

  async function searchWeather(city) {
    const name = city.trim();
    if (!name) return;

    $("#weatherResult").textContent = "Finding location…";

    try {
      const response = await fetch(
        "https://geocoding-api.open-meteo.com/v1/search?name=" +
        encodeURIComponent(name) +
        "&count=1&language=en&format=json"
      );

      if (!response.ok) throw new Error("Location search failed.");

      const data = await response.json();

      if (!data.results?.length) {
        throw new Error("No matching city found.");
      }

      const place = data.results[0];

      await loadWeather(
        place.latitude,
        place.longitude,
        [place.name, place.admin1, place.country]
          .filter(Boolean)
          .join(", ")
      );
    } catch (error) {
      $("#weatherResult").textContent = error.message;
    }
  }

  function openWeather() {
    closePanels();
    $("#weatherPanel").classList.add("open");

    const saved = readSettings();

    if (saved.weatherCoords) {
      loadWeather(
        saved.weatherCoords[0],
        saved.weatherCoords[1],
        saved.weatherPlace || "Saved location"
      );
    }
  }

  function bindWeather() {
    ["#weatherButton", "#macWeatherButton", "#chromeWeatherButton"]
      .forEach(selector => {
        $(selector)?.addEventListener("click", openWeather);
      });

    $("#weatherClose")?.addEventListener("click", () => {
      $("#weatherPanel").classList.remove("open");
    });

    $("#weatherForm")?.addEventListener("submit", event => {
      event.preventDefault();
      searchWeather($("#weatherCity").value);
    });

    $("#weatherUseLocation")?.addEventListener("click", () => {
      if (!navigator.geolocation) {
        $("#weatherResult").textContent =
          "Location is unavailable in this browser.";
        return;
      }

      $("#weatherResult").textContent =
        "Waiting for location permission…";

      navigator.geolocation.getCurrentPosition(
        position => {
          loadWeather(
            position.coords.latitude,
            position.coords.longitude,
            "Current location"
          );
        },
        error => {
          $("#weatherResult").textContent =
            error.code === 1
              ? "Location permission was not granted. Search by city instead."
              : "Could not determine location. Search by city instead.";
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    });
  }

  // --------------------------------------------------
  // POWER CONTROLS
  // --------------------------------------------------

  function bindPower() {
    $$("#appleMenu button").forEach(button => {
      const label = button.textContent.trim().toLowerCase();

      if (label === "sleep") button.dataset.power = "sleep";
      if (label === "restart") button.dataset.power = "restart";
      if (label === "shut down") button.dataset.power = "shutdown";
    });

    $$("[data-power]").forEach(button => {
      button.addEventListener("click", () => {
        const action = button.dataset.power;

        $("#powerMenu")?.classList.remove("open");
        $("#appleMenu")?.classList.remove("open");

        if (action === "lock") {
          window.SecuOSBoot?.lock();
        }

        if (action === "sleep") {
          $("#secu-sleep-screen").classList.add("active");
        }

        if (action === "restart" && confirm("Restart SecuOS?")) {
          window.SecuOSBoot?.restart();
        }

        if (action === "shutdown" && confirm("Shut down SecuOS?")) {
          window.SecuOSBoot?.shutdown();
        }
      });
    });

    const wake = () => {
      $("#secu-sleep-screen")?.classList.remove("active");
    };

    $("#secu-sleep-screen")?.addEventListener("click", wake);

    document.addEventListener("keydown", event => {
      if ($("#secu-sleep-screen")?.classList.contains("active")) {
        event.preventDefault();
        wake();
      }
    });
  }

  // --------------------------------------------------
  // STARTUP SETTINGS
  // --------------------------------------------------

  function bindStartupSettings() {
    const skip = $("#skipBootToggle");

    if (skip) {
      skip.checked =
        localStorage.getItem("secuos-skip-boot") === "true";

      skip.addEventListener("change", () => {
        localStorage.setItem(
          "secuos-skip-boot",
          String(skip.checked)
        );

        notify(
          "Startup preference saved",
          skip.checked
            ? "The animated startup will be skipped next time."
            : "The full startup sequence will run next time."
        );
      });
    }

    const login = $("#startupLoginToggle");

    if (login) {
      login.checked =
        localStorage.getItem("secuos-startup-login") !== "false";

      login.addEventListener("change", () => {
        localStorage.setItem(
          "secuos-startup-login",
          String(login.checked)
        );

        notify(
          "Login preference saved",
          "This setting applies the next time SecuOS starts."
        );
      });
    }

    const diagnostics = $("#bootDiagnosticsToggle");

    if (diagnostics) {
      diagnostics.checked =
        localStorage.getItem("secuos-diagnostics") !== "false";

      diagnostics.addEventListener("change", () => {
        localStorage.setItem(
          "secuos-diagnostics",
          String(diagnostics.checked)
        );
      });
    }
  }

  // --------------------------------------------------
  // SEARCH
  // --------------------------------------------------

  function bindAppSearch() {
    $$(".start-search input, .launcher-search input").forEach(input => {
      input.addEventListener("input", () => {
        const query = input.value.trim().toLowerCase();
        const container = input.closest(".start-menu, .chrome-launcher");

        if (!container) return;

        $$(".pinned-grid > div, .launcher-grid > div", container)
          .forEach(item => {
            item.hidden =
              !item.textContent.toLowerCase().includes(query);
          });
      });
    });
  }

  // --------------------------------------------------
  // INITIALIZATION
  // --------------------------------------------------

  function init() {
    bindWallpapers();
    bindApplications();
    bindWeather();
    bindPower();
    bindStartupSettings();
    bindAppSearch();

    window.addEventListener("secuos:ready", bindApplications);

    window.SecuOSApps = {
      open: openApp,
      list: Object.keys(applications)
    };

    window.SecuOSWeather = {
      open: openWeather,
      search: searchWeather
    };

    window.SecuOSPower = {
      lock: () => window.SecuOSBoot?.lock(),
      sleep: () => $("#secu-sleep-screen").classList.add("active"),
      restart: () => window.SecuOSBoot?.restart(),
      shutdown: () => window.SecuOSBoot?.shutdown()
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
