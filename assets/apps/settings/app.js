export async function open(options = {}) {
  const handlers = window.SecuOSLegacyAppHandlers;
  const handler = handlers && handlers["settings"];
  if (typeof handler !== "function") {
    throw new Error("The Settings system service is unavailable.");
  }
  return handler(options);
}
