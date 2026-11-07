export async function open(options = {}) {
  const handlers = window.SecuOSLegacyAppHandlers;
  const handler = handlers && handlers["files"];
  if (typeof handler !== "function") {
    throw new Error("The Files system service is unavailable.");
  }
  return handler(options);
}
