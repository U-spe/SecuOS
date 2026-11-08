export async function open() {
  if (typeof window.openSecuSettings !== "function") throw new Error("Settings service is unavailable.");
  window.openSecuSettings();
}
