import {
    BootEffects
} from "./boot-effects.mjs";

import {
    getProfile,
    createProfile,
    verifyPassword,
    startSession,
    endSession
} from "./boot-security.mjs";

const CONFIG = {
    name: "SecuOS",
    version: "1.0.0",

    profileKey: "secuos.profile",
    settingsKey: "secuos.settings",

    timings: {
        firmware: 1200,
        diagnostics: 1300,
        environment: 1000,
        welcome: 1300
    }
};

const state = {
    kernel: null,
    profile: null,
    diagnostics: null,
    root: null,
    desktop: null,
    logs: [],
    started: false
};

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

function log(message) {
    const entry = {
        message,
        timestamp: new Date().toISOString()
    };

    state.logs.push(entry);

    if (state.logs.length > 100) {
        state.logs.shift();
    }

    console.info("[SecuOS]", message);

    window.dispatchEvent(
        new CustomEvent("secuos:boot-log", {
            detail: entry
        })
    );
}

function getInitials(name) {
    return String(name || "S")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part[0])
        .join("")
        .toUpperCase();
}

function logo() {
    return `
        <div class="secu-boot-logo">
            <span>S</span>
        </div>
    `;
}

function footer() {
    return `
        <div class="secu-boot-footer">
            SECUOS ${CONFIG.version}
            <span> · </span>
            SYSTEM ENVIRONMENT
        </div>
    `;
}

function render(content) {
    const container = state.root?.querySelector(
        ".secu-boot-content"
    );

    if (container) {
        container.innerHTML = content;
    }
}

function ensureOverlay() {
    if (state.root?.isConnected) {
        state.root.style.display = "flex";
        return;
    }

    const root = document.createElement("div");

    root.id = "secu-boot";

    root.innerHTML = `
        <div class="secu-boot-background"></div>
        <div class="secu-boot-grid"></div>

        <div class="secu-boot-content"></div>
    `;

    document.body.appendChild(root);

    state.root = root;
}

function progressView(title, description, label) {
    render(`
        ${logo()}

        <h1 class="secu-boot-title">
            ${title}
        </h1>

        <p class="secu-boot-description">
            ${description}
        </p>

        <div class="secu-boot-progress">
            <div
                class="secu-boot-progress-fill"
                id="secu-progress-fill"
            ></div>
        </div>

        <div class="secu-boot-status">
            <span id="secu-progress-label">
                ${label}
            </span>

            <span id="secu-progress-number">0%</span>
        </div>

        ${footer()}
    `);
}

async function runProgress(duration, label) {
    await BootEffects.progress(value => {
        const fill = document.getElementById(
            "secu-progress-fill"
        );

        const number = document.getElementById(
            "secu-progress-number"
        );

        const status = document.getElementById(
            "secu-progress-label"
        );

        if (fill) fill.style.width = `${value}%`;
        if (number) number.textContent = `${value}%`;
        if (status) status.textContent = label;
    }, duration);
}

async function loadTypeScriptKernel() {
    log("Loading TypeScript boot kernel.");

    const response = await fetch(
        "/assets/lang/ts/boot-kernel.ts"
    );

    if (!response.ok) {
        throw new Error(
            "Could not load boot-kernel.ts."
        );
    }

    const source = await response.text();

    if (!window.ts) {
        await new Promise((resolve, reject) => {
            const script = document.createElement("script");

            script.src =
                "https://cdn.jsdelivr.net/npm/typescript@5.8.3/lib/typescript.js";

            script.onload = resolve;
            script.onerror = () => reject(
                new Error("TypeScript compiler failed to load.")
            );

            document.head.appendChild(script);
        });
    }

    const compiled = window.ts.transpileModule(
        source,
        {
            compilerOptions: {
                target: window.ts.ScriptTarget.ES2020,
                module: window.ts.ModuleKind.ES2020
            }
        }
    );

    const blob = new Blob(
        [compiled.outputText],
        { type: "text/javascript" }
    );

    const moduleURL = URL.createObjectURL(blob);

    try {
        const module = await import(moduleURL);

        state.kernel = new module.BootKernel(CONFIG);

        state.kernel.subscribe(stage => {
            log(`Boot stage changed: ${stage}`);
        });
    } finally {
        URL.revokeObjectURL(moduleURL);
    }

    log("TypeScript kernel initialized.");
}

