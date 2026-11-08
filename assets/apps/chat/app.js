import { host, $, $$ } from "../_shared/runtime.js";
const STORAGE_KEY="secuos-local-chat";
const readMessages=()=>{try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");}catch{return[];}};
const writeMessages=messages=>localStorage.setItem(STORAGE_KEY,JSON.stringify(messages));

export async function open() {
  const messages=readMessages();
  await host.show("chat", `
    <section class="chat-app">
      <div class="chat-heading"><i class="ri-message-3-line"></i><div><strong>SecuOS Chat</strong><span>Local workspace</span></div><button id="chatClear" type="button">Clear history</button></div>
      <div class="chat-messages" id="chatMessages">
        ${messages.map(message=>`<div class="chat-message ${message.role==="user"?"mine":""}"><span>${message.role==="user"?"You":"SecuOS"}</span><p>${host.escape(message.text)}</p></div>`).join("")}
        ${messages.length?"":`<div class="app-empty"><i class="ri-chat-3-line"></i><strong>Start a conversation</strong><span>Messages are saved in this browser only.</span></div>`}
      </div>
      <form class="chat-compose" id="chatForm"><input id="chatInput" placeholder="Write a message..." autocomplete="off"><button type="submit" aria-label="Send"><i class="ri-send-plane-fill"></i></button></form>
      <p class="chat-local-note">Local chat only. No online messaging service is connected.</p>
    </section>`,{afterRender(){
      $("#chatForm").addEventListener("submit",event=>{
        event.preventDefault();const input=$("#chatInput"),message=input.value.trim();if(!message)return;
        const current=readMessages();current.push({role:"user",text:message,time:Date.now()});writeMessages(current);open();
      });
      $("#chatClear").addEventListener("click",()=>{if(!confirm("Clear all local chat messages?"))return;writeMessages([]);open();});
      const list=$("#chatMessages");list.scrollTop=list.scrollHeight;$("#chatInput").focus();
    }});
}
