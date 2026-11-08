import { host, $, $$ } from "../_shared/runtime.js";
export async function open(options={}){
  const all=await window.SecuFileSystem.getAll(),tracks=all.filter(x=>!x.deletedAt&&x.type?.startsWith("audio/"));
  await host.show("soundie",`<section class="soundie-app"><div class="app-toolbar"><div><h2>Soundie</h2><p>Play audio saved in your Files library.</p></div><button class="primary-button" id="soundieRefresh"><i class="ri-refresh-line"></i> Refresh</button></div><div class="soundie-player"><div class="soundie-art"><i class="ri-music-2-fill"></i></div><strong id="soundieTitle">Choose a track</strong><audio id="soundieAudio" controls></audio></div><div class="soundie-track-list">${tracks.length?tracks.map(x=>`<button data-track-id="${host.escape(x.id)}"><i class="ri-music-2-line"></i><span>${host.escape(x.name)}</span><small>${window.SecuFileSystem.formatBytes(x.size)}</small></button>`).join(""):`<div class="app-empty"><i class="ri-music-line"></i><strong>No audio files yet</strong><span>Upload audio through Files to play it here.</span></div>`}</div></section>`,{afterRender(){
    const audio=$("#soundieAudio"),playTrack=async id=>{const track=await window.SecuFileSystem.get(id);if(!track)return;audio.src=URL.createObjectURL(track.blob);$("#soundieTitle").textContent=track.name;audio.play().catch(()=>{});};
    $$("[data-track-id]").forEach(button=>button.onclick=()=>playTrack(button.dataset.trackId));if(options.selectedId)playTrack(options.selectedId);$("#soundieRefresh").onclick=()=>open();
  }});
}
