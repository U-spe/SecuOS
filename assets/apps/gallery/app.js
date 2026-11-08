import { host, $, $$ } from "../_shared/runtime.js";
export async function open(options={}){
  const all=await window.SecuFileSystem.getAll(),images=all.filter(x=>!x.deletedAt&&x.type?.startsWith("image/"));
  await host.show("gallery",`<section class="gallery-app"><div class="app-toolbar"><div><h2>Gallery</h2><p>Your images saved in SecuOS Files.</p></div><button class="primary-button" id="galleryUpload"><i class="ri-upload-2-line"></i> Upload images</button><input type="file" id="galleryUploadInput" accept="image/*" multiple hidden></div><div class="gallery-grid" id="galleryGrid">${images.length?images.map(x=>`<button class="gallery-card" data-gallery-id="${host.escape(x.id)}"><img src="${URL.createObjectURL(x.blob)}" alt="${host.escape(x.name)}"><span>${host.escape(x.name)}</span></button>`).join(""):`<div class="app-empty"><i class="ri-image-line"></i><strong>Your gallery is empty</strong><span>Upload images here or add them through Files.</span></div>`}</div><div id="galleryPreview" class="gallery-preview" hidden></div></section>`,{afterRender(){
    const input=$("#galleryUploadInput");$("#galleryUpload").onclick=()=>input.click();
    input.onchange=async()=>{await window.SecuFileSystem.addFiles(input.files,"Images");open();host.notify("Gallery updated","Your uploaded images are now saved in Files.");};
    $("#galleryGrid").addEventListener("click",async event=>{const card=event.target.closest("[data-gallery-id]");if(!card)return;const item=await window.SecuFileSystem.get(card.dataset.galleryId);if(!item)return;const preview=$("#galleryPreview");preview.hidden=false;preview.innerHTML=`<div class="gallery-preview-toolbar"><strong>${host.escape(item.name)}</strong><button id="gallerySetWallpaper"><i class="ri-image-edit-line"></i> Set wallpaper</button><button id="galleryDownload"><i class="ri-download-line"></i> Download</button><button id="galleryClosePreview"><i class="ri-close-line"></i></button></div><img src="${URL.createObjectURL(item.blob)}" alt="${host.escape(item.name)}">`;
      $("#gallerySetWallpaper").onclick=()=>{window.SecuWallpaper?.setFromFile(item);};$("#galleryDownload").onclick=()=>window.SecuFileSystem.download(item.id);$("#galleryClosePreview").onclick=()=>{preview.hidden=true;preview.innerHTML="";};
    });
    if(options.selectedId)setTimeout(()=>$("[data-gallery-id='"+CSS.escape(options.selectedId)+"']")?.click(),0);
  }});
}
