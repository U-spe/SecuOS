export async function open(options = {}) {
  const handlers = window.SecuOSLegacyAppHandlers;
  const handler = handlers && handlers["apps"];
  if (typeof handler !== "function") {
    throw new Error("The Apps system service is unavailable.");
  }
  return handler(options);
}
