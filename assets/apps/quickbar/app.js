export async function open(options = {}) {
  const handlers = window.SecuOSLegacyAppHandlers;
  const handler = handlers && handlers["quickbar"];
  if (typeof handler !== "function") {
    throw new Error("The Quick Bar system service is unavailable.");
  }
  return handler(options);
}
