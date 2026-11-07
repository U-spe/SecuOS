export async function open(options = {}) {
  const handlers = window.SecuOSLegacyAppHandlers;
  const handler = handlers && handlers["calculator"];
  if (typeof handler !== "function") {
    throw new Error("The Calculator system service is unavailable.");
  }
  return handler(options);
}
