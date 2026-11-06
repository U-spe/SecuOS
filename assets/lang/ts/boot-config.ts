type BootStage = "enter" | "login" | "setup" | "ready";

interface SecuBootConfiguration {
    name: string;
    version: string;
    storageKey: string;
    sessionKey: string;
    requirePassword: boolean;
    desktopSelector: string;
}

interface SecuBootProfile {
    displayName: string;
    username: string;
    passwordHash: string | null;
    createdAt: string;
}

interface SecuBootRuntime {
    stage: BootStage;
    profile: SecuBootProfile | null;
}

interface Window {
    SecuBootConfig: SecuBootConfiguration;
}

window.SecuBootConfig = {
    name: "SecuOS",
    version: "1.0.0",
    storageKey: "secuos.profile",
    sessionKey: "secuos.session",
    requirePassword: false,
    desktopSelector: "#desktop"
};
