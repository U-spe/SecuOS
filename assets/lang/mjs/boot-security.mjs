const PROFILE_KEY = "secuos.profile";
const SESSION_KEY = "secuos.session";

const encoder = new TextEncoder();

function createSalt() {
    const bytes = crypto.getRandomValues(
        new Uint8Array(16)
    );

    return Array.from(bytes)
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
}

async function hashPassword(password, salt) {
    if (!crypto.subtle) {
        throw new Error(
            "Password protection requires HTTPS or localhost."
        );
    }

    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        "PBKDF2",
        false,
        ["deriveBits"]
    );

    const result = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt: encoder.encode(salt),
            iterations: 310000,
            hash: "SHA-256"
        },
        key,
        256
    );

    return Array.from(new Uint8Array(result))
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
}

export function getProfile() {
    try {
        const profile = localStorage.getItem(PROFILE_KEY);
        return profile ? JSON.parse(profile) : null;
    } catch {
        return null;
    }
}

export async function createProfile({
    displayName,
    username,
    password = ""
}) {
    displayName = String(displayName || "").trim();
    username = String(username || "").trim();

    if (!displayName || !username) {
        throw new Error(
            "Display name and username are required."
        );
    }

    if (!/^[a-zA-Z0-9._-]{3,24}$/.test(username)) {
        throw new Error(
            "Username must be 3–24 characters."
        );
    }

    if (password && password.length < 8) {
        throw new Error(
            "Password must be at least 8 characters."
        );
    }

    let passwordSalt = null;
    let passwordHash = null;

    if (password) {
        passwordSalt = createSalt();

        passwordHash = await hashPassword(
            password,
            passwordSalt
        );
    }

    const avatar = displayName
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part[0])
        .join("")
        .toUpperCase();

    const profile = {
        displayName,
        username,
        passwordSalt,
        passwordHash,
        avatar,
        createdAt: new Date().toISOString()
    };

    localStorage.setItem(
        PROFILE_KEY,
        JSON.stringify(profile)
    );

    return profile;
}

export async function verifyPassword(password) {
    const profile = getProfile();

    if (!profile || !profile.passwordHash) {
        return false;
    }

    const hash = await hashPassword(
        password,
        profile.passwordSalt
    );

    return hash === profile.passwordHash;
}

export function startSession() {
    const session = {
        startedAt: Date.now(),
        sessionId: crypto.randomUUID()
    };

    sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify(session)
    );

    return session;
}

export function getSession() {
    try {
        return JSON.parse(
            sessionStorage.getItem(SESSION_KEY)
        );
    } catch {
        return null;
    }
}

export function hasActiveSession() {
    return Boolean(getSession());
}

export function endSession() {
    sessionStorage.removeItem(SESSION_KEY);
}

export function deleteProfile() {
    localStorage.removeItem(PROFILE_KEY);
    endSession();
}
