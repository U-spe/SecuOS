
(() => {
  "use strict";

  const panel = document.getElementById("notificationPanel");
  const container = document.getElementById("toastContainer");

  function notify(title, message) {
    const toast = document.createElement("div");
    toast.className = "toast";

    const heading = document.createElement("strong");
    heading.textContent = title;

    const description = document.createElement("span");
    description.textContent = message;

    toast.append(heading, description);
    container?.appendChild(toast);

    setTimeout(() => toast.remove(), 4500);
  }

  function toggleNotifications() {
    panel?.classList.toggle("open");
  }

  document.getElementById("windowsClock")?.addEventListener("contextmenu", event => {
    event.preventDefault();
    toggleNotifications();
  });

  document.getElementById("clearNotifications")?.addEventListener("click", () => {
    panel?.querySelector(".notification-empty")?.classList.remove("hidden");
    notify("Notifications", "Your notification center is clear.");
  });

  document.getElementById("clearNotifications")?.addEventListener("click", () => {
    const heading = panel?.querySelector(".panel-heading");
    if (heading) {
      heading.insertAdjacentHTML(
        "afterend",
        '<div class="notification-empty"><i class="ri-notification-off-line"></i><strong>All caught up</strong><span>No new notifications</span></div>'
      );
    }
  });

  window.SecuNotifications = { notify, toggleNotifications };
  window.SecuDesktop = window.SecuDesktop || {};
  window.SecuDesktop.notify = notify;
})();
