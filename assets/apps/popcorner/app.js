import { host, $$, $ } from "../_shared/runtime.js";
export async function open(){
  const all=await window.SecuFileSystem.getAll(),videos=all.filter(x=>!x.deletedAt&&x.type?.startsWith("video/"));
  await host.show("popcorner",`<section class="popcorner-app"><div class="app-toolbar"><div><h2>Popcorner</h2><p>Your local video library.</p></div></div><div class="popcorner-grid">${videos.length?videos.map(x=>`<button data-video-id="${host.escape(x.id)}"><i class="ri-movie-2-line"></i><strong>${host.escape(x.name)}</strong><span>${window.SecuFileSystem.formatBytes(x.size)}</span></button>`).join(""):`<div class="app-empty"><i class="ri-movie-line"></i><strong>No videos in Files</strong><span>Upload a video through Files to see it here.</span></div>`}</div><div id="popcornerPlayer"></div></section>`,{afterRender(){
    $$("[data-video-id]").forEach(button=>button.onclick=async()=>{const item=await window.SecuFileSystem.get(button.dataset.videoId);if(!item)return;const player=$("#popcornerPlayer");player.innerHTML=`<video controls autoplay src="${URL.createObjectURL(item.blob)}"></video><strong>${host.escape(item.name)}</strong>`;});
  }});
}