async function runFirmware() {
    state.kernel.transition("firmware");

    log("Firmware initialization started.");

    progressView(
        "SecuOS",
        "Initializing your system environment.",
        "Starting firmware"
    );

    await runProgress(
        CONFIG.timings.firmware,
        "Firmware initialized"
    );

    log("Firmware initialization completed.");
}

async function loadPythonRuntime() {
    if (!window.loadPyodide) {
        await new Promise((resolve, reject) => {
            const script = document.createElement("script");

            script.src =
                "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js";

            script.onload = resolve;
            script.onerror = () => reject(
                new Error("Python runtime failed to load.")
            );

            document.head.appendChild(script);
        });
    }

    return await window.loadPyodide();
}

async function runPythonDiagnostics() {
    state.kernel.transition("diagnostics");

    log("Starting Python diagnostics.");

    progressView(
        "System diagnostics",
        "Inspecting the browser environment.",
        "Loading Python runtime"
    );

    const pyodide = await loadPythonRuntime();

    const response = await fetch(
        "/assets/lang/py/diagnostics.py"
    );

    if (!response.ok) {
        throw new Error(
            "Could not load diagnostics.py."
        );
    }

    const source = await response.text();

    const result = await pyodide.runPythonAsync(source);

    state.diagnostics = JSON.parse(result);

    for (const item of state.diagnostics.results) {
        state.kernel.addDiagnostic(item);

        log(
            `${item.name}: ${
                item.passed ? "PASSED" : "FAILED"
            }`
        );
    }

    window.SecuOSDiagnostics = state.diagnostics;

    log("Python diagnostics completed.");

    renderDiagnostics();

    await BootEffects.sleep(CONFIG.timings.diagnostics);

    if (!state.kernel.canContinue()) {
        throw new Error(
            "A critical environment check failed."
        );
    }
}

function renderDiagnostics() {
    const results = state.diagnostics?.results || [];

    render(`
        ${logo()}

        <h1 class="secu-boot-title">
            System diagnostics
        </h1>

        <p class="secu-boot-description">
            Checking your browser and desktop environment.
        </p>

        <div class="secu-boot-checks">
            ${results.map(item => `
                <div class="secu-boot-check">
                    <span>${escapeHTML(item.name)}</span>

                    <span>
                        ${item.passed
                            ? '<i class="ri-check-line"></i>'
                            : '<i class="ri-alert-line"></i>'}
                    </span>
                </div>
            `).join("")}
        </div>

        <div class="secu-boot-footer">
            PYTHON DIAGNOSTICS ·
            ${results.filter(item => item.passed).length}
            / ${results.length} PASSED
        </div>
    `);
}

async function loadEnvironment() {
    state.kernel.transition("environment");

    log("Preparing desktop environment.");

    progressView(
        "Preparing your system",
        "Restoring your preferences and workspace.",
        "Loading preferences"
    );

    let settings = {};

    try {
        settings = JSON.parse(
            localStorage.getItem(CONFIG.settingsKey) || "{}"
        );
    } catch {
        settings = {};
    }

    window.SecuOSSettings = settings;

    await runProgress(
        CONFIG.timings.environment,
        "Environment ready"
    );

    log("Desktop environment prepared.");
}

function renderEnter() {
    state.kernel.transition("enter");

    state.profile = getProfile();

    log(
        state.profile
            ? "Existing profile discovered."
            : "No existing profile found."
    );

    render(`
        ${logo()}

        <h1 class="secu-boot-title">
            Welcome to SecuOS
        </h1>

        <p class="secu-boot-description">
            Your digital workspace is ready.
        </p>

        <button
            class="secu-boot-button"
            id="secu-enter"
        >
            Enter SecuOS
        </button>

        <button
            class="secu-boot-button secondary"
            id="secu-view-diagnostics"
        >
            System diagnostics
        </button>

        ${footer()}
    `);

    document.getElementById("secu-enter").onclick = () => {
        state.profile = getProfile();

        if (!state.profile) {
            renderSetup();
        } else if (state.profile.passwordHash) {
            renderLogin();
        } else {
            renderWelcome();
        }
    };

    document.getElementById(
        "secu-view-diagnostics"
    ).onclick = renderDiagnosticsPage;
}

