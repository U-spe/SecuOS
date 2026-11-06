import { BootEffects } from "./boot-effects.mjs";

import {
    getProfile,
    createProfile,
    verifyPassword,
    startSession,
    endSession
} from "./boot-security.mjs";

/* =====================================================
   CONFIGURATION
===================================================== */

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

const STORAGE = {
    skipBoot: "secuos-skip-boot",
    startupLogin: "secuos-startup-login",
    diagnostics: "secuos-diagnostics",
    os: "secuos-os"
};

const VALID_OS = [
    "windows",
    "macos",
    "chrome"
];

/* =====================================================
   STATE
===================================================== */

const state = {
    kernel: null,
    profile: null,
    diagnostics: null,

    root: null,
    desktop: null,

    logs: [],

    started: false,
    shuttingDown: false
};

/* =====================================================
   UTILITIES
===================================================== */

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

function storageGet(key, fallback = null) {
    try {
        return localStorage.getItem(key) ?? fallback;
    } catch {
        return fallback;
    }
}

function storageSet(key, value) {
    try {
        localStorage.setItem(key, String(value));
        return true;
    } catch {
        return false;
    }
}

function isEnabled(key, defaultValue = true) {
    const value = storageGet(key);

    if (value === null) {
        return defaultValue;
    }

    return value === "true";
}

