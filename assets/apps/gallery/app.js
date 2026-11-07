export async function open(options = {}) {
  const handlers = window.SecuOSLegacyAppHandlers;
  const handler = handlers && handlers["gallery"];
  if (typeof handler !== "function") {
    throw new Error("The Gallery system service is unavailable.");
  }
  return handler(options);
}
