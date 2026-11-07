export async function open(options = {}) {
  const handlers = window.SecuOSLegacyAppHandlers;
  const handler = handlers && handlers["notepad"];
  if (typeof handler !== "function") {
    throw new Error("The Notepad system service is unavailable.");
  }
  return handler(options);
}
