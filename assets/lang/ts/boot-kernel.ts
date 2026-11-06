export type BootStage =
    | "initializing"
    | "firmware"
    | "diagnostics"
    | "environment"
    | "profile-discovery"
    | "enter"
    | "setup"
    | "login"
    | "welcome"
    | "desktop"
    | "locked"
    | "shutdown"
    | "error";

export interface BootConfig {
    name: string;
    version: string;
    profileKey: string;
    settingsKey: string;
    timings: {
        firmware: number;
        diagnostics: number;
        environment: number;
        welcome: number;
    };
}

export interface Diagnostic {
    name: string;
    passed: boolean;
    detail: string;
    critical: boolean;
}

export interface BootReport {
    startedAt: number;
    completedAt: number | null;
    duration: number | null;
    diagnostics: Diagnostic[];
    warnings: string[];
    errors: string[];
}

export interface BootProfile {
    displayName: string;
    username: string;
    passwordHash: string | null;
    passwordSalt: string | null;
    avatar: string;
    createdAt: string;
}

export class BootKernel {
    public stage: BootStage = "initializing";

    public readonly config: BootConfig;

    public readonly report: BootReport = {
        startedAt: Date.now(),
        completedAt: null,
        duration: null,
        diagnostics: [],
        warnings: [],
        errors: []
    };

    private listeners: Array<
        (stage: BootStage) => void
    > = [];

    constructor(config: BootConfig) {
        this.config = config;
    }

    public transition(next: BootStage): void {
        this.stage = next;

        for (const listener of this.listeners) {
            listener(next);
        }
    }

    public subscribe(
        listener: (stage: BootStage) => void
    ): () => void {
        this.listeners.push(listener);

        return () => {
            this.listeners = this.listeners.filter(
                item => item !== listener
            );
        };
    }

    public addDiagnostic(item: Diagnostic): void {
        this.report.diagnostics.push(item);

        if (!item.passed) {
            if (item.critical) {
                this.report.errors.push(item.detail);
            } else {
                this.report.warnings.push(item.detail);
            }
        }
    }

    public canContinue(): boolean {
        return !this.report.diagnostics.some(
            item => item.critical && !item.passed
        );
    }

    public determineNextStage(
        profile: BootProfile | null
    ): BootStage {
        if (!profile) return "setup";

        if (profile.passwordHash) return "login";

        return "welcome";
    }

    public complete(): BootReport {
        this.transition("desktop");

        this.report.completedAt = Date.now();

        this.report.duration =
            this.report.completedAt - this.report.startedAt;

        return this.getReport();
    }

    public fail(message: string): void {
        this.report.errors.push(message);
        this.transition("error");
    }

    public getReport(): BootReport {
        return JSON.parse(
            JSON.stringify(this.report)
        ) as BootReport;
    }
}
