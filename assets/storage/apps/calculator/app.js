import { host, $ } from "../_shared/runtime.js";
export async function open() {
  let value = "0", stored = null, operator = null, fresh = false;
  await host.show("calculator", `
    <section class="calculator-app">
      <output class="calculator-display" id="calcDisplay" aria-live="polite">0</output>
      <div class="calculator-keys">
        ${["AC","±","%","÷","7","8","9","×","4","5","6","−","1","2","3","+","0",".","⌫","="].map(key =>
          `<button type="button" data-calc="${key}" class="${["÷","×","−","+","="].includes(key) ? "operator" : ""}">${key}</button>`
        ).join("")}
      </div>
    </section>`, { afterRender() {
      $("#calcDisplay").closest(".calculator-app").querySelector(".calculator-keys").addEventListener("click", event => {
        const button = event.target.closest("[data-calc]"); if (!button) return;
        const key = button.dataset.calc;
        if (key === "AC") { value="0"; stored=null; operator=null; fresh=false; }
        else if (key === "⌫") value = value.length > 1 ? value.slice(0,-1) : "0";
        else if (key === "±") value = String(Number(value) * -1);
        else if (key === "%") value = String(Number(value) / 100);
        else if (["÷","×","−","+"].includes(key)) { stored=Number(value); operator=key; fresh=true; }
        else if (key === "=" && operator) {
          const a=stored, b=Number(value); let result;
          if(operator==="+") result=a+b; if(operator==="−") result=a-b;
          if(operator==="×") result=a*b; if(operator==="÷") result=b===0?NaN:a/b;
          value=Number.isFinite(result)?String(Number(result.toPrecision(11))):"Error";
          stored=null; operator=null; fresh=true;
        } else if (key === ".") {
          if(fresh){value="0.";fresh=false;} else if(!value.includes(".")) value+=".";
        } else if (/^\d$/.test(key)) { value=fresh||value==="0"?key:value+key; fresh=false; }
        $("#calcDisplay").textContent=value;
      });
    }});
}
