import { host, $$, $ } from "../_shared/runtime.js";

export async function open() {
  const all = await window.SecuFileSystem.getAll();
  const videos = all.filter(item => !item.deletedAt && item.type?.startsWith("video/"));

  await host.show("popcorner", `
    <section class="popcorner-app">
      <div class="app-toolbar">
        <div><h2>Popcorner</h2><p>Your local video library.</p></div>
      </div>
      <div class="popcorner-grid">
        ${videos.length ? videos.map(item => `
          <button type="button" data-video-id="${host.escape(item.id)}">
            <i class="ri-movie-2-line"></i>
            <strong>${host.escape(item.name)}</strong>
            <span>${window.SecuFileSystem.formatBytes(item.size)}</span>
          </button>
        `).join("") : `
          <div class="app-empty"><i class="ri-movie-line"></i><strong>No videos in Files</strong><span>Upload a video through Files to see it here.</span></div>
        `}
      </div>
      <div id="popcornerPlayer"></div>
    </section>
  `, {
    afterRender() {
      const player = $("#popcornerPlayer");
      $$("[data-video-id]").forEach(button => {
        button.addEventListener("click", async () => {
          const item = await window.SecuFileSystem.get(button.dataset.videoId);
          if (!item || !player) return;
          player.querySelector("video")?.pause();
          const source = URL.createObjectURL(item.blob);
          player.innerHTML = `
            <video controls autoplay playsinline tabindex="0" aria-label="${host.escape(item.name)}">
              <source src="${source}" type="${host.escape(item.type || "video/mp4")}">
            </video>
            <strong>${host.escape(item.name)}</strong>
          `;
          const video = player.querySelector("video");
          video.focus();
          video.addEventListener("dblclick", () => {
            if (document.fullscreenElement) document.exitFullscreen?.();
            else video.requestFullscreen?.();
          });
          video.addEventListener("keydown", event => {
            if (event.key === "Enter" && !event.repeat) {
              event.preventDefault();
              if (video.paused) video.play().catch(() => {});
              else video.pause();
            }
          });
        });
      });
    }
  });
}
