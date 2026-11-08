export async function open() {
  const manager = window.SecuWindowManager;
  if (typeof manager?.openWindow !== "function") {
    throw new Error("The Settings window manager is unavailable.");
  }
  manager.openWindow("settingsWindow");
}