function getOS() {
    const savedOS = storageGet(STORAGE.os);

    const documentOS =
        document.documentElement.dataset.os;

    if (VALID_OS.includes(savedOS)) {
        return savedOS;
    }

    if (VALID_OS.includes(documentOS)) {
        return documentOS;
    }

    return "windows";
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

/* =====================================================
   BOOT OVERLAY
===================================================== */

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

function ensureOverlay() {
    if (state.root?.isConnected) {
        state.root.style.display = "flex";
        state.root.dataset.os = getOS();
        return state.root;
    }

    const root = document.createElement("div");

    root.id = "secu-boot";
    root.dataset.os = getOS();

    root.innerHTML = `
        <div class="secu-boot-background"></div>
        <div class="secu-boot-grid"></div>
        <div class="secu-boot-content"></div>
    `;

    document.body.appendChild(root);

    state.root = root;

    return root;
}

function render(content) {
    const container = state.root?.querySelector(
        ".secu-boot-content"
    );

    if (container) {
        container.innerHTML = content;
    }
}

function showOverlay() {
    ensureOverlay();

    state.root.style.display = "flex";
    state.root.dataset.os = getOS();
}

function hideOverlay() {
    if (state.root) {
        state.root.remove();
        state.root = null;
    }
}

/* =====================================================
   PROGRESS UI
===================================================== */

function progressView(title, description, label) {
    render(`
        ${logo()}

        <h1 class="secu-boot-title">
            ${escapeHTML(title)}
        </h1>

        <p class="secu-boot-description">
            ${escapeHTML(description)}
        </p>

        <div class="secu-boot-progress">
            <div
                class="secu-boot-progress-fill"
                id="secu-progress-fill"
            ></div>
        </div>

        <div class="secu-boot-status">
            <span id="secu-progress-label">
                ${escapeHTML(label)}
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

        if (fill) {
            fill.style.width = `${value}%`;
        }

        if (number) {
            number.textContent = `${value}%`;
        }

        if (status) {
            status.textContent = label;
        }
    }, duration);
}

/* =====================================================
   TYPESCRIPT KERNEL
===================================================== */

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
                new Error(
                    "TypeScript compiler failed to load."
                )
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
        {
            type: "text/javascript"
        }
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

/* =====================================================
   FIRMWARE
===================================================== */

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

/* =====================================================
   PYTHON DIAGNOSTICS
===================================================== */

async function loadPythonRuntime() {
    if (!window.loadPyodide) {
        await new Promise((resolve, reject) => {
            const script = document.createElement("script");

            script.src =
                "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js";

            script.onload = resolve;

            script.onerror = () => reject(
                new Error(
                    "Python runtime failed to load."
                )
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

    await BootEffects.sleep(
        CONFIG.timings.diagnostics
    );

    if (!state.kernel.canContinue()) {
        throw new Error(
            "A critical environment check failed."
        );
    }
}

/* =====================================================
   DIAGNOSTICS DISPLAY
===================================================== */

function renderDiagnostics() {
    const results =
        state.diagnostics?.results || [];

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

                    <span>
                        ${escapeHTML(item.name)}
                    </span>

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

function renderDiagnosticsPage() {
    const results =
        state.diagnostics?.results || [];

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
            id="secu-diagnostics-close"
        >
            Close
        </button>

        ${footer()}
    `);

    document.getElementById(
        "secu-diagnostics-close"
    )?.addEventListener("click", () => {
        if (state.profile?.passwordHash &&
            isEnabled(STORAGE.startupLogin, true)) {
            renderLogin();
        } else {
            renderWelcome({
                fast: true
            });
        }
    });
}

/* =====================================================
   DESKTOP ENVIRONMENT
===================================================== */

async function loadEnvironment({
    animate = true
} = {}) {
    state.kernel.transition("environment");

    log("Preparing desktop environment.");

    if (animate) {
        progressView(
            "Preparing your system",
            "Restoring your preferences and workspace.",
            "Loading preferences"
        );
    }

    let settings = {};

    try {
        settings = JSON.parse(
            localStorage.getItem(CONFIG.settingsKey) || "{}"
        );
    } catch {
        settings = {};
    }

    window.SecuOSSettings = settings;

    if (animate) {
        await runProgress(
            CONFIG.timings.environment,
            "Environment ready"
        );
    }

    log("Desktop environment prepared.");
}

/* =====================================================
   PROFILE ROUTING
===================================================== */

function routeToProfile() {
    state.profile = getProfile();

    log(
        state.profile
            ? "Existing profile discovered."
            : "No existing profile found."
    );

    if (!state.profile) {
        renderSetup();
        return;
    }

    const requireLogin = isEnabled(
        STORAGE.startupLogin,
        true
    );

    if (
        state.profile.passwordHash &&
        requireLogin
    ) {
        renderLogin();
        return;
    }

    renderWelcome({
        fast: isEnabled(STORAGE.skipBoot, false)
    });
}

/* =====================================================
   PROFILE SETUP
===================================================== */

function renderSetup() {
    state.kernel.transition("setup");

    state.root.dataset.os = getOS();

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

    const submit = async () => {
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

        const button = document.getElementById(
            "secu-create-profile"
        );

        button.disabled = true;
        error.textContent = "";

        try {
            state.profile = await createProfile({
                displayName,
                username,
                password
            });

            log("Profile created successfully.");

            renderWelcome({
                fast: false
            });
        } catch (exception) {
            error.textContent = exception.message;
            button.disabled = false;
        }
    };

    document.getElementById(
        "secu-create-profile"
    ).addEventListener("click", submit);

    document.getElementById(
        "secu-password"
    ).addEventListener("keydown", event => {
        if (event.key === "Enter") {
            submit();
        }
    });
}

/* =====================================================
   LOGIN
===================================================== */

function renderLogin() {
    state.kernel.transition("login");

    state.root.dataset.os = getOS();

    log("Login screen opened.");

    if (!state.profile) {
        state.profile = getProfile();
    }

    if (!state.profile) {
        renderSetup();
        return;
    }

    if (!state.profile.passwordHash) {
        renderWelcome({
            fast: true
        });
        return;
    }

    const avatar = state.profile.avatar ||
        getInitials(state.profile.displayName);

    render(`
        <div class="secu-boot-avatar">
            ${escapeHTML(avatar)}
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

        ${footer()}
    `);

    const input = document.getElementById(
        "secu-login-password"
    );

    const button = document.getElementById(
        "secu-login-submit"
    );

    const error = document.getElementById(
        "secu-login-error"
    );

    const submit = async () => {
        button.disabled = true;
        error.textContent = "";

        try {
            const valid = await verifyPassword(
                input.value
            );

            if (!valid) {
                error.textContent =
                    "Incorrect password.";

                input.value = "";
                input.focus();
                button.disabled = false;
                return;
            }

            renderWelcome({
                fast: false
            });
        } catch (exception) {
            error.textContent = exception.message;
            button.disabled = false;
        }
    };

    button.addEventListener("click", submit);

    input.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            submit();
        }
    });

    input.focus();
}

