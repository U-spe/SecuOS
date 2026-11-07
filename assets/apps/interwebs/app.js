export async function open(options = {}) {
  const handlers = window.SecuOSLegacyAppHandlers;
  const handler = handlers && handlers["interwebs"];
  if (typeof handler !== "function") {
    throw new Error("The InterWebs system service is unavailable.");
  }
  return handler(options);
}
