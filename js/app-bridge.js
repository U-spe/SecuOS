(() => {
  "use strict";

  const originalRenderFiles = window.SecuFileSystem.renderFiles.bind(window.SecuFileSystem);
  const originalPickFile = window.SecuFileSystem.pickFile.bind(window.SecuFileSystem);
  const originalSetWallpaper = window.SecuSettings?.setWallpaper?.bind(window.SecuSettings);

  let lastPickedFile = null;
  let currentGalleryItem = null;
  let wallpaperObjectURL = null;

  function setFileWallpaper(item) {
    if (!item?.blob || !item.type?.startsWith("image/")) return;

    if (wallpaperObjectURL) {
      URL.revokeObjectURL(wallpaperObjectURL);
    }

    wallpaperObjectURL = URL.createObjectURL(item.blob);

    const wallpaper = document.querySelector(".wallpaper");
    if (wallpaper) {
      wallpaper.style.backgroundImage =
        `linear-gradient(135deg, rgba(0,0,0,.12), rgba(0,0,0,.08)), url("${wallpaperObjectURL}")`;
    }

    localStorage.setItem("secuos-wallpaper-file-id", item.id);
    localStorage.removeItem("secuos-wallpaper-upload");
    localStorage.removeItem("secuos-wallpaper");

    window.SecuDesktop?.notify?.(
      "Wallpaper updated",
      `${item.name} is now your wallpaper.`
    );
  }

  // Files and Trash need to open the shared application window.
  window.SecuFileSystem.renderFiles = async options => {
    const trash = options?.trash === true;
    const appWindow = document.getElementById("appWindow");

    const appTitle = document.getElementById("appWindowTitle");
    const appIcon = document.getElementById("appWindowIcon");

    if (appTitle) appTitle.textContent = trash ? "Trash" : "Files";
    if (appIcon) {
      appIcon.className = trash
        ? "ri-delete-bin-6-line"
        : "ri-folder-3-fill";
    }

    window.SecuWindowManager?.openWindow("appWindow");

    return originalRenderFiles(options);
  };

  // Remember the selected library item for wallpaper selection.
  window.SecuFileSystem.pickFile = async options => {
    const item = await originalPickFile(options);
    if (item) lastPickedFile = item;
    return item;
  };

  // Restore a wallpaper chosen from Files after a page refresh.
  async function restoreWallpaper() {
    const id = localStorage.getItem("secuos-wallpaper-file-id");
    if (!id) return;

    try {
      const item = await window.SecuFileSystem.get(id);
      if (item && !item.deletedAt) {
        setFileWallpaper(item);
      } else {
        localStorage.removeItem("secuos-wallpaper-file-id");
      }
    } catch (error) {
      console.warn("[SecuOS] Could not restore wallpaper:", error);
    }
  }

  // Preserve the selected image when the Settings wallpaper picker is used.
  if (window.SecuSettings && originalSetWallpaper) {
    window.SecuSettings.setWallpaper = path => {
      if (lastPickedFile && String(path).startsWith("blob:")) {
        setFileWallpaper(lastPickedFile);
        lastPickedFile = null;
        return;
      }

      localStorage.removeItem("secuos-wallpaper-file-id");
      originalSetWallpaper(path);
    };
  }

  // Gallery image selection.
  document.addEventListener("click", async event => {
    const card = event.target.closest("[data-gallery-id]");
    if (!card) return;

    try {
      currentGalleryItem = await window.SecuFileSystem.get(card.dataset.galleryId);
    } catch {
      currentGalleryItem = null;
    }
  }, true);

  // Replace Gallery's temporary object URL wallpaper action with persistent storage.
  document.addEventListener("click", event => {
    const button = event.target.closest("#gallerySetWallpaper");
    if (!button) return;

    if (!currentGalleryItem) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    setFileWallpaper(currentGalleryItem);
  }, true);

  // Quick Bar app tiles are launch actions, not desktop shortcuts.
  document.addEventListener("click", event => {
    const button = event.target.closest(".quickbar-grid [data-app]");
    if (!button) return;

    event.preventDefault();
    window.SecuOSApps?.open(button.dataset.app);
  });

  // Keep the selected image available when the app changes.
  window.addEventListener("secuos:ready", restoreWallpaper);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", restoreWallpaper, { once: true });
  } else {
    restoreWallpaper();
  }

  window.SecuWallpaper = {
    setFromFile: setFileWallpaper,
    restore: restoreWallpaper
  };
})();
