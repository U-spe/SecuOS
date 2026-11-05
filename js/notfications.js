
(() => {
  "use strict";

  const panel = document.getElementById("notificationPanel");
  const container = document.getElementById("toastContainer");

  function notify(title, message) {
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = "toast";

    const heading = document.createElement("strong");
    heading.textContent = title;

    const description = document.createElement("span");
    description.textContent = message;

    toast.append(heading, description);
    container.appendChild(toast);

    setTimeout(() => toast.remove(), 4500);
  }

  function toggleNotifications() {
    panel?.classList.toggle("open");
  }

  document.getElementById("windowsClock")?.addEventListener("click", () => {
    toggleNotifications();
  });

  document.getElementById("macClock")?.addEventListener("contextmenu", event => {
    event.preventDefault();
    toggleNotifications();
  });

  document.getElementById("clearNotifications")?.addEventListener("click", () => {
    panel?.querySelectorAll(".notification-card").forEach(item => item.remove());

    const empty = panel?.querySelector(".notification-empty");
    if (empty) empty.hidden = false;

    notify("Notifications", "Your notification center is clear.");
  });

  window.SecuNotifications = {
    notify,
    toggleNotifications
  };

  window.SecuDesktop = window.SecuDesktop || {};
  window.SecuDesktop.notify = notify;
})();
