import { host } from "../_shared/runtime.js";
export async function open(){
  const favorites=["files","gallery","calendar","notepad","calculator","soundie"];
  await host.show("quickbar",`<section class="quickbar-app"><div class="app-toolbar"><div><h2>Quick Bar</h2><p>Your frequently used applications.</p></div></div><div class="quickbar-grid">${favorites.map(id=>host.info(id)).filter(Boolean).map(app=>host.card(app,"quickbar-launcher")).join("")}</div></section>`);
}
