(() => {
  "use strict";

  const DB_NAME = "secuos-files";
  const DB_VERSION = 1;
  const STORE = "items";

  let databasePromise;

  const makeId = () =>
    crypto.randomUUID
      ? crypto.randomUUID()
      : "file-" + Date.now() + "-" + Math.random().toString(16).slice(2);

  function openDatabase() {
    if (databasePromise) return databasePromise;

    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "id" });
          store.createIndex("name", "name", { unique: false });
          store.createIndex("folder", "folder", { unique: false });
          store.createIndex("deletedAt", "deletedAt", { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return databasePromise;
  }

  async function transaction(mode, operation) {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      let result;

      try {
        result = operation(store);
      } catch (error) {
        reject(error);
        return;
      }

      tx.oncomplete = () => resolve(result?.result ?? result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Storage operation aborted."));
    });
  }

  async function getAll() {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE, "readonly")
        .objectStore(STORE)
        .getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async function get(id) {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE, "readonly")
        .objectStore(STORE)
        .get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async function addFiles(fileList, folder = "Home") {
    const files = [...fileList];
    const saved = [];

    for (const file of files) {
      const record = {
        id: makeId(),
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        lastModified: file.lastModified || Date.now(),
        createdAt: Date.now(),
        folder,
        deletedAt: null,
        isFolder: false,
        blob: file
      };

      await transaction("readwrite", store => store.put(record));
      saved.push(record);
    }

    return saved;
  }

  async function createFolder(name, parent = "Home") {
    const clean = String(name || "").trim();

    if (!clean) throw new Error("Enter a folder name.");

    const record = {
      id: makeId(),
      name: clean,
      type: "application/x-secuos-folder",
      size: 0,
      createdAt: Date.now(),
      folder: parent,
      deletedAt: null,
      isFolder: true,
      blob: null
    };

    await transaction("readwrite", store => store.put(record));
    return record;
  }

  async function rename(id, name) {
    const record = await get(id);
    const clean = String(name || "").trim();

    if (!record) throw new Error("That file could not be found.");
    if (!clean) throw new Error("A file needs a name.");

    record.name = clean;
    await transaction("readwrite", store => store.put(record));
    return record;
  }

  async function moveToTrash(id) {
    const record = await get(id);
    if (!record) return;

    record.deletedAt = Date.now();
    await transaction("readwrite", store => store.put(record));
  }

  async function restore(id) {
    const record = await get(id);
    if (!record) return;

    record.deletedAt = null;
    record.folder = record.folder || "Home";
    await transaction("readwrite", store => store.put(record));
  }

  async function permanentlyDelete(id) {
    await transaction("readwrite", store => store.delete(id));
  }

  async function emptyTrash() {
    const all = await getAll();

    for (const item of all) {
      if (item.deletedAt) {
        await permanentlyDelete(item.id);
      }
    }
  }

  async function download(id) {
    const item = await get(id);
    if (!item || !item.blob) throw new Error("File is unavailable.");

    const url = URL.createObjectURL(item.blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = item.name;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  function formatBytes(bytes) {
    if (!bytes) return "0 B";

    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1
    );

    return `${(bytes / Math.pow(1024, index)).toFixed(index ? 1 : 0)} ${units[index]}`;
  }

  function iconFor(item) {
    if (item.isFolder) return "ri-folder-3-fill";
    if (item.type?.startsWith("image/")) return "ri-image-line";
    if (item.type?.startsWith("audio/")) return "ri-music-2-line";
    if (item.type?.startsWith("video/")) return "ri-video-line";
    if (item.type?.includes("pdf")) return "ri-file-pdf-2-line";
    if (item.type?.startsWith("text/")) return "ri-file-text-line";
    return "ri-file-line";
  }

  async function openItem(item) {
    if (!item) return;

    if (item.isFolder) {
      window.SecuOSApps?.open("files", { folder: item.name });
      return;
    }

    if (item.type?.startsWith("image/")) {
      window.SecuOSApps?.open("gallery", { selectedId: item.id });
      return;
    }

    if (item.type?.startsWith("audio/")) {
      window.SecuOSApps?.open("soundie", { selectedId: item.id });
      return;
    }

    if (item.type?.startsWith("text/") ||
        /\.(txt|md|json|js|css|html|csv)$/i.test(item.name)) {
      const text = await item.blob.text();
      window.SecuOSApps?.open("notepad", {
        filename: item.name,
        text
      });
      return;
    }

    await download(item.id);
  }

  function appContainer() {
    return document.getElementById("appWindowContent");
  }

  function safe(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  async function renderFiles(options = {}) {
    const container = appContainer();
    if (!container) return;

    const folder = options.folder || "Home";
    const query = options.query || "";
    const trashMode = options.trash === true;

    container.innerHTML = `
      <div class="file-manager" data-file-os="${document.documentElement.dataset.os || "windows"}">
        <aside class="file-sidebar">
          <div class="file-sidebar-title">Locations</div>
          <button data-location="Home" class="${folder === "Home" && !trashMode ? "active" : ""}">
            <i class="ri-home-4-line"></i> Home
          </button>
          <button data-location="Images"><i class="ri-image-line"></i> Images</button>
          <button data-location="Audio"><i class="ri-music-2-line"></i> Audio</button>
          <button data-location="Documents"><i class="ri-file-text-line"></i> Documents</button>
          <button data-location="Trash" class="${trashMode ? "active" : ""}">
            <i class="ri-delete-bin-6-line"></i> Trash
          </button>
          <div class="file-storage-label">Local browser storage</div>
        </aside>

        <section class="file-main">
          <div class="file-toolbar">
            <div class="file-breadcrumb">
              <i class="ri-folder-open-line"></i>
              <strong>${trashMode ? "Trash" : safe(folder)}</strong>
            </div>
            <div class="file-toolbar-actions">
              <input class="file-search" id="fileSearch" placeholder="Search files">
              <button class="primary-button" id="fileUploadButton">
                <i class="ri-upload-2-line"></i> Upload
              </button>
              <input type="file" id="fileUploadInput" multiple hidden>
              <button id="fileNewFolder"><i class="ri-folder-add-line"></i></button>
              <button id="fileViewToggle" title="Toggle view"><i class="ri-layout-grid-line"></i></button>
            </div>
          </div>

          <div class="file-status" id="fileStatus">Loading your files…</div>
          <div class="file-grid" id="fileGrid"></div>
        </section>
      </div>
    `;

    let gridMode = "grid";

    async function paint() {
      const all = await getAll();
      let items = all.filter(item => trashMode ? !!item.deletedAt : !item.deletedAt);

      if (trashMode) {
        items = items;
      } else if (folder === "Images") {
        items = items.filter(item => item.type?.startsWith("image/"));
      } else if (folder === "Audio") {
        items = items.filter(item => item.type?.startsWith("audio/"));
      } else if (folder === "Documents") {
        items = items.filter(item =>
          item.type?.startsWith("text/") ||
          /\.(pdf|doc|docx|txt|md|csv|json)$/i.test(item.name)
        );
      } else if (folder !== "Home") {
        items = items.filter(item => item.folder === folder);
      }

      const search = container.querySelector("#fileSearch")?.value.toLowerCase() || "";
      if (search) items = items.filter(item => item.name.toLowerCase().includes(search));

      const grid = container.querySelector("#fileGrid");
      const status = container.querySelector("#fileStatus");

      status.textContent = `${items.length} item${items.length === 1 ? "" : "s"}`;

      if (!items.length) {
        grid.innerHTML = `
          <div class="file-empty">
            <i class="${trashMode ? "ri-delete-bin-line" : "ri-folder-open-line"}"></i>
            <strong>${trashMode ? "Trash is empty" : "Nothing here yet"}</strong>
            <span>${trashMode ? "Deleted items will appear here." : "Upload files from your device to get started."}</span>
          </div>
        `;
        return;
      }

      grid.classList.toggle("list-view", gridMode === "list");

      grid.innerHTML = items.map(item => `
        <article class="file-card" data-file-id="${item.id}" tabindex="0">
          <div class="file-card-icon"><i class="${iconFor(item)}"></i></div>
          <div class="file-card-name">${safe(item.name)}</div>
          <div class="file-card-meta">${item.isFolder ? "Folder" : formatBytes(item.size)}</div>
          <div class="file-card-actions">
            ${trashMode
              ? `<button data-file-action="restore" title="Restore"><i class="ri-arrow-go-back-line"></i></button>
                 <button data-file-action="delete" title="Delete permanently"><i class="ri-delete-bin-line"></i></button>`
              : `<button data-file-action="open" title="Open"><i class="ri-external-link-line"></i></button>
                 <button data-file-action="download" title="Download"><i class="ri-download-line"></i></button>
                 <button data-file-action="rename" title="Rename"><i class="ri-edit-line"></i></button>
                 <button data-file-action="trash" title="Move to Trash"><i class="ri-delete-bin-line"></i></button>`
            }
          </div>
        </article>
      `).join("");
    }

    container.querySelector("#fileUploadButton").addEventListener("click", () => {
      container.querySelector("#fileUploadInput").click();
    });

    container.querySelector("#fileUploadInput").addEventListener("change", async event => {
      try {
        const saved = await addFiles(event.target.files, folder);
        window.SecuDesktop?.notify(
          "Files uploaded",
          `${saved.length} file${saved.length === 1 ? "" : "s"} saved to SecuOS Files.`
        );
        event.target.value = "";
        await paint();
      } catch (error) {
        window.SecuDesktop?.notify("Upload failed", error.message);
      }
    });

    container.querySelector("#fileNewFolder").addEventListener("click", async () => {
      const name = prompt("New folder name:");
      if (!name) return;

      try {
        await createFolder(name, folder);
        await paint();
      } catch (error) {
        window.SecuDesktop?.notify("Folder could not be created", error.message);
      }
    });

    container.querySelector("#fileSearch").addEventListener("input", paint);

    container.querySelector("#fileViewToggle").addEventListener("click", () => {
      gridMode = gridMode === "grid" ? "list" : "grid";
      paint();
    });

    container.querySelectorAll("[data-location]").forEach(button => {
      button.addEventListener("click", () => {
        const location = button.dataset.location;
        renderFiles({
          folder: location === "Trash" ? "Home" : location,
          trash: location === "Trash"
        });
      });
    });

    container.querySelector("#fileGrid").addEventListener("click", async event => {
      const actionButton = event.target.closest("[data-file-action]");
      const card = event.target.closest("[data-file-id]");
      if (!card) return;

      const item = await get(card.dataset.fileId);
      if (!item) return;

      if (actionButton) {
        const action = actionButton.dataset.fileAction;

        try {
          if (action === "open") await openItem(item);
          if (action === "download") await download(item.id);
          if (action === "trash") await moveToTrash(item.id);
          if (action === "restore") await restore(item.id);
          if (action === "delete") {
            if (confirm(`Permanently delete "${item.name}"?`)) {
              await permanentlyDelete(item.id);
            }
          }
          if (action === "rename") {
            const name = prompt("Rename file:", item.name);
            if (name) await rename(item.id, name);
          }
          await paint();
        } catch (error) {
          window.SecuDesktop?.notify("File operation failed", error.message);
        }
      }
    });

    container.querySelector("#fileGrid").addEventListener("dblclick", async event => {
      const card = event.target.closest("[data-file-id]");
      if (!card || event.target.closest("button")) return;
      const item = await get(card.dataset.fileId);
      await openItem(item);
    });

    if (trashMode) {
      const empty = document.createElement("button");
      empty.className = "file-empty-trash";
      empty.textContent = "Empty Trash";
      empty.addEventListener("click", async () => {
        if (!confirm("Permanently delete everything in Trash?")) return;
        await emptyTrash();
        await paint();
      });
      container.querySelector(".file-toolbar-actions").prepend(empty);
    }

    await paint();
  }

  async function pickFile(options = {}) {
    const all = await getAll();
    const accept = options.accept || "*";
    const candidates = all.filter(item => {
      if (item.deletedAt || item.isFolder) return false;
      if (accept === "image/*") return item.type?.startsWith("image/");
      if (accept === "audio/*") return item.type?.startsWith("audio/");
      return true;
    });

    return new Promise(resolve => {
      const overlay = document.createElement("div");
      overlay.className = "file-picker-overlay";

      overlay.innerHTML = `
        <div class="file-picker-dialog">
          <div class="file-picker-heading">
            <strong>Select from Files</strong>
            <button data-picker-close><i class="ri-close-line"></i></button>
          </div>
          <div class="file-picker-list">
            ${candidates.length ? candidates.map(item => `
              <button data-picker-id="${item.id}">
                <i class="${iconFor(item)}"></i>
                <span>${safe(item.name)}</span>
                <small>${formatBytes(item.size)}</small>
              </button>
            `).join("") : `<div class="file-empty"><i class="ri-folder-open-line"></i><strong>No matching files</strong><span>Upload a file in Files first.</span></div>`}
          </div>
        </div>
      `;

      function finish(value) {
        overlay.remove();
        resolve(value);
      }

      overlay.addEventListener("click", event => {
        if (event.target === overlay || event.target.closest("[data-picker-close]")) {
          finish(null);
        }

        const button = event.target.closest("[data-picker-id]");
        if (button) {
          const item = candidates.find(file => file.id === button.dataset.pickerId);
          finish(item || null);
        }
      });

      document.body.appendChild(overlay);
    });
  }

  window.SecuFileSystem = {
    openDatabase,
    getAll,
    get,
    addFiles,
    createFolder,
    rename,
    moveToTrash,
    restore,
    permanentlyDelete,
    emptyTrash,
    download,
    openItem,
    renderFiles,
    pickFile,
    formatBytes
  };

  window.SecuDesktop?.notify?.(
    "Files ready",
    "Your local file library is ready."
  );
})();
