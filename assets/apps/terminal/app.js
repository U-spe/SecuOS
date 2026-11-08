import { host, $, $$ } from "../_shared/runtime.js";
export async function open(){
  await host.show("terminal",`<section class="terminal-app"><div class="terminal-output" id="terminalOutput"><div>SecuOS Terminal [local shell]</div><div>Type <strong>help</strong> to see available commands.</div></div><form id="terminalForm" class="terminal-input-row"><span>user@secuos:~$</span><input id="terminalInput" autocomplete="off" spellcheck="false" autofocus></form></section>`,{afterRender(){
    const output=$("#terminalOutput"),input=$("#terminalInput");
    const print=value=>{const line=document.createElement("div");line.textContent=value;output.append(line);output.scrollTop=output.scrollHeight;};
    $("#terminalForm").addEventListener("submit",event=>{event.preventDefault();const command=input.value.trim();if(!command)return;print(`user@secuos:~$ ${command}`);input.value="";const [name,...args]=command.split(/\s+/),argument=args.join(" ");
      switch(name.toLowerCase()){
        case "help":print("help, clear, date, time, whoami, about, apps, echo [text], open [app]");break;
        case "clear":output.innerHTML="";break;
        case "date":print(new Date().toDateString());break;
        case "time":print(new Date().toLocaleTimeString());break;
        case "whoami":print(localStorage.getItem("secuos-username")||"user");break;
        case "about":print("SecuOS browser desktop environment.");break;
        case "apps":print(host.list().map(a=>a.name).join(" · "));break;
        case "echo":print(argument);break;
        case "open":{const match=host.list().find(a=>a.id===argument.toLowerCase()||a.name.toLowerCase()===argument.toLowerCase());if(match)host.open(match.id);else print("App not found. Use 'apps' to see installed apps.");break;}
        default:print(`Command not found: ${name}. Type 'help'.`);
      }
    });input.focus();
  }});
}
