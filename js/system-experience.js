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
  const mailKey = "secuos-mail-drafts";
  const chatKey = "secuos-local-chat";

  let cameraStream = null;
  let calculatorValue = "0";
  let calculatorStored = null;
  let calculatorOperator = null;
  let calculatorFresh = false;

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
    { id: "gfort", name: "GFort", icon: "ri-gamepad-line", description: "Choose a future game library.", core: false },
    { id: "interwebz", name: "InterWebz", icon: "ri-global-line", description: "Browser interface. Server connection pending.", core: false },
    { id: "popcorner", name: "Popcorner", icon: "ri-movie-2-line", description: "Browse your local video library.", core: false },
    { id: "scar", name: "Scar", icon: "ri-sparkling-2-line", description: "AI interface. Provider connection pending.", core: false },
    { id: "mail", name: "Mail", icon: "ri-mail-line", description: "Manage local drafts.", core: false },
    { id: "chat", name: "Chat", icon: "ri-message-3-line", description: "Local chat workspace.", core: false }
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

  function launch(id, options = {}) {
    if (!isInstalled(id)) {
      notify("App not installed", "Install this app from the Apps manager first.");
      return;
    }

    if (id === "settings") {
      window.openSecuSettings?.();
      return;
    }

    const handler = appHandlers[id];

    if (!handler) {
      notify("App unavailable", "This app does not have a launch handler.");
      return;
    }

    document.querySelectorAll(".floating-panel.open").forEach(panel => {
      panel.classList.remove("open");
    });

    handler(options);
  }

  const appHandlers = {
    files: () => window.SecuFileSystem.renderFiles(),
    trash: () => window.SecuFileSystem.renderFiles({ trash: true }),
    gallery: openGallery,
    calendar: openCalendar,
    notepad: openNotepad,
    calculator: openCalculator,
    clock: openClock,
    terminal: openTerminal,
    apps: openAppsManager,
    quickbar: openQuickBar,
    camera: openCamera,
    soundie: openSoundie,
    gfort: openGFort,
    interwebz: openInterWebz,
    popcorner: openPopcorner,
    scar: openScar,
    mail: openMail,
    chat: openChat
  };

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
  // GALLERY
  // --------------------------------------------------

  async function openGallery(options = {}) {
    const all = await window.SecuFileSystem.getAll();
    const images = all.filter(item =>
      !item.deletedAt && item.type?.startsWith("image/")
    );

    showApp("gallery", `
      <div class="gallery-app">
        <div class="app-toolbar">
          <div>
            <h2>Gallery</h2>
            <p>Your images saved in SecuOS Files.</p>
          </div>
          <button class="primary-button" id="galleryUpload">
            <i class="ri-upload-2-line"></i> Upload images
          </button>
          <input type="file" id="galleryUploadInput" accept="image/*" multiple hidden>
        </div>

        <div class="gallery-grid" id="galleryGrid">
          ${images.length ? images.map(image => `
            <button class="gallery-card" data-gallery-id="${image.id}">
              <img src="${URL.createObjectURL(image.blob)}" alt="${escapeHTML(image.name)}">
              <span>${escapeHTML(image.name)}</span>
            </button>
          `).join("") : `
            <div class="app-empty">
              <i class="ri-image-line"></i>
              <strong>Your gallery is empty</strong>
              <span>Upload images here or add them through Files.</span>
            </div>
          `}
        </div>

        <div id="galleryPreview" class="gallery-preview" hidden></div>
      </div>
    `, {
      afterRender: () => {
        const input = $("#galleryUploadInput");

        $("#galleryUpload")?.addEventListener("click", () => input.click());

        input?.addEventListener("change", async () => {
          await window.SecuFileSystem.addFiles(input.files, "Images");
          openGallery();
          notify("Gallery updated", "Your uploaded images are now saved in Files.");
        });

        $("#galleryGrid")?.addEventListener("click", async event => {
          const card = event.target.closest("[data-gallery-id]");
          if (!card) return;

          const item = await window.SecuFileSystem.get(card.dataset.galleryId);
          if (!item) return;

          const preview = $("#galleryPreview");
          preview.hidden = false;
          preview.innerHTML = `
            <div class="gallery-preview-toolbar">
              <strong>${escapeHTML(item.name)}</strong>
              <button id="gallerySetWallpaper"><i class="ri-image-edit-line"></i> Set wallpaper</button>
              <button id="galleryDownload"><i class="ri-download-line"></i> Download</button>
              <button id="galleryClosePreview"><i class="ri-close-line"></i></button>
            </div>
            <img src="${URL.createObjectURL(item.blob)}" alt="${escapeHTML(item.name)}">
          `;

          $("#gallerySetWallpaper").addEventListener("click", () => {
            const url = URL.createObjectURL(item.blob);
            window.SecuSettings?.setWallpaper(url);
            notify("Wallpaper changed", "Your selected image is now the desktop wallpaper.");
          });

          $("#galleryDownload").addEventListener("click", () => {
            window.SecuFileSystem.download(item.id);
          });

          $("#galleryClosePreview").addEventListener("click", () => {
            preview.hidden = true;
            preview.innerHTML = "";
          });
        });

        if (options.selectedId) {
          setTimeout(() => {
            $(`[data-gallery-id="${options.selectedId}"]`)?.click();
          }, 0);
        }
      }
    });
  }

  // --------------------------------------------------
  // NOTEPAD
  // --------------------------------------------------

  function openNotepad(options = {}) {
    showApp("notepad", `
      <div class="notepad-app">
        <div class="notepad-toolbar">
          <span><i class="ri-save-3-line"></i> Autosave enabled</span>
          <span id="notepadStatus">Saved</span>
          <button id="notepadNew"><i class="ri-file-add-line"></i> New</button>
          <button id="notepadDownload"><i class="ri-download-line"></i> Download</button>
        </div>
        <input id="notepadFilename" value="${escapeHTML(options.filename || "Untitled.txt")}" aria-label="Filename">
        <textarea id="notepadText" spellcheck="true" placeholder="Start writing..."></textarea>
      </div>
    `, {
      afterRender: () => {
        const area = $("#notepadText");
        const filename = $("#notepadFilename");
        const status = $("#notepadStatus");

        area.value = options.text ?? localStorage.getItem(notesKey) ?? "";

        let timer;
        area.addEventListener("input", () => {
          status.textContent = "Saving…";
          clearTimeout(timer);

          timer = setTimeout(() => {
            localStorage.setItem(notesKey, area.value);
            status.textContent = "Saved";
          }, 250);
        });

        $("#notepadNew").addEventListener("click", () => {
          if (area.value && !confirm("Start a new note?")) return;
          area.value = "";
          filename.value = "Untitled.txt";
          localStorage.setItem(notesKey, "");
          status.textContent = "New note";
        });

        $("#notepadDownload").addEventListener("click", () => {
          const blob = new Blob([area.value], { type: "text/plain" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = filename.value.trim() || "Untitled.txt";
          link.click();
          URL.revokeObjectURL(url);
        });
      }
    });
  }

  // --------------------------------------------------
  // CALCULATOR
  // --------------------------------------------------

  function openCalculator() {
    calculatorValue = "0";
    calculatorStored = null;
    calculatorOperator = null;
    calculatorFresh = false;

    showApp("calculator", `
      <div class="calculator-app">
        <div class="calculator-display" id="calcDisplay">0</div>
        <div class="calculator-keys">
          ${["AC","±","%","÷","7","8","9","×","4","5","6","−","1","2","3","+","0",".","⌫","="]
            .map(key => `<button data-calc="${key}" class="${["÷","×","−","+","="].includes(key) ? "operator" : ""}">${key}</button>`)
            .join("")}
        </div>
      </div>
    `, {
      afterRender: () => {
        $("#appWindowContent").querySelector(".calculator-keys").addEventListener("click", event => {
          const button = event.target.closest("[data-calc]");
          if (!button) return;

          const key = button.dataset.calc;

          if (key === "AC") {
            calculatorValue = "0";
            calculatorStored = null;
            calculatorOperator = null;
            calculatorFresh = false;
          } else if (key === "⌫") {
            calculatorValue = calculatorValue.length > 1
              ? calculatorValue.slice(0, -1)
              : "0";
          } else if (key === "±") {
            calculatorValue = String(Number(calculatorValue) * -1);
          } else if (key === "%") {
            calculatorValue = String(Number(calculatorValue) / 100);
          } else if (["÷","×","−","+"].includes(key)) {
            calculatorStored = Number(calculatorValue);
            calculatorOperator = key;
            calculatorFresh = true;
          } else if (key === "=" && calculatorOperator) {
            const a = calculatorStored;
            const b = Number(calculatorValue);
            let result;

            if (calculatorOperator === "+") result = a + b;
            if (calculatorOperator === "−") result = a - b;
            if (calculatorOperator === "×") result = a * b;
            if (calculatorOperator === "÷") result = b === 0 ? NaN : a / b;

            calculatorValue = Number.isFinite(result)
              ? String(Number(result.toPrecision(11)))
              : "Error";

            calculatorStored = null;
            calculatorOperator = null;
            calculatorFresh = true;
          } else if (key === ".") {
            if (calculatorFresh) {
              calculatorValue = "0.";
              calculatorFresh = false;
            } else if (!calculatorValue.includes(".")) {
              calculatorValue += ".";
            }
          } else if (/^\d$/.test(key)) {
            calculatorValue = calculatorFresh || calculatorValue === "0"
              ? key
              : calculatorValue + key;
            calculatorFresh = false;
          }

          $("#calcDisplay").textContent = calculatorValue;
        });
      }
    });
  }

  // --------------------------------------------------
  // CALENDAR
  // --------------------------------------------------

  function getEvents() {
    return readJSON(calendarKey, []);
  }

  function saveEvents(events) {
    writeJSON(calendarKey, events);
  }

  function openCalendar() {
    const now = new Date();
    const state = { year: now.getFullYear(), month: now.getMonth(), selected: now.toISOString().slice(0, 10) };

    function render() {
      const first = new Date(state.year, state.month, 1);
      const count = new Date(state.year, state.month + 1, 0).getDate();
      const offset = first.getDay();
      const cells = [];

      for (let i = 0; i < offset; i++) cells.push("<span></span>");

      for (let day = 1; day <= count; day++) {
        const date = `${state.year}-${String(state.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const today = date === now.toISOString().slice(0, 10);
        const selected = date === state.selected;
        const hasEvent = getEvents().some(item => item.date === date);

        cells.push(`
          <button class="${today ? "today" : ""} ${selected ? "selected" : ""} ${hasEvent ? "has-event" : ""}" data-date="${date}">
            ${day}
          </button>
        `);
      }

      const events = getEvents().filter(item => item.date === state.selected);

      showApp("calendar", `
        <div class="calendar-app">
          <div class="calendar-toolbar">
            <button id="calendarPrev"><i class="ri-arrow-left-s-line"></i></button>
            <strong>${first.toLocaleDateString([], { month: "long", year: "numeric" })}</strong>
            <button id="calendarNext"><i class="ri-arrow-right-s-line"></i></button>
          </div>
          <div class="calendar-grid calendar-weekdays">
            ${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(day => `<span>${day}</span>`).join("")}
          </div>
          <div class="calendar-grid">${cells.join("")}</div>
          <div class="calendar-events">
            <div class="calendar-events-heading">
              <strong>${new Date(state.selected + "T12:00:00").toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</strong>
              <button id="calendarAddEvent"><i class="ri-add-line"></i> Add event</button>
            </div>
            ${events.length ? events.map(item => `
              <div class="calendar-event">
                <span class="calendar-event-dot"></span>
                <div><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.time || "All day")}</small></div>
                <button data-remove-event="${item.id}" title="Delete event"><i class="ri-delete-bin-line"></i></button>
              </div>
            `).join("") : `<div class="calendar-no-events">Nothing scheduled for this day.</div>`}
          </div>
        </div>
      `, {
        afterRender: () => {
          $("#calendarPrev").addEventListener("click", () => {
            state.month--;
            if (state.month < 0) { state.month = 11; state.year--; }
            render();
          });

          $("#calendarNext").addEventListener("click", () => {
            state.month++;
            if (state.month > 11) { state.month = 0; state.year++; }
            render();
          });

          $$(".calendar-grid [data-date]").forEach(button => {
            button.addEventListener("click", () => {
              state.selected = button.dataset.date;
              render();
            });
          });

          $("#calendarAddEvent").addEventListener("click", () => {
            const name = prompt("Event name:");
            if (!name?.trim()) return;
            const time = prompt("Event time (optional):", "All day") || "All day";
            const eventsNow = getEvents();

            eventsNow.push({
              id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
              title: name.trim(),
              date: state.selected,
              time
            });

            saveEvents(eventsNow);
            render();
            renderBriefing();
          });

          $$("[data-remove-event]").forEach(button => {
            button.addEventListener("click", () => {
              saveEvents(getEvents().filter(item => item.id !== button.dataset.removeEvent));
              render();
              renderBriefing();
            });
          });
        }
      });
    }

    render();
  }

  // --------------------------------------------------
  // CLOCK AND WINDOWS BRIEFING
  // --------------------------------------------------

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

  function openClock() {
    showApp("clock", `
      <div class="clock-app">
        <div class="clock-app-time" id="clockAppTime"></div>
        <div class="clock-app-date" id="clockAppDate"></div>
        <div class="clock-app-note">Local device time</div>
      </div>
    `);

    const update = () => {
      if ($("#appWindowTitle")?.textContent !== "Clock") return;
      $("#clockAppTime").textContent = new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        second: localStorage.getItem("secuos-seconds") === "true" ? "2-digit" : undefined
      });
      $("#clockAppDate").textContent = new Date().toLocaleDateString([], {
        weekday: "long", month: "long", day: "numeric", year: "numeric"
      });
    };

    update();
    const timer = setInterval(() => {
      if ($("#appWindow")?.hidden || $("#appWindowTitle")?.textContent !== "Clock") {
        clearInterval(timer);
        return;
      }
      update();
    }, 1000);
  }

  setInterval(() => {
    if ($("#clockBriefing")?.classList.contains("open")) renderBriefing();
  }, 15000);

  // --------------------------------------------------
  // TERMINAL
  // --------------------------------------------------

  function openTerminal() {
    showApp("terminal", `
      <div class="terminal-app">
        <div class="terminal-output" id="terminalOutput">
          <div>SecuOS Terminal [local shell]</div>
          <div>Type <strong>help</strong> to see available commands.</div>
        </div>
        <form id="terminalForm" class="terminal-input-row">
          <span>user@secuos:~$</span>
          <input id="terminalInput" autocomplete="off" spellcheck="false" autofocus>
        </form>
      </div>
    `, {
      afterRender: () => {
        const output = $("#terminalOutput");
        const input = $("#terminalInput");

        function print(value) {
          const line = document.createElement("div");
          line.textContent = value;
          output.appendChild(line);
          output.scrollTop = output.scrollHeight;
        }

        $("#terminalForm").addEventListener("submit", event => {
          event.preventDefault();

          const command = input.value.trim();
          if (!command) return;

          print(`user@secuos:~$ ${command}`);
          input.value = "";

          const [name, ...args] = command.split(/\s+/);
          const argument = args.join(" ");

          switch (name.toLowerCase()) {
            case "help":
              print("help, clear, date, time, whoami, about, apps, echo [text], open [app]");
              break;
            case "clear":
              output.innerHTML = "";
              break;
            case "date":
              print(new Date().toDateString());
              break;
            case "time":
              print(new Date().toLocaleTimeString());
              break;
            case "whoami":
              print(localStorage.getItem("secuos-username") || "user");
              break;
            case "about":
              print("SecuOS browser desktop environment.");
              break;
            case "apps":
              print(apps.map(app => app.name).join(" · "));
              break;
            case "echo":
              print(argument);
              break;
            case "open": {
              const match = apps.find(app =>
                app.id === argument.toLowerCase() ||
                app.name.toLowerCase() === argument.toLowerCase()
              );
              if (match) {
                launch(match.id);
              } else {
                print("App not found. Use 'apps' to see installed apps.");
              }
              break;
            }
            default:
              print(`Command not found: ${name}. Type 'help'.`);
          }
        });

        input.focus();
      }
    });
  }

  // --------------------------------------------------
  // APPS MANAGER
  // --------------------------------------------------

  function openAppsManager() {
    showApp("apps", `
      <div class="apps-manager">
        <div class="app-toolbar">
          <div><h2>Applications</h2><p>Manage the applications available on this desktop.</p></div>
          <span class="apps-count">${getInstalled().length} installed</span>
        </div>
        <div class="apps-manager-grid">
          ${apps.map(app => {
            const installed = isInstalled(app.id);
            return `
              <article class="apps-manager-card">
                <div class="app-launcher-icon"><i class="${app.icon}"></i></div>
                <div class="apps-manager-info">
                  <strong>${escapeHTML(app.name)}</strong>
                  <span>${escapeHTML(app.description)}</span>
                </div>
                <button data-app-toggle="${app.id}" ${app.core ? "disabled" : ""}>
                  ${app.core ? "System app" : installed ? "Uninstall" : "Install"}
                </button>
              </article>
            `;
          }).join("")}
        </div>
      </div>
    `, {
      afterRender: () => {
        $$("[data-app-toggle]").forEach(button => {
          button.addEventListener("click", () => {
            const app = appInfo(button.dataset.appToggle);
            if (!app || app.core) return;

            setInstalled(app.id, !isInstalled(app.id));
            openAppsManager();
          });
        });
      }
    });
  }

  // --------------------------------------------------
  // QUICK BAR
  // --------------------------------------------------

  function openQuickBar() {
    const favorites = ["files", "gallery", "calendar", "notepad", "calculator", "soundie"];

    showApp("quickbar", `
      <div class="quickbar-app">
        <div class="app-toolbar">
          <div><h2>Quick Bar</h2><p>Your frequently used applications.</p></div>
        </div>
        <div class="quickbar-grid">
          ${favorites.map(id => appInfo(id)).filter(Boolean).map(app => appCard(app, "quickbar-launcher")).join("")}
        </div>
      </div>
    `);
  }

  // --------------------------------------------------
  // CAMERA
  // --------------------------------------------------

  async function openCamera() {
    showApp("camera", `
      <div class="camera-app">
        <div class="camera-stage">
          <video id="cameraVideo" autoplay playsinline></video>
          <div class="camera-placeholder" id="cameraPlaceholder">
            <i class="ri-camera-line"></i>
            <strong>Camera preview</strong>
            <span>Allow camera access to begin.</span>
          </div>
        </div>
        <div class="camera-controls">
          <button class="primary-button" id="cameraStart"><i class="ri-camera-line"></i> Start camera</button>
          <button id="cameraCapture" disabled><i class="ri-circle-fill"></i> Capture</button>
          <button id="cameraStop" disabled><i class="ri-stop-circle-line"></i> Stop</button>
        </div>
        <p class="camera-note">Camera access stays in this browser tab. Captures are saved to Files.</p>
      </div>
    `, {
      afterRender: () => {
        const video = $("#cameraVideo");
        const placeholder = $("#cameraPlaceholder");
        const start = $("#cameraStart");
        const capture = $("#cameraCapture");
        const stop = $("#cameraStop");

        start.addEventListener("click", async () => {
          try {
            cameraStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false
            });

            video.srcObject = cameraStream;
            placeholder.hidden = true;
            capture.disabled = false;
            stop.disabled = false;
          } catch (error) {
            notify("Camera unavailable", error.message || "Camera permission was not granted.");
          }
        });

        capture.addEventListener("click", async () => {
          if (!video.videoWidth) return;

          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          canvas.getContext("2d").drawImage(video, 0, 0);

          canvas.toBlob(async blob => {
            if (!blob) return;

            const file = new File(
              [blob],
              `SecuOS-Capture-${Date.now()}.png`,
              { type: "image/png" }
            );

            await window.SecuFileSystem.addFiles([file], "Images");
            notify("Photo saved", "Your capture is now in Files and Gallery.");
          }, "image/png");
        });

        stop.addEventListener("click", stopCamera);
      }
    });
  }

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      cameraStream = null;
    }
  }

  $("#appWindow")?.addEventListener("click", event => {
    if (event.target.closest("[data-window-close]")) stopCamera();
  });

  // --------------------------------------------------
  // SOUNDIE
  // --------------------------------------------------

  async function openSoundie(options = {}) {
    const all = await window.SecuFileSystem.getAll();
    const tracks = all.filter(item =>
      !item.deletedAt && item.type?.startsWith("audio/")
    );

    showApp("soundie", `
      <div class="soundie-app">
        <div class="app-toolbar">
          <div><h2>Soundie</h2><p>Play audio saved in your Files library.</p></div>
          <button class="primary-button" id="soundieRefresh"><i class="ri-refresh-line"></i> Refresh</button>
        </div>
        <div class="soundie-player">
          <div class="soundie-art"><i class="ri-music-2-fill"></i></div>
          <strong id="soundieTitle">Choose a track</strong>
          <audio id="soundieAudio" controls></audio>
        </div>
        <div class="soundie-track-list">
          ${tracks.length ? tracks.map(track => `
            <button data-track-id="${track.id}">
              <i class="ri-music-2-line"></i>
              <span>${escapeHTML(track.name)}</span>
              <small>${window.SecuFileSystem.formatBytes(track.size)}</small>
            </button>
          `).join("") : `<div class="app-empty"><i class="ri-music-line"></i><strong>No audio files yet</strong><span>Upload audio through Files to play it here.</span></div>`}
        </div>
      </div>
    `, {
      afterRender: () => {
        const audio = $("#soundieAudio");
        const playTrack = async id => {
          const track = await window.SecuFileSystem.get(id);
          if (!track) return;

          audio.src = URL.createObjectURL(track.blob);
          $("#soundieTitle").textContent = track.name;
          audio.play().catch(() => {});
        };

        $$("[data-track-id]").forEach(button => {
          button.addEventListener("click", () => playTrack(button.dataset.trackId));
        });

        if (options.selectedId) playTrack(options.selectedId);

        $("#soundieRefresh").addEventListener("click", openSoundie);
      }
    });
  }

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
  // INTERWEBZ
  // --------------------------------------------------

  function openInterWebz() {
    showApp("interwebz", `
      <div class="integration-app interwebz-app">
        <div class="integration-logo"><i class="ri-global-line"></i></div>
        <h2>InterWebz</h2>
        <p class="integration-status"><span class="status-dot offline"></span> Browser server not connected</p>
        <div class="integration-details">
          <strong>Browser interface ready</strong>
          <p>The Scramjet server and transport endpoint have not been configured in this build. This screen will become the browser once the backend is connected.</p>
        </div>
      </div>
    `);
  }

  // --------------------------------------------------
  // POPCORNER
  // --------------------------------------------------

  async function openPopcorner() {
    const all = await window.SecuFileSystem.getAll();
    const videos = all.filter(item =>
      !item.deletedAt && item.type?.startsWith("video/")
    );

    showApp("popcorner", `
      <div class="popcorner-app">
        <div class="app-toolbar">
          <div><h2>Popcorner</h2><p>Your local video library.</p></div>
        </div>
        <div class="popcorner-grid">
          ${videos.length ? videos.map(video => `
            <button data-video-id="${video.id}">
              <i class="ri-movie-2-line"></i>
              <strong>${escapeHTML(video.name)}</strong>
              <span>${window.SecuFileSystem.formatBytes(video.size)}</span>
            </button>
          `).join("") : `<div class="app-empty"><i class="ri-movie-line"></i><strong>No videos in Files</strong><span>Upload a video through Files to see it here.</span></div>`}
        </div>
        <div id="popcornerPlayer"></div>
      </div>
    `, {
      afterRender: () => {
        $$("[data-video-id]").forEach(button => {
          button.addEventListener("click", async () => {
            const item = await window.SecuFileSystem.get(button.dataset.videoId);
            if (!item) return;

            const player = $("#popcornerPlayer");
            player.innerHTML = `
              <video controls autoplay src="${URL.createObjectURL(item.blob)}"></video>
              <strong>${escapeHTML(item.name)}</strong>
            `;
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
