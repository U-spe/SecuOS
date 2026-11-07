export async function open(options = {}) {
  const handlers = window.SecuOSLegacyAppHandlers;
  const handler = handlers && handlers["calendar"];
  if (typeof handler !== "function") {
    throw new Error("The Calendar system service is unavailable.");
  }
  return handler(options);
}
