(() => {
  "use strict";

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  function getTimeOptions() {
    const showSeconds =
      localStorage.getItem("secuos-seconds") === "true";

    return {
      hour: "numeric",
      minute: "2-digit",
      ...(showSeconds ? { second: "2-digit" } : {})
    };
  }

  function updateClock() {
    const now = new Date();

    const time = now.toLocaleTimeString(
      undefined,
      getTimeOptions()
    );

    const shortDate = now.toLocaleDateString(undefined, {
      month: "numeric",
      day: "numeric",
      year: "numeric"
    });

    const longDate = now.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });

    const weekday = now.toLocaleDateString(undefined, {
      weekday: "long"
    });

    // Windows taskbar, macOS menu bar, ChromeOS shelf.
    document.querySelectorAll(".clock-time").forEach(element => {
      element.textContent = time;
    });

    document.querySelectorAll(".clock-date").forEach(element => {
      element.textContent = shortDate;
    });

    // Clock app.
    document.querySelectorAll(".clock-app-time").forEach(element => {
      element.textContent = time;
    });

    document.querySelectorAll(".clock-app-date").forEach(element => {
      element.textContent = longDate;
    });

    // Briefing / calendar flyout.
    const briefingTime = $("#briefingTime");
    const briefingDate = $("#briefingDate");
    const briefingWeekday = $("#briefingWeekday");

    if (briefingTime) {
      briefingTime.textContent = time;
    }

    if (briefingDate) {
      briefingDate.textContent = longDate;
    }

    if (briefingWeekday) {
      briefingWeekday.textContent = weekday;
    }

    // Keep the menu bar clock readable on macOS.
    const macClock = $("#macClock");

    if (macClock) {
      const macTime = $(".clock-time", macClock);

      if (macTime) {
        macTime.textContent = now.toLocaleString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit"
        });
      }
    }

    document.dispatchEvent(
      new CustomEvent("secuos:clocktick", {
        detail: {
          now,
          time,
          shortDate,
          longDate,
          weekday
        }
      })
    );
  }

  window.SecuClock = {
    update: updateClock,
    now: () => new Date()
  };

  updateClock();

  window.setInterval(updateClock, 1000);

  window.addEventListener("storage", event => {
    if (event.key === "secuos-seconds") {
      updateClock();
    }
  });

  console.info("[SecuOS] System clock initialized.");
})();
