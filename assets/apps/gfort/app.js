import { host, $$ } from "../_shared/runtime.js";

export async function open() {
  await host.show("gfort", `
    <section class="gfort-app">
      <div class="gfort-hero">
        <i class="ri-gamepad-fill"></i>
        <h2>GFort</h2>
        <p>Choose a library platform.</p>
      </div>
      <div class="gfort-platforms">
        <button data-console="PlayStation"><i class="ri-playstation-line"></i><strong>PlayStation</strong><span>Library 01</span></button>
        <button data-console="Xbox"><i class="ri-xbox-line"></i><strong>Xbox</strong><span>Library 02</span></button>
        <button data-console="Nintendo"><i class="ri-gamepad-line"></i><strong>Nintendo</strong><span>Library 03</span></button>
      </div>
      <p class="integration-note">These are library selectors only. Game libraries are not connected yet.</p>
    </section>`, { afterRender() {
      $$("[data-console]").forEach(button => button.addEventListener("click", () => {
        $$("[data-console]").forEach(item => item.classList.remove("active"));
        button.classList.add("active");
        host.notify("Library selected", button.dataset.console + " library selected.");
      }));
    }});
}