function renderDiagnosticsPage() {
    const results = state.diagnostics?.results || [];

    render(`
        ${logo()}

        <h1 class="secu-boot-title">
            System report
        </h1>

        <p class="secu-boot-description">
            SecuOS environment diagnostics.
        </p>

        <div class="secu-boot-checks">
            ${results.map(item => `
                <div class="secu-boot-check">
                    <span>${escapeHTML(item.name)}</span>

                    <span>
                        ${item.passed
                            ? '<i class="ri-check-line"></i>'
                            : '<i class="ri-alert-line"></i>'}
                    </span>
                </div>
            `).join("")}
        </div>

        <button
            class="secu-boot-button"
            id="secu-back-enter"
        >
            Back
        </button>

        ${footer()}
    `);

    document.getElementById(
        "secu-back-enter"
    ).onclick = renderEnter;
}

function renderSetup() {
    state.kernel.transition("setup");

    log("First-time profile setup opened.");

    render(`
        ${logo()}

        <h1 class="secu-boot-title">
            Create your profile
        </h1>

        <p class="secu-boot-description">
            Set up your personal SecuOS environment.
        </p>

        <input
            class="secu-boot-field"
            id="secu-display-name"
            placeholder="Display name"
            maxlength="40"
            autocomplete="name"
        >

        <input
            class="secu-boot-field"
            id="secu-username"
            placeholder="Username"
            maxlength="24"
            autocomplete="username"
        >

        <input
            class="secu-boot-field"
            id="secu-password"
            type="password"
            placeholder="Password (optional)"
            autocomplete="new-password"
        >

        <p class="secu-boot-error" id="secu-setup-error"></p>

        <button
            class="secu-boot-button"
            id="secu-create-profile"
        >
            Create profile
        </button>

        ${footer()}
    `);

    document.getElementById(
        "secu-create-profile"
    ).onclick = async () => {
        const displayName = document.getElementById(
            "secu-display-name"
        ).value.trim();

        const username = document.getElementById(
            "secu-username"
        ).value.trim();

        const password = document.getElementById(
            "secu-password"
        ).value;

        const error = document.getElementById(
            "secu-setup-error"
        );

        try {
            state.profile = await createProfile({
                displayName,
                username,
                password
            });

            log("Profile created successfully.");

            renderWelcome();
        } catch (exception) {
            error.textContent = exception.message;
        }
    };
}

function renderLogin() {
    state.kernel.transition("login");

    log("Login screen opened.");

    render(`
        <div class="secu-boot-avatar">
            ${escapeHTML(
                state.profile.avatar ||
                getInitials(state.profile.displayName)
            )}
        </div>

        <h1 class="secu-boot-title">
            Welcome back
        </h1>

        <p class="secu-boot-description">
            ${escapeHTML(state.profile.displayName)}
            <br>
            @${escapeHTML(state.profile.username)}
        </p>

        <input
            class="secu-boot-field"
            id="secu-login-password"
            type="password"
            placeholder="Enter your password"
            autocomplete="current-password"
        >

        <p class="secu-boot-error" id="secu-login-error"></p>

        <button
            class="secu-boot-button"
            id="secu-login-submit"
        >
            Sign in
        </button>

        <button
            class="secu-boot-button secondary"
            id="secu-login-back"
        >
            Back
        </button>

        ${footer()}
    `);

    const submit = async () => {
        const password = document.getElementById(
            "secu-login-password"
        ).value;

        const error = document.getElementById(
            "secu-login-error"
        );

        try {
            const valid = await verifyPassword(password);

            if (!valid) {
                error.textContent = "Incorrect password.";
                return;
            }

            renderWelcome();
        } catch (exception) {
            error.textContent = exception.message;
        }
    };

    document.getElementById(
        "secu-login-submit"
    ).onclick = submit;

    document.getElementById(
        "secu-login-password"
    ).addEventListener("keydown", event => {
        if (event.key === "Enter") submit();
    });

    document.getElementById(
        "secu-login-back"
    ).onclick = renderEnter;
}

