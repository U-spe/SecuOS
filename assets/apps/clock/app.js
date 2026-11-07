export async function open(options = {}) {
  const handlers = window.SecuOSLegacyAppHandlers;
  const handler = handlers && handlers["clock"];
  if (typeof handler !== "function") {
    throw new Error("The Clock system service is unavailable.");
  }
  return handler(options);
}
