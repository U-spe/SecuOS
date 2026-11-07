import { BootEffects } from "./boot-effects.mjs";

import {
    getProfile,
    createProfile,
    verifyPassword,
    startSession,
    endSession
} from "./boot-security.mjs";

const CONFIG = {
    name: "SecuOS",
    version: "1.1.0",
    profileKey: "secuos.profile",
    settingsKey: "secuos.settings",
    timings: {
        welcome: 700
    }
};

const STORAGE = {
    skipBoot: "secuos-skip-boot",
    startupLogin: "secuos-startup-login",
    os: "secuos-os"
};

const VALID_OS = ["windows", "macos", "chrome"];

const state = {
    kernel: null,
    profile: null,
    root: null,
    desktop: null,
    logs: [],
    started: false,
    shuttingDown: false
};

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

function isEnabled(key, fallback = true) {
    const value = storageGet(key);
    return value === null ? fallback : value === "true";
}

function getOS() {
    const saved = storageGet(STORAGE.os);
    const current = document.documentElement.dataset.os;

    if (VALID_OS.includes(saved)) return saved;
    if (VALID_OS.includes(current)) return current;

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

function ensureOverlay() {
    if (state.root?.isConnected) {
        state.root.style.display = "flex";
        state.root.dataset.os = getOS();
        return;
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
}

function showOverlay() {
    ensureOverlay();
    state.root.style.display = "flex";
    state.root.dataset.os = getOS();
}

function hideOverlay() {
    state.root?.remove();
    state.root = null;
}

function render(content) {
    const container = state.root?.querySelector(
        ".secu-boot-content"
    );

    if (container) container.innerHTML = content;
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
        </div>
    `;
}

/* ================================================
   TYPESCRIPT BOOT KERNEL
================================================ */

async function loadKernel() {
    const response = await fetch(
        "/assets/lang/ts/boot-kernel.ts"
    );

    if (!response.ok) {
        throw new Error("Could not load boot-kernel.ts.");
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

    const compiled = window.ts.transpileModule(source, {
        compilerOptions: {
            target: window.ts.ScriptTarget.ES2020,
            module: window.ts.ModuleKind.ES2020
        }
    });

    const blob = new Blob(
        [compiled.outputText],
        { type: "text/javascript" }
    );

    const url = URL.createObjectURL(blob);

    try {
        const module = await import(url);

        state.kernel = new module.BootKernel(CONFIG);

        state.kernel.subscribe(stage => {
            log(`Boot stage changed: ${stage}`);
        });
    } finally {
        URL.revokeObjectURL(url);
    }
}

/* ================================================
   INTRO VIDEO
================================================ */

function playIntroVideo() {
    return new Promise(resolve => {
        showOverlay();

        state.root.classList.add("secu-boot-intro");

        const container = state.root.querySelector(
            ".secu-boot-content"
        );

        container.innerHTML = `
            <video
                class="secu-boot-video"
                src="/assets/graphics/v/intro.mp4"
                autoplay
                muted
                playsinline
                preload="auto"
            ></video>

            <div class="secu-boot-skip-hint">
                Double-press Enter to skip
            </div>
        `;

        const video = container.querySelector("video");

        let finished = false;
        let lastEnter = 0;

        const finish = () => {
            if (finished) return;

            finished = true;

            clearTimeout(fallback);

            document.removeEventListener(
                "keydown",
                onKeyDown,
                true
            );

            state.root?.classList.remove("secu-boot-intro");

            resolve();
        };

        const onKeyDown = event => {
            if (event.key !== "Enter") return;

            event.preventDefault();
            event.stopPropagation();

            const now = Date.now();

            if (now - lastEnter <= 700) {
                finish();
            } else {
                lastEnter = now;
            }
        };

        const fallback = setTimeout(finish, 7600);

        video.addEventListener("ended", finish, {
            once: true
        });

        video.addEventListener("error", finish, {
            once: true
        });

        document.addEventListener(
            "keydown",
            onKeyDown,
            true
        );

        video.play().catch(finish);
    });
}

/* ================================================
   DESKTOP ENVIRONMENT
================================================ */

async function loadEnvironment() {
    let settings = {};

    try {
        settings = JSON.parse(
            localStorage.getItem(CONFIG.settingsKey) || "{}"
        );
    } catch {
        settings = {};
    }

    window.SecuOSSettings = settings;

    log("Desktop environment prepared.");
}

/* ================================================
   PROFILE SETUP
================================================ */

function renderSetup() {
    state.kernel.transition("setup");
    state.root.dataset.os = getOS();

    render(`
        ${logo()}

        <h1 class="secu-boot-title">
            Create your profile
        </h1>

        <p class="secu-boot-description">
            Set up your SecuOS account.
        </p>

        <input
            class="secu-boot-field"
            id="secu-display-name"
            placeholder="Display name"
            maxlength="40"
        >

        <input
            class="secu-boot-field"
            id="secu-username"
            placeholder="Username"
            maxlength="24"
        >

        <input
            class="secu-boot-field"
            id="secu-password"
            type="password"
            placeholder="Password (optional)"
        >

        <p class="secu-boot-error" id="secu-setup-error"></p>

        <button class="secu-boot-button" id="secu-create-profile">
            Create profile
        </button>

        ${footer()}
    `);

    const submit = async () => {
        const button = document.getElementById(
            "secu-create-profile"
        );

        const error = document.getElementById(
            "secu-setup-error"
        );

        button.disabled = true;
        error.textContent = "";

        try {
            state.profile = await createProfile({
                displayName: document.getElementById(
                    "secu-display-name"
                ).value,
                username: document.getElementById(
                    "secu-username"
                ).value,
                password: document.getElementById(
                    "secu-password"
                ).value
            });

            renderWelcome();
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
        if (event.key === "Enter") submit();
    });
}

/* ================================================
   OS-SPECIFIC LOGIN
================================================ */

function renderLogin() {
    state.kernel.transition("login");

    state.root.dataset.os = getOS();

    state.profile = getProfile();

    if (!state.profile) {
        renderSetup();
        return;
    }

    if (!state.profile.passwordHash) {
        renderWelcome();
        return;
    }

    const os = getOS();

    const avatar = state.profile.avatarDataUrl
        ? `<img class="secu-login-avatar-image"
                src="${state.profile.avatarDataUrl}" alt="">`
        : `<div class="secu-login-avatar-fallback">
                ${escapeHTML(state.profile.avatar)}
           </div>`;

    const title = os === "macos"
        ? "Enter your password"
        : os === "chrome"
            ? "Sign in to SecuOS"
            : "Welcome back";

    render(`
        <section class="secu-login-screen secu-login-${os}">

            <div class="secu-login-brand">
                <span class="secu-login-brand-mark">S</span>
                <span>SecuOS</span>
            </div>

            <div class="secu-login-card">

                ${avatar}

                <h1 class="secu-login-title">
                    ${title}
                </h1>

                <p class="secu-login-name">
                    ${escapeHTML(state.profile.displayName)}
                </p>

                <label class="secu-login-label"
                    for="secu-login-username">
                    Username
                </label>

                <input
                    class="secu-boot-field secu-login-input"
                    id="secu-login-username"
                    value="${escapeHTML(state.profile.username)}"
                    autocomplete="username"
                >

                <label class="secu-login-label"
                    for="secu-login-password">
                    Password
                </label>

                <input
                    class="secu-boot-field secu-login-input"
                    id="secu-login-password"
                    type="password"
                    placeholder="Enter your password"
                    autocomplete="current-password"
                >

                <p class="secu-boot-error"
                    id="secu-login-error"></p>

                <button
                    class="secu-boot-button secu-login-submit"
                    id="secu-login-submit">
                    ${os === "macos"
                        ? "Unlock"
                        : os === "chrome"
                            ? "Sign in"
                            : "Sign in"}
                </button>

            </div>

            <div class="secu-login-footer">
                ${os === "macos"
                    ? "Touch ID is unavailable in this browser"
                    : os === "chrome"
                        ? "SecuOS local account"
                        : "SecuOS · Local account"}
            </div>
        </section>
    `);

    const username = document.getElementById(
        "secu-login-username"
    );

    const password = document.getElementById(
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

        if (
            username.value.trim().toLowerCase() !==
            String(state.profile.username).toLowerCase()
        ) {
            error.textContent = "Incorrect username.";
            username.focus();
            button.disabled = false;
            return;
        }

        try {
            const valid = await verifyPassword(password.value);

            if (!valid) {
                error.textContent = "Incorrect password.";
                password.value = "";
                password.focus();
                button.disabled = false;
                return;
            }

            renderWelcome();
        } catch (exception) {
            error.textContent = exception.message;
            button.disabled = false;
        }
    };

    button.addEventListener("click", submit);

    password.addEventListener("keydown", event => {
        if (event.key === "Enter") submit();
    });

    password.focus();
}

/* ================================================
   WELCOME / ENTRY SCREEN
================================================ */

function renderWelcome() {
    state.kernel.transition("welcome");

    state.profile = getProfile() || state.profile;

    if (!state.profile) {
        renderSetup();
        return;
    }

    startSession();

    const os = getOS();

    render(`
        <section class="secu-entry-screen secu-entry-${os}">

            <div class="secu-entry-mark">S</div>

            <p class="secu-entry-eyebrow">
                SECUOS
            </p>

            <h1 class="secu-entry-title">
                Welcome, ${escapeHTML(state.profile.displayName)}
            </h1>

            <p class="secu-entry-description">
                Your desktop is ready.
            </p>

            <button
                class="secu-entry-button"
                id="secu-enter-desktop">
                Enter desktop <span>↵</span>
            </button>

            <p class="secu-entry-hint">
                Press Enter to continue
            </p>

        </section>
    `);

    const enter = () => {
        document.removeEventListener(
            "keydown",
            onEnter,
            true
        );

        enterDesktop();
    };

    const onEnter = event => {
        if (event.key !== "Enter") return;

        event.preventDefault();
        enter();
    };

    document.getElementById(
        "secu-enter-desktop"
    ).addEventListener("click", enter);

    document.addEventListener(
        "keydown",
        onEnter,
        true
    );
}

/* ================================================
   DESKTOP ENTRY
================================================ */

function enterDesktop() {
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

/* ================================================
   LOCK / POWER
================================================ */

function lock() {
    if (!state.profile) return;

    endSession();

    state.desktop.style.display = "none";

    showOverlay();
    renderLogin();
}

function powerScreen(mode) {
    if (state.shuttingDown) return;

    state.shuttingDown = true;

    endSession();

    state.desktop.style.display = "none";

    showOverlay();

    state.kernel.transition("shutdown");

    render(`
        ${logo()}

        <div class="secu-boot-spinner"></div>

        <h1 class="secu-boot-title">
            ${mode === "restart"
                ? "Restarting SecuOS"
                : "Shutting down"}
        </h1>

        ${footer()}
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

            <button
                class="secu-boot-button"
                id="secu-power-on">
                Power on
            </button>
        `);

        state.shuttingDown = false;

        document.getElementById(
            "secu-power-on"
        )?.addEventListener("click", () => location.reload());
    }, 1000);
}

/* ================================================
   STARTUP
================================================ */

async function start() {
    if (state.started) return;

    state.started = true;

    state.desktop = document.querySelector("#desktop");

    if (!state.desktop) {
        throw new Error("Missing #desktop.");
    }

    const savedOS = storageGet(STORAGE.os);

    if (VALID_OS.includes(savedOS)) {
        document.documentElement.dataset.os = savedOS;
    }

    state.desktop.style.display = "none";

    showOverlay();

    try {
        await loadKernel();

        if (!isEnabled(STORAGE.skipBoot, false)) {
            log("Playing SecuOS intro video.");
            await playIntroVideo();
        } else {
            log("Intro video skipped.");
        }

        await loadEnvironment();

        state.profile = getProfile();

        if (!state.profile) {
            renderSetup();
            return;
        }

        if (
            state.profile.passwordHash &&
            isEnabled(STORAGE.startupLogin, true)
        ) {
            renderLogin();
        } else {
            renderWelcome();
        }
    } catch (error) {
        console.error("[SecuOS Boot]", error);

        showOverlay();

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
                onclick="location.reload()">
                Retry startup
            </button>
        `);
    }
}

/* ================================================
   PUBLIC API
================================================ */

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

    get logs() {
        return [...state.logs];
    },

    get report() {
        return state.kernel?.getReport() || null;
    }
};

start();
