
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
        firmware: 1000,
        diagnostics: 1200,
        environment: 1000,
        welcome: 1200
    }
};

let kernel = null;
let root = null;
let profile = null;
let desktop = null;

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
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
    console.info(`[SecuOS Boot] ${message}`);

    window.dispatchEvent(
        new CustomEvent("secuos:boot-log", {
            detail: {
                message,
                timestamp: Date.now()
            }
        })
    );
}

function mount() {
    const existing = document.getElementById("secu-boot");

    if (existing) existing.remove();

    root = document.createElement("div");
    root.id = "secu-boot";

    root.innerHTML = `
        <div class="secu-boot-background"></div>
        <div class="secu-boot-grid"></div>
        <div class="secu-boot-content"></div>
    `;

    document.body.appendChild(root);

    desktop = document.querySelector("#desktop");

    if (desktop) {
        desktop.style.display = "none";
    }
}

function ensureMounted() {
    if (!root || !root.isConnected) {
        mount();
    }

    root.style.display = "flex";
}

function render(html) {
    ensureMounted();

    const content = root.querySelector(
        ".secu-boot-content"
    );

    if (content) {
        content.innerHTML = html;
    }
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
            <span> • </span>
            SYSTEM ENVIRONMENT
        </div>
    `;
}

function progressView(title, subtitle, initialLabel) {
    render(`
        ${logo()}

        <h1 class="secu-boot-title">
            ${title}
        </h1>

        <p class="secu-boot-description">
            ${subtitle}
        </p>

        <div class="secu-boot-progress">
            <div
                class="secu-boot-progress-fill"
                id="boot-progress-fill"
            ></div>
        </div>

        <div class="secu-boot-status">
            <span id="boot-progress-label">
                ${initialLabel}
            </span>

            <span id="boot-progress-number">
                0%
            </span>
        </div>

        ${footer()}
    `);
}

async function runProgress(duration, label) {
    await BootEffects.progress(value => {
        const fill = document.getElementById(
            "boot-progress-fill"
        );

        const number = document.getElementById(
            "boot-progress-number"
        );

        const status = document.getElementById(
            "boot-progress-label"
        );

        if (fill) fill.style.width = `${value}%`;
        if (number) number.textContent = `${value}%`;
        if (status) status.textContent = label;
    }, duration);
}

async function runFirmware() {
    kernel.transition("firmware");

    log("Firmware initialization started.");

    progressView(
        "SecuOS",
        "Initializing the system environment.",
        "Starting firmware"
    );

    await runProgress(
        CONFIG.timings.firmware,
        "Firmware initialized"
    );

    log("Firmware initialization completed.");
}

async function runTypeScript() {
    log("Loading TypeScript boot kernel.");

    const response = await fetch(
        "/assets/lang/ts/boot-kernel.ts"
    );

    if (!response.ok) {
        throw new Error(
            "Unable to load TypeScript boot kernel."
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

    const result = window.ts.transpileModule(
        source,
        {
            compilerOptions: {
                target: window.ts.ScriptTarget.ES2020,
                module: window.ts.ModuleKind.ES2020
            }
        }
    );

    const blob = new Blob(
        [result.outputText],
        { type: "text/javascript" }
    );

    const moduleURL = URL.createObjectURL(blob);

    try {
        const module = await import(moduleURL);

        kernel = new module.BootKernel(CONFIG);

        log("TypeScript boot kernel online.");
    } finally {
        URL.revokeObjectURL(moduleURL);
    }
}

async function runPython() {
    log("Starting Python diagnostics runtime.");

    progressView(
        "System diagnostics",
        "Starting the diagnostic environment.",
        "Loading Python runtime"
    );

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

    const pyodide = await window.loadPyodide();

    const response = await fetch(
        "/assets/lang/py/diagnostics.py"
    );

    if (!response.ok) {
        throw new Error(
            "Python diagnostics file not found."
        );
    }

    const source = await response.text();

    const raw = await pyodide.runPythonAsync(source);

    const report = JSON.parse(raw);

    for (const result of report.results) {
        kernel.addDiagnostic(result);

        log(
            `${result.name}: ${
                result.passed ? "PASSED" : "WARNING"
            }`
        );
    }

    window.SecuOSDiagnostics = report;

    log("Python diagnostics completed.");

    return report;
}

async function runEnvironment() {
    kernel.transition("environment");

    log("Preparing desktop environment.");

    progressView(
        "Preparing your system",
        "Restoring settings and preparing your workspace.",
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
    kernel.transition("profile-discovery");

    profile = getProfile();

    log(
        profile
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
            id="secu-diagnostics"
        >
            View system diagnostics
        </button>

        ${footer()}
    `);

    document.getElementById("secu-enter").onclick = () => {
        if (!profile) {
            renderSetup();
        } else if (profile.passwordHash) {
            renderLogin();
        } else {
            renderWelcome();
        }
    };

    document.getElementById(
        "secu-diagnostics"
    ).onclick = renderDiagnostics;
}

