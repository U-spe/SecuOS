import { host } from "../_shared/runtime.js";

export async function open() {
  await host.show("scar", `
    <section class="integration-app scar-app">
      <div class="integration-logo"><i class="ri-sparkling-2-line"></i></div>
      <h2>Scar</h2>
      <p class="integration-status"><span class="status-dot offline"></span> AI provider not connected</p>
      <div class="integration-details">
        <strong>AI workspace</strong>
        <p>The AI provider is not connected in this build. The workspace is ready for the future service integration.</p>
        <p>When connected, changes will require explicit user approval before they are applied.</p>
      </div>
    </section>`);
}
