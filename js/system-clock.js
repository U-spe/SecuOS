
(() => {
  "use strict";

  const updateClock = () => {
    const now = new Date();
    const showSeconds = localStorage.getItem("secuos-seconds") === "true";

    const time = now.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      second: showSeconds ? "2-digit" : undefined
    });

    const date = now.toLocaleDateString([], {
      month: "numeric",
      day: "numeric",
      year: "numeric"
    });

    document.querySelectorAll(".clock-time").forEach(el => {
      el.textContent = time;
    });

    document.querySelectorAll(".clock-date").forEach(el => {
      el.textContent = date;
    });

    const macClock = document.getElementById("macClock");
    if (macClock) {
      macClock.querySelector(".clock-time")?.replaceChildren(time);
      if (!macClock.querySelector(".clock-time")) {
        macClock.textContent = now.toLocaleString([], {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit"
        });
      }
    }
  };

  updateClock();
  setInterval(updateClock, 1000);
})();