/* =====================================================
   WELCOME
===================================================== */

async function renderWelcome({
    fast = false
} = {}) {
    state.kernel.transition("welcome");

    state.profile = getProfile() || state.profile;

    if (!state.profile) {
        renderSetup();
        return;
    }

    startSession();

    log("User session established.");

    if (fast) {
        enterDesktop();
        return;
    }

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

        if (fill) {
            fill.style.width = `${value}%`;
        }
    }, CONFIG.timings.welcome);

    enterDesktop();
}

/* =====================================================
   DESKTOP ENTRY
===================================================== */

function enterDesktop() {
    if (!state.kernel) {
        throw new Error(
            "The TypeScript boot kernel is not initialized."
        );
    }

    state.kernel.complete();

    log("SecuOS desktop is ready.");

    hideOverlay();

    if (state.desktop) {
        state.desktop.style.display = "";
    }

    document.body.classList.add("secuos-desktop-ready");

    window.dispatchEvent(
        new CustomEvent("secuos:ready", {
            detail: {
                profile: state.profile,
                report: state.kernel.getReport()
            }
        })
    );
}

/* =====================================================
   LOCK
===================================================== */

function lock() {
    if (!state.profile) {
        return;
    }

    log("Desktop locked.");

    endSession();

    if (state.desktop) {
        state.desktop.style.display = "none";
    }

    showOverlay();

    state.kernel.transition("locked");

    renderLogin();
}

/* =====================================================
   RESTART AND SHUTDOWN
===================================================== */

function powerScreen(mode) {
    if (state.shuttingDown) {
        return;
    }

    state.shuttingDown = true;

    showOverlay();

    state.kernel.transition("shutdown");

    endSession();

    if (state.desktop) {
        state.desktop.style.display = "none";
    }

    log(
        mode === "restart"
            ? "Restart requested."
            : "Shutdown requested."
    );

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

            ${footer()}
        `);

        state.shuttingDown = false;

        document.getElementById(
            "secu-power-on"
        )?.addEventListener("click", () => {
            location.reload();
        });
    }, 1100);
}

/* =====================================================
   ERROR HANDLING
===================================================== */

function showError(error) {
    console.error(
        "[SecuOS Boot]",
        error
    );

    log(`Startup error: ${error.message}`);

    showOverlay();

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
    )?.addEventListener("click", () => {
        location.reload();
    });
}

/* =====================================================
   STARTUP
===================================================== */

async function start() {
    if (state.started) {
        return;
    }

    state.started = true;

    state.desktop = document.querySelector(
        "#desktop"
    );

    if (!state.desktop) {
        throw new Error(
            "Missing #desktop. Check main.html."
        );
    }

    const savedOS = storageGet(STORAGE.os);

    if (VALID_OS.includes(savedOS)) {
        document.documentElement.dataset.os = savedOS;
    }

    state.desktop.style.display = "none";

    showOverlay();

    try {
        // The TypeScript kernel is always initialized.
        await loadTypeScriptKernel();

        const skipBoot = isEnabled(
            STORAGE.skipBoot,
            false
        );

        const runDiagnostics = isEnabled(
            STORAGE.diagnostics,
            true
        );

        if (skipBoot) {
            log("Fast startup enabled.");
            log("Skipping animated firmware sequence.");

            await loadEnvironment({
                animate: false
            });

        } else {
            await runFirmware();

            if (runDiagnostics) {
                try {
                    await runPythonDiagnostics();
                } catch (diagnosticError) {
                    log(
                        "Diagnostics unavailable: " +
                        diagnosticError.message
                    );

                    state.diagnostics = {
                        results: [],
                        warning: diagnosticError.message
                    };
                }
            } else {
                log("Python diagnostics disabled.");
            }

            await loadEnvironment({
                animate: true
            });
        }

        state.profile = getProfile();

        routeToProfile();

    } catch (error) {
        showError(error);
    }
}

/* =====================================================
   PUBLIC API
===================================================== */

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

    showDiagnostics() {
        if (!state.root?.isConnected) {
            showOverlay();
        }

        renderDiagnosticsPage();
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

/* =====================================================
   INITIALIZE
===================================================== */

start();
