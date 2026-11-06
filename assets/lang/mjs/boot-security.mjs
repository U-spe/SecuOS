const PROFILE_KEY = "secuos.profile";
const SESSION_KEY = "secuos.session";

const encoder = new TextEncoder();

function randomSalt() {
    const bytes = crypto.getRandomValues(
        new Uint8Array(16)
    );

    return Array.from(bytes)
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
}

async function derivePassword(password, salt) {
    if (!crypto.subtle) {
        throw new Error(
            "Secure password hashing requires HTTPS or localhost."
        );
    }

    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        "PBKDF2",
        false,
        ["deriveBits"]
    );

    const bits = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt: encoder.encode(salt),
            iterations: 310000,
            hash: "SHA-256"
        },
        key,
        256
    );

    return Array.from(new Uint8Array(bits))
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
}

export function getProfile() {
    try {
        return JSON.parse(
            localStorage.getItem(PROFILE_KEY)
        );
    } catch {
        return null;
    }
}

export async function createProfile({
    displayName,
    username,
    password = ""
}) {
    if (!displayName || !username) {
        throw new Error("A name and username are required.");
    }

    if (!/^[a-zA-Z0-9._-]{3,24}$/.test(username)) {
        throw new Error("Invalid username.");
    }

    if (password && password.length < 8) {
        throw new Error(
            "Password must contain at least 8 characters."
        );
    }

    let passwordSalt = null;
    let passwordHash = null;

    if (password) {
        passwordSalt = randomSalt();

        passwordHash = await derivePassword(
            password,
            passwordSalt
        );
    }

    const profile = {
        displayName,
        username,
        passwordSalt,
        passwordHash,
        avatar: displayName
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map(part => part[0])
            .join("")
            .toUpperCase(),
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

    const hash = await derivePassword(
        password,
        profile.passwordSalt
    );

    return hash === profile.passwordHash;
}

export function startSession() {
    sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
            startedAt: Date.now(),
            sessionId: crypto.randomUUID()
        })
    );
}

export function endSession() {
    sessionStorage.removeItem(SESSION_KEY);
}

export function hasActiveSession() {
    return Boolean(
        sessionStorage.getItem(SESSION_KEY)
    );
}

export function deleteProfile() {
    localStorage.removeItem(PROFILE_KEY);
    endSession();
}
