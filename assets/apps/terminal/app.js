export async function open(options = {}) {
  const handlers = window.SecuOSLegacyAppHandlers;
  const handler = handlers && handlers["terminal"];
  if (typeof handler !== "function") {
    throw new Error("The Terminal system service is unavailable.");
  }
  return handler(options);
}
