import { host, $ } from "../_shared/runtime.js";
export async function open(options = {}) {
  await host.show("notepad", `
    <section class="notepad-app">
      <div class="notepad-toolbar"><span><i class="ri-save-3-line"></i> Autosave enabled</span><span id="notepadStatus">Saved</span><button id="notepadNew">New</button><button id="notepadDownload">Download</button></div>
      <input id="notepadFilename" value="${host.escape(options.filename || "Untitled.txt")}" aria-label="Filename">
      <textarea id="notepadText" spellcheck="true" placeholder="Start writing..."></textarea>
    </section>`, { afterRender() {
      const area=$("#notepadText"), filename=$("#notepadFilename"), status=$("#notepadStatus");
      area.value=options.text ?? localStorage.getItem("secuos-notes") ?? "";
      let timer;
      area.addEventListener("input",()=>{status.textContent="Saving…";clearTimeout(timer);timer=setTimeout(()=>{localStorage.setItem("secuos-notes",area.value);status.textContent="Saved";},250);});
      $("#notepadNew").addEventListener("click",()=>{if(area.value&&!confirm("Start a new note?"))return;area.value="";filename.value="Untitled.txt";localStorage.setItem("secuos-notes","");status.textContent="New note";});
      $("#notepadDownload").addEventListener("click",()=>{const blob=new Blob([area.value],{type:"text/plain"}),url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=filename.value.trim()||"Untitled.txt";link.click();URL.revokeObjectURL(url);});
    }});
}
