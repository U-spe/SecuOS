import { host } from "../_shared/runtime.js";
export async function open(){
  await host.show("interwebs",`<section class="integration-app interwebz-app"><div class="integration-logo"><i class="ri-global-line"></i></div><h2>InterWebs</h2><p class="integration-status"><span class="status-dot offline"></span> Browser server not connected</p><div class="integration-details"><strong>Browser interface ready</strong><p>The Scramjet server and transport endpoint have not been configured in this build. This screen will become the browser once the backend is connected.</p></div></section>`);
}
