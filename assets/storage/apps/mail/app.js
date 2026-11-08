import { host, $, $$ } from "../_shared/runtime.js";
const STORAGE_KEY = "secuos-mail-drafts";
const readDrafts = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } };
const writeDrafts = drafts => localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));

export async function open(options = {}) {
  const drafts = readDrafts();
  await host.show("mail", `
    <section class="mail-app">
      <aside class="mail-sidebar">
        <button class="active" type="button"><i class="ri-draft-line"></i> Drafts</button>
        <button type="button" disabled><i class="ri-inbox-line"></i> Inbox</button>
        <button type="button" disabled><i class="ri-send-plane-line"></i> Sent</button>
      </aside>
      <section class="mail-main">
        <div class="app-toolbar">
          <div><h2>Mail</h2><p>Local draft workspace.</p></div>
          <button class="primary-button" id="mailNew"><i class="ri-edit-line"></i> New draft</button>
        </div>
        <div class="mail-drafts" id="mailDrafts">
          ${drafts.length ? drafts.map(draft => `
            <button type="button" data-draft-id="${host.escape(draft.id)}">
              <strong>${host.escape(draft.subject || "(No subject)")}</strong>
              <span>${host.escape(draft.to || "No recipient")}</span>
            </button>`).join("") : `<div class="app-empty"><i class="ri-mail-line"></i><strong>No drafts yet</strong><span>Create a draft to get started.</span></div>`}
        </div>
        <form class="mail-compose" id="mailCompose" hidden>
          <label>To<input id="mailTo" type="email" placeholder="name@example.com"></label>
          <label>Subject<input id="mailSubject" placeholder="Subject"></label>
          <label>Message<textarea id="mailBody" rows="7" placeholder="Write your message..."></textarea></label>
          <div><button type="submit" class="primary-button">Save draft</button><button type="button" id="mailCancel">Cancel</button></div>
          <p class="integration-note">Drafts are saved locally. Sending email is not connected.</p>
        </form>
      </section>
    </section>`, { afterRender() {
      const form=$("#mailCompose");
      const reset=()=>{form.hidden=false;$("#mailTo").value="";$("#mailSubject").value="";$("#mailBody").value="";form.dataset.editing="";};
      $("#mailNew").addEventListener("click",reset);
      $("#mailCancel").addEventListener("click",()=>form.hidden=true);
      form.addEventListener("submit",event=>{
        event.preventDefault();
        const current=readDrafts(),id=form.dataset.editing;
        const draft={id:id|| (crypto.randomUUID?crypto.randomUUID():String(Date.now())),to:$("#mailTo").value.trim(),subject:$("#mailSubject").value.trim(),body:$("#mailBody").value,updatedAt:Date.now()};
        const index=current.findIndex(item=>item.id===id);
        if(index>=0)current[index]=draft;else current.unshift(draft);
        writeDrafts(current);open();host.notify("Draft saved","Your email draft is stored locally.");
      });
      $$("[data-draft-id]").forEach(button=>button.addEventListener("click",()=>{
        const draft=readDrafts().find(item=>item.id===button.dataset.draftId);if(!draft)return;
        form.hidden=false;form.dataset.editing=draft.id;
        $("#mailTo").value=draft.to||"";$("#mailSubject").value=draft.subject||"";$("#mailBody").value=draft.body||"";
      }));
    }});
}
