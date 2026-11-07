export async function open(options = {}) {
  const handlers = window.SecuOSLegacyAppHandlers;
  const handler = handlers && handlers["soundie"];
  if (typeof handler !== "function") {
    throw new Error("The Soundie system service is unavailable.");
  }
  return handler(options);
}
