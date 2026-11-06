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
    console.info(`[SecuOS Boot] $DIL2`);
