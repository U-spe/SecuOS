
(() => {
  "use strict";

  const quickCard = document.querySelector("[data-bedrock-quickcard]");
  const frame = document.getElementById("bedrock-frame");

  if (!quickCard || !frame) return;

  Object.assign(frame.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    border: "0",
    margin: "0",
    padding: "0",
    zIndex: "2147483647",
    background: "#090909"
  });

  quickCard.addEventListener("click", event => {
    event.preventDefault();

    if (!frame.src || frame.src === "about:blank") {
      frame.src = "/main.html";
    }

    frame.hidden = false;
  });
})();
