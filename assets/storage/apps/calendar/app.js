import { host, $, $$ } from "../_shared/runtime.js";
export async function open() {
  const now=new Date(), today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  const state={year:now.getFullYear(),month:now.getMonth(),selected:today};
  const getEvents=()=>host.getEvents(), saveEvents=events=>host.saveEvents(events);
  async function render(){
    const first=new Date(state.year,state.month,1),count=new Date(state.year,state.month+1,0).getDate(),offset=first.getDay(),cells=[];
    for(let i=0;i<offset;i++)cells.push("<span></span>");
    for(let day=1;day<=count;day++){
      const date=`${state.year}-${String(state.month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
      cells.push(`<button class="${date===today?"today":""} ${date===state.selected?"selected":""} ${getEvents().some(x=>x.date===date)?"has-event":""}" data-date="${date}">${day}</button>`);
    }
    const events=getEvents().filter(x=>x.date===state.selected);
    await host.show("calendar",`<section class="calendar-app">
      <div class="calendar-toolbar"><button id="calendarPrev"><i class="ri-arrow-left-s-line"></i></button><strong>${first.toLocaleDateString([],{month:"long",year:"numeric"})}</strong><button id="calendarNext"><i class="ri-arrow-right-s-line"></i></button></div>
      <div class="calendar-grid calendar-weekdays">${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=>`<span>${d}</span>`).join("")}</div>
      <div class="calendar-grid">${cells.join("")}</div>
      <div class="calendar-events"><div class="calendar-events-heading"><strong>${new Date(state.selected+"T12:00:00").toLocaleDateString([],{weekday:"long",month:"long",day:"numeric"})}</strong><button id="calendarAddEvent"><i class="ri-add-line"></i> Add event</button></div>
      ${events.length?events.map(x=>`<div class="calendar-event"><span class="calendar-event-dot"></span><div><strong>${host.escape(x.title)}</strong><small>${host.escape(x.time||"All day")}</small></div><button data-remove-event="${host.escape(x.id)}"><i class="ri-delete-bin-line"></i></button></div>`).join(""):`<div class="calendar-no-events">Nothing scheduled for this day.</div>`}</div></section>`,{afterRender(){
      $("#calendarPrev").onclick=()=>{state.month--;if(state.month<0){state.month=11;state.year--;}render();};
      $("#calendarNext").onclick=()=>{state.month++;if(state.month>11){state.month=0;state.year++;}render();};
      $$(".calendar-grid [data-date]").forEach(b=>b.onclick=()=>{state.selected=b.dataset.date;render();});
      $("#calendarAddEvent").onclick=()=>{const title=prompt("Event name:");if(!title?.trim())return;const time=prompt("Event time (optional):","All day")||"All day";saveEvents([...getEvents(),{id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),title:title.trim(),date:state.selected,time}]);render();host.renderBriefing();};
      $$("[data-remove-event]").forEach(b=>b.onclick=()=>{saveEvents(getEvents().filter(x=>x.id!==b.dataset.removeEvent));render();host.renderBriefing();});
    }});
  }
  await render();
}