async function renderWelcome() {
    state.kernel.transition("welcome");

    startSession();

    log("User session established.");

    render(`
        ${logo()}

        <div class="secu-boot-spinner"></div>

        <h1 class="secu-boot-title">
            Welcome, ${escapeHTML(state.profile.displayName)}.
        </h1>

        <p class="secu-boot-description">
            Your desktop is being prepared.
        </p>

        <div class="secu-boot-progress">
            <div
                class="secu-boot-progress-fill"
                id="secu-welcome-progress"
            ></div>
        </div>

        ${footer()}
    `);

    await BootEffects.progress(value => {
        const fill = document.getElementById(
            "secu-welcome-progress"
        );

        if (fill) fill.style.width = `${value}%`;
    }, CONFIG.timings.welcome);

    enterDesktop();
}

function enterDesktop() {
    state.kernel.complete();

    log("SecuOS desktop is ready.");

    if (state.root) {
        state.root.remove();
    }

    if (state.desktop) {
        state.desktop.style.display = "";
    }

    window.dispatchEvent(
        new CustomEvent("secuos:ready", {
            detail: {
                profile: state.profile,
                report: state.kernel.getReport()
            }
        })
    );
}

function lock() {
    if (!state.profile) return;

    if (state.desktop) {
        state.desktop.style.display = "none";
    }

    ensureOverlay();

    state.kernel.transition("locked");

    renderLogin();
}

function powerScreen(mode) {
    ensureOverlay();

    state.kernel.transition("shutdown");

    endSession();

    if (state.desktop) {
        state.desktop.style.display = "none";
    }

    render(`
        ${logo()}

        <div class="secu-boot-spinner"></div>

        <h1 class="secu-boot-title">
            ${mode === "restart"
                ? "Restarting SecuOS"
                : "Shutting down"}
        </h1>

        <p class="secu-boot-description">
            ${mode === "restart"
                ? "Preparing a fresh system session."
                : "Your session is ending."}
        </p>
    `);

    setTimeout(() => {
        if (mode === "restart") {
            location.reload();
            return;
        }

        render(`
            ${logo()}

            <h1 class="secu-boot-title">
                SecuOS is off
            </h1>

            <p class="secu-boot-description">
                Your system has shut down.
            </p>

            <button
                class="secu-boot-button"
                id="secu-power-on"
            >
                Power on
            </button>
        `);

        document.getElementById(
            "secu-power-on"
        ).onclick = () => location.reload();
    }, 1100);
}

function showError(error) {
    console.error("[SecuOS Boot]", error);

    log(`Startup error: ${error.message}`);

    ensureOverlay();

    if (state.kernel) {
        state.kernel.fail(error.message);
    }

    render(`
        ${logo()}

        <h1 class="secu-boot-title">
            Startup interrupted
        </h1>

        <p class="secu-boot-description">
            ${escapeHTML(error.message)}
        </p>

        <button
            class="secu-boot-button"
            id="secu-retry"
        >
            Retry startup
        </button>

        ${footer()}
    `);

    document.getElementById(
        "secu-retry"
    ).onclick = () => location.reload();
}

async function start() {
    if (state.started) return;

    state.started = true;

    state.desktop = document.querySelector("#desktop");

    if (!state.desktop) {
        throw new Error(
            "Missing #desktop. Check your main.html markup."
        );
    }

    state.desktop.style.display = "none";

    ensureOverlay();

    try {
        await loadTypeScriptKernel();

        await runFirmware();

        await runPythonDiagnostics();

        await loadEnvironment();

        renderEnter();
    } catch (error) {
        showError(error);
    }
}

window.SecuOSBoot = {
    start,

    lock() {
        lock();
    },

    restart() {
        powerScreen("restart");
    },

    shutdown() {
        powerScreen("shutdown");
    },

    get profile() {
        return state.profile;
    },

    get stage() {
        return state.kernel?.stage || "initializing";
    },

    get diagnostics() {
        return state.diagnostics;
    },

    get logs() {
        return [...state.logs];
    },

    get report() {
        return state.kernel?.getReport() || null;
    }
};

start();
