import { host, $$ } from "../_shared/runtime.js";
export async function open(){
  await host.show("apps",`<section class="apps-manager"><div class="app-toolbar"><div><h2>Applications</h2><p>Manage the applications available on this desktop.</p></div><span class="apps-count">${host.installed().length} installed</span></div><div class="apps-manager-grid">${host.list().map(app=>{const installed=host.isInstalled(app.id);return `<article class="apps-manager-card"><div class="app-launcher-icon"><i class="${app.icon}"></i></div><div class="apps-manager-info"><strong>${host.escape(app.name)}</strong><span>${host.escape(app.description)}</span></div><button data-app-toggle="${app.id}" ${app.core?"disabled":""}>${app.core?"System app":installed?"Uninstall":"Install"}</button></article>`;}).join("")}</div></section>`,{afterRender(){
    $$("[data-app-toggle]").forEach(button=>button.addEventListener("click",()=>{const app=host.info(button.dataset.appToggle);if(!app||app.core)return;host.setInstalled(app.id,!host.isInstalled(app.id));open();}));
  }});
}
