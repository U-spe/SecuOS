export async function open(options = {}) {
  const handlers = window.SecuOSLegacyAppHandlers;
  const handler = handlers && handlers["trash"];
  if (typeof handler !== "function") {
    throw new Error("The Trash system service is unavailable.");
  }
  return handler(options);
}
