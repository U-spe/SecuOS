import { host, $ } from "../_shared/runtime.js";
let interval;
export async function open(){
  clearInterval(interval);
  await host.show("clock",`<section class="clock-app"><div class="clock-app-time" id="clockAppTime"></div><div class="clock-app-date" id="clockAppDate"></div><div class="clock-app-note">Local device time</div></section>`,{afterRender(){
    const update=()=>{if($("#appWindowTitle")?.textContent!=="Clock")return;$("#clockAppTime").textContent=new Date().toLocaleTimeString([],{hour:"numeric",minute:"2-digit",second:localStorage.getItem("secuos-seconds")==="true"?"2-digit":undefined});$("#clockAppDate").textContent=new Date().toLocaleDateString([],{weekday:"long",month:"long",day:"numeric",year:"numeric"});};
    update();interval=setInterval(()=>{if($("#appWindow")?.hidden||$("#appWindowTitle")?.textContent!=="Clock"){clearInterval(interval);return;}update();},1000);
  }});
}
