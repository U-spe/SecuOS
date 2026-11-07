export async function open(options = {}) {
  const handlers = window.SecuOSLegacyAppHandlers;
  const handler = handlers && handlers["camera"];
  if (typeof handler !== "function") {
    throw new Error("The Camera system service is unavailable.");
  }
  return handler(options);
}