function renderDiagnostics() {
    const report = window.SecuOSDiagnostics;
    const results = report?.results || [];

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
            id="secu-report-back"
        >
            Back
        </button>

        ${footer()}
    `);

    document.getElementById(
        "secu-report-back"
    ).onclick = renderEnter;
}

function renderSetup() {
    kernel.transition("setup");

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
            id="setup-name"
            placeholder="Display name"
            maxlength="40"
            autocomplete="name"
        >

        <input
            class="secu-boot-field"
            id="setup-username"
            placeholder="Username"
            maxlength="24"
            autocomplete="username"
        >

        <input
            class="secu-boot-field"
            id="setup-password"
            type="password"
            placeholder="Password (optional)"
            autocomplete="new-password"
        >

        <p class="secu-boot-error" id="setup-error"></p>

        <button
            class="secu-boot-button"
            id="setup-create"
        >
            Create profile
        </button>

        ${footer()}
    `);

    document.getElementById(
        "setup-create"
    ).onclick = async () => {
        const displayName = document.getElementById(
            "setup-name"
        ).value.trim();

        const username = document.getElementById(
            "setup-username"
        ).value.trim();

        const password = document.getElementById(
            "setup-password"
        ).value;

        const error = document.getElementById(
            "setup-error"
        );

        try {
            profile = await createProfile({
                displayName,
                username,
                password
            });

            log("New profile created.");

            renderWelcome();
        } catch (exception) {
            error.textContent = exception.message;
        }
    };
}

function renderLogin() {
    kernel.transition("login");

    render(`
        <div class="secu-boot-avatar">
            ${escapeHTML(
                profile.avatar || getInitials(profile.displayName)
            )}
        </div>

        <h1 class="secu-boot-title">
            Welcome back
        </h1>

        <p class="secu-boot-description">
            ${escapeHTML(profile.displayName)}
            <br>
            @${escapeHTML(profile.username)}
        </p>

        <input
            class="secu-boot-field"
            id="login-password"
            type="password"
            placeholder="Enter your password"
            autocomplete="current-password"
        >

        <p class="secu-boot-error" id="login-error"></p>

        <button
            class="secu-boot-button"
            id="login-submit"
        >
            Sign in
        </button>

        ${footer()}
    `);

    const submit = async () => {
        const password = document.getElementById(
            "login-password"
        ).value;

        const error = document.getElementById(
            "login-error"
        );

        try {
            if (await verifyPassword(password)) {
                renderWelcome();
            } else {
                error.textContent = "Incorrect password.";
            }
        } catch {
            error.textContent = "Unable to verify password.";
        }
    };

    document.getElementById(
        "login-submit"
    ).onclick = submit;

    document.getElementById(
        "login-password"
    ).addEventListener("keydown", event => {
        if (event.key === "Enter") submit();
    });
}

async function renderWelcome() {
    kernel.transition("welcome");

    startSession();

    render(`
        ${logo()}

        <div class="secu-boot-spinner"></div>

        <h1 class="secu-boot-title">
            Good to have you here.
        </h1>

        <p class="secu-boot-description">
            Preparing your desktop,
            ${escapeHTML(profile.displayName)}.
        </p>

        <div class="secu-boot-progress">
            <div
                class="secu-boot-progress-fill"
                id="welcome-progress"
            ></div>
        </div>

        ${footer()}
    `);

    await BootEffects.progress(value => {
        const fill = document.getElementById(
            "welcome-progress"
        );

        if (fill) {
            fill.style.width = `${value}%`;
        }
    }, CONFIG.timings.welcome);

    enterDesktop();
}

function enterDesktop() {
    kernel.complete();

    log("Desktop environment ready.");

    root.remove();

    if (desktop) {
        desktop.style.display = "";
    }

    window.dispatchEvent(
        new CustomEvent("secuos:ready", {
            detail: {
                profile,
                report: kernel.getReport()
            }
        })
    );
}

function renderPowerScreen(mode) {
    ensureMounted();

    kernel.transition("shutdown");

    endSession();

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
                ? "Your system is restarting."
                : "Your session is ending."}
        </p>
    `);

    setTimeout(() => {
        if (mode === "restart") {
            location.reload();
        } else {
            render(`
                ${logo()}

                <h1 class="secu-boot-title">
                    SecuOS is off
                </h1>

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
        }
    }, 1100);
}

function lock() {
    if (!profile) return;

    if (desktop) {
        desktop.style.display = "none";
    }

    ensureMounted();
    renderLogin();
}

async function start() {
    try {
        mount();

        await runTypeScript();

        await runFirmware();

        await runPython();

        if (!kernel.canContinue()) {
            throw new Error(
                "A critical system diagnostic failed."
            );
        }

        await runEnvironment();

        renderEnter();

    } catch (error) {
        console.error(error);

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
        `);

        document.getElementById(
            "secu-retry"
        ).onclick = () => location.reload();
    }
}

window.SecuOSBoot = {
    start,
    lock,

    restart() {
        renderPowerScreen("restart");
    },

    shutdown() {
        renderPowerScreen("shutdown");
    },

    get profile() {
        return profile;
    },

    get kernel() {
        return kernel;
    },

    get stage() {
        return kernel?.stage || "initializing";
    }
};

start();
