(() => {
    "use strict";

    const desktop = document.querySelector("#desktop");

    if (desktop) {
        desktop.style.display = "none";
    }

    import("/assets/lang/mjs/boot-engine.mjs")
        .catch(error => {
            console.error(
                "[SecuOS] Boot loader failed:",
                error
            );

            document.body.innerHTML = `
                <main style="
                    min-height:100vh;
                    display:grid;
                    place-content:center;
                    padding:25px;
                    background:#08090d;
                    color:white;
                    font-family:Arial,sans-serif;
                    text-align:center;
                ">
                    <h1>SecuOS couldn't start</h1>
                    <p>The boot engine failed to load.</p>
                    <button onclick="location.reload()">
                        Retry
                    </button>
                </main>
            `;
        });
})();
