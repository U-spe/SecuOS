const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
const escape=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const host={
  $,$$,escape,
  notify:(heading,message)=>window.SecuDesktop?.notify?.(heading,message),
  info:id=>window.SecuOSApps?.list?.find(app=>app.id===id),
  list:()=>window.SecuOSApps?.list||[],
  installed:()=>window.SecuOSApps?.installed?.()||[],
  isInstalled:id=>(window.SecuOSApps?.installed?.()||[]).includes(id),
  setInstalled:(id,enabled)=>enabled?window.SecuOSApps?.install?.(id):window.SecuOSApps?.uninstall?.(id),
  open:(id,options)=>window.SecuOSApps?.open?.(id,options),
  card:(app,style="standard")=>`<button type="button" class="app-launcher ${style}" data-app="${app.id}" title="${escape(app.description)}"><span class="app-launcher-icon"><i class="${app.icon}"></i></span><span class="app-launcher-name">${escape(app.name)}</span></button>`,
  getEvents:()=>{try{return JSON.parse(localStorage.getItem("secuos-calendar-events")||"[]");}catch{return[];}},
  saveEvents:events=>localStorage.setItem("secuos-calendar-events",JSON.stringify(events)),
  renderBriefing:()=>window.SecuOSAppHost?.renderBriefing?.(),
  show:(id,html,options={})=>new Promise(resolve=>{
    const app=window.SecuOSAppHost?.info(id),content=$("#appWindowContent"),title=$("#appWindowTitle"),icon=$("#appWindowIcon");
    if(!app||!content){resolve();return;}
    title.textContent=app.name;icon.className=app.icon;
    content.classList.remove("app-loaded");content.classList.add("app-loading");
    content.innerHTML=`<div class="app-loading-screen"><span class="app-spinner"></span><strong>Opening ${escape(app.name)}</strong></div>`;
    window.SecuWindowManager?.openWindow("appWindow");
    setTimeout(()=>{content.innerHTML=html;content.classList.remove("app-loading");content.classList.add("app-loaded");content.scrollTop=0;try{options.afterRender?.();}finally{resolve();}},options.instant?0:110);
  })
};
export {host,$,$$};
