export async function open(options = {}) {
  const handlers = window.SecuOSLegacyAppHandlers;
  const handler = handlers && handlers["popcorner"];
  if (typeof handler !== "function") {
    throw new Error("The Popcorner system service is unavailable.");
  }
  return handler(options);
}
